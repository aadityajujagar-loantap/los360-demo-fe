"use client";

import { usePathname } from 'next/navigation';

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import bcrypt from "bcryptjs";
import toast from "react-hot-toast";
import { useAppSelector, useAppDispatch } from "../../_lib/redux/hooks";
import { 
  updateFormData as updateFormDataAction, 
  nextStep as nextStepAction, 
  markStepComplete as markStepCompleteAction,
  setOtpSent as setOtpSentAction,
  restoreJourneyState as restoreJourneyStateAction,
  syncWithApplicationData as syncWithApplicationDataAction,
  restoreFromApiData as restoreFromApiDataAction
} from "../../_lib/redux/slices/journeySlice";
import { 
  useGetCaptchaQuery, 
  useProcessJourneyStepMutation,
  useLazyGetLoanApplicationQuery,
  useGetPublicStatesQuery,
  useGetPublicDistrictsQuery,
  useGetPublicBranchesQuery
} from "../../_lib/redux/services/adminApiSlice";
import StepCard from "./StepCard";
import {
  FormInput,
  FormSelect,
  ToggleSwitch,
  PrimaryButton,
} from "./FormPrimitives";
import {
  getJourneyOfferReachedKey,
  getJourneySessionKey,
  getJourneyStorageKey,
  getLoanTypeFromJourney,
} from "../../_lib/loanType";
import {
  getEmailValidationError,
  getIndianMobileValidationError,
  sanitizeMobileNumber,
} from "../../_lib/validation/mobile";
import { mapBackendFieldErrors } from "../../_lib/apiErrors";
import { scrollToFirstFieldError } from "../../_hooks/useScrollToFieldError";
import {
  JourneyIdentity,
  createJourneyIdentity,
  getJourneyIdentityMismatch,
  normalizeJourneyEmail,
  normalizeJourneyMobile,
} from "../../_lib/journeyIdentity";
import { clearJourneyDraft } from "../../_lib/journeyDraft";
import { useIdleTimeout } from "../../_hooks/useIdleTimeout";

const LockIcon = () => (
  <svg
    className="w-4.5 h-4.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

const IDENTITY_MISMATCH_ERROR =
  "Mobile number and email must both match the same application. Please enter both details used for the existing journey.";

/** Masks a 10-digit mobile: shows first 2 and last 3 digits, e.g. 98XXXXX210 */
const maskMobile = (mobile: string): string => {
  const m = mobile.replace(/\D/g, "");
  if (m.length !== 10) return mobile;
  return `${m.slice(0, 2)}XXXXX${m.slice(7)}`;
};

const OTP_VALIDITY_SECONDS = 300; // 5 minutes
const OTP_RESEND_COOLDOWN_SECONDS = 30;
const OTP_MAX_RESEND_ATTEMPTS = 3;
const OTP_MAX_VERIFY_ATTEMPTS = 5;
const OTP_EXPIRED_MESSAGE = "OTP has expired. Please request a new one.";
const OTP_LOCKED_MESSAGE = "Too many invalid OTP attempts. Please request a new OTP.";
const OTP_ERROR_TOAST_ID = "journey-otp-error";

type AuthPhase = "input" | "otp" | "branch";
type FormDataPatch = Record<string, unknown>;
type ApiErrorLike = {
  data?: {
    status?: string;
    message?: string;
    data?: {
      status_code?: number;
      message?: string;
    };
  };
  message?: string;
};
type ApplicationIdSource = {
  application_id?: string;
  application?: {
    application_id?: string;
  };
};
type PublicState = {
  state_name?: string;
};
type PublicDistrict = {
  region_name?: string;
  district_name?: string;
};
type PublicBranch = {
  branch_name?: string;
};

const asApiError = (error: unknown): ApiErrorLike =>
  error && typeof error === "object" ? (error as ApiErrorLike) : {};

const getApiErrorMessage = (error: unknown, fallback = "") => {
  const apiError = asApiError(error);
  return (
    apiError.data?.message ||
    apiError.data?.data?.message ||
    apiError.message ||
    fallback
  );
};

const getApplicationIdFromPayload = (data: unknown) => {
  const payload = data as ApplicationIdSource | undefined;
  return payload?.application_id || payload?.application?.application_id;
};

const sanitizeCaptchaInput = (value: unknown) =>
  String(value ?? "").replace(/\s/g, "");

const normalizeCaptchaHash = (hash: unknown) =>
  String(hash ?? "").replace(/^\$2y\$/, "$2a$");

const clearOtpError = (currentErrors: Record<string, string>) => {
  if (!currentErrors.otp) return currentErrors;
  const nextErrors = { ...currentErrors };
  delete nextErrors.otp;
  return nextErrors;
};

export default function AuthStep() {
  const pathname = usePathname() || "";
  const dispatch = useAppDispatch();
  const [phaseOverride, setPhaseOverride] = useState<AuthPhase | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(OTP_VALIDITY_SECONDS);
  const [otpExpired, setOtpExpired] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [otpAttemptCount, setOtpAttemptCount] = useState(0);
  const [otpLocked, setOtpLocked] = useState(false);
  const [captchaRequestId, setCaptchaRequestId] = useState(0);
  const requestInFlightRef = useRef(false);
  const otpInputRef = useRef<HTMLInputElement | null>(null);
  const setPhase = useCallback((nextPhase: AuthPhase) => {
    setPhaseOverride(nextPhase);
    if (nextPhase === "otp") {
      setOtpTimer(OTP_VALIDITY_SECONDS);
      setOtpExpired(false);
      setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      setTimeout(() => otpInputRef.current?.focus(), 100);
    }
  }, []);
  const beginRequest = useCallback(() => {
    if (requestInFlightRef.current) return false;
    requestInFlightRef.current = true;
    setIsLoading(true);
    return true;
  }, []);
  const finishRequest = useCallback(() => {
    requestInFlightRef.current = false;
    setIsLoading(false);
  }, []);

  const {
    config,
    currentStepIndex,
    formData,
    currentSubStepKey,
    completedStepIndices,
    isOtpSent,
  } = useAppSelector((state) => state.journey);

  const {
    data: captchaData, 
    isFetching: isFetchingCaptcha 
  } = useGetCaptchaQuery(captchaRequestId, {
    refetchOnMountOrArgChange: false,
    skip:
      !config?.steps[currentStepIndex]?.needsCaptcha ||
      isOtpSent ||
      Boolean(formData.otp_reference_id) ||
      Boolean(formData.otp_verified) ||
      currentSubStepKey === "OTP_VERIFICATION" ||
      currentSubStepKey === "BRANCH_SELECTION",
  });
  const [processJourneyStep] = useProcessJourneyStepMutation();
  const [triggerGetLoanApplication] = useLazyGetLoanApplicationQuery();
  const { data: statesData } = useGetPublicStatesQuery();
  const { data: districtsData } = useGetPublicDistrictsQuery(formData.state || "", { skip: !formData.state });
  const { data: branchesData } = useGetPublicBranchesQuery(formData.district || "", { skip: !formData.district });

  const updateFormData = (data: FormDataPatch) => dispatch(updateFormDataAction(data));
  const nextStep = () => dispatch(nextStepAction());
  const markStepComplete = (index: number) => dispatch(markStepCompleteAction(index));
  const setOtpSent = (v: boolean) => dispatch(setOtpSentAction(v));
  const setCurrentSubStepKey = (key: string | null) =>
    dispatch(restoreJourneyStateAction({ currentSubStepKey: key }));
  const syncWithApplicationData = (data: string) => dispatch(syncWithApplicationDataAction(data));
  const loanType = getLoanTypeFromJourney({
    journeyType: config?.journeyType,
    configType: config?.type,
    pathname,
  });
  const storageKey = getJourneyStorageKey(loanType);
  const sessionKey = getJourneySessionKey(loanType);
  const offerReachedKey = getJourneyOfferReachedKey(loanType);
  const hasOfferReachedFlagForApplication = (applicationId?: string | null) => {
    if (typeof window === "undefined") return false;

    const appId = applicationId || localStorage.getItem(storageKey) || formData.application_id;
    if (!appId) return false;

    const raw = localStorage.getItem(offerReachedKey);
    if (!raw) return false;

    try {
      const parsed = JSON.parse(raw);
      return parsed?.applicationId === appId;
    } catch {
      return raw === appId;
    }
  };
  const restoreFromApiData = (data: unknown, expectedIdentity: JourneyIdentity) =>
    dispatch(
      restoreFromApiDataAction({
        data,
        jumpToStep: true,
        expectedIdentity,
        hasReachedEligibilityOffer: hasOfferReachedFlagForApplication(
          getApplicationIdFromPayload(data),
        ),
      }),
    );

  const step = config?.steps[currentStepIndex];
  const isExisting = formData.is_new_user === "no";
  const isNew = formData.is_new_user === "yes";

  useEffect(() => {
    if (captchaData?.respData) {
      dispatch(updateFormDataAction({ captcha_key: captchaData.respData.captcha_key }));
    }
  }, [captchaData, dispatch]);

  const restoredPhase = useMemo<AuthPhase>(() => {
    const hasMatchingStoredIdentity =
      (!formData.last_initiated_mobile ||
        normalizeJourneyMobile(formData.last_initiated_mobile) ===
          normalizeJourneyMobile(formData.mobile)) &&
      (!formData.last_initiated_email ||
        normalizeJourneyEmail(formData.last_initiated_email) ===
          normalizeJourneyEmail(formData.email));
    const hasCurrentJourneyApplication =
      formData.loan_type === loanType &&
      Boolean(formData.application_id) &&
      hasMatchingStoredIdentity;
    const hasPendingOtp =
      hasCurrentJourneyApplication &&
      normalizeJourneyMobile(formData.last_initiated_mobile) === normalizeJourneyMobile(formData.mobile) &&
      normalizeJourneyEmail(formData.last_initiated_email) === normalizeJourneyEmail(formData.email) &&
      formData.last_initiated_loan_type === loanType &&
      (Boolean(formData.otp_reference_id) || isOtpSent);

    if (currentSubStepKey === "LOGIN_INITIATE" || currentSubStepKey === "request_otp") {
      return formData.otp_verified ? "branch" : hasPendingOtp ? "otp" : "input";
    } else if (currentSubStepKey === "OTP_VERIFICATION" || currentSubStepKey === "validate_otp") {
      return formData.otp_verified ? "branch" : "otp";
    } else if (currentSubStepKey === "BRANCH_SELECTION" || currentSubStepKey === "branch_selection") {
      return "branch";
    } else if (formData.branch) {
      return "branch";
    } else if (hasCurrentJourneyApplication) {
      return formData.otp_verified ? "branch" : "otp";
    }
    return "input";
  }, [
    currentSubStepKey,
    formData.application_id,
    formData.branch,
    formData.email,
    formData.last_initiated_email,
    formData.last_initiated_mobile,
    formData.last_initiated_loan_type,
    formData.loan_type,
    formData.mobile,
    formData.otp_verified,
    formData.otp_reference_id,
    isOtpSent,
    loanType,
  ]);
  const phase = phaseOverride ?? restoredPhase;
  const otpValue = String(formData.otp ?? "").trim();
  const isOtpComplete = /^\d{6}$/.test(otpValue);

  const moveToOtpPhase = () => {
    setOtpSent(true);
    setCurrentSubStepKey("OTP_VERIFICATION");
    setResendAttempts(0);
    setOtpAttemptCount(0);
    setOtpLocked(false);
    setPhase("otp");
  };

  const set = (key: string, val: string) => {
    const isIdentityField = key === "mobile" || key === "email";
    const normalizedCurrent =
      key === "mobile"
        ? normalizeJourneyMobile(formData.mobile)
        : key === "email"
          ? normalizeJourneyEmail(formData.email)
          : "";
    const normalizedNext =
      key === "mobile"
        ? normalizeJourneyMobile(val)
        : key === "email"
          ? normalizeJourneyEmail(val)
          : "";
    const identityChanged =
      isIdentityField &&
      normalizedCurrent &&
      normalizedCurrent !== normalizedNext;
    const nextData: FormDataPatch = { [key]: val };

    if (identityChanged) {
      setOtpSent(false);
      localStorage.removeItem(storageKey);
      localStorage.removeItem(offerReachedKey);
      sessionStorage.removeItem(sessionKey);
      clearJourneyDraft(loanType);
      Object.assign(nextData, {
        application_id: "",
        otp_reference_id: "",
        otp_verified: false,
        is_submitted: false,
        has_reached_eligibility_offer: false,
        last_initiated_mobile: "",
        last_initiated_email: "",
        last_initiated_loan_type: "",
      });
    }

    updateFormData(nextData);
    setErrors((p) => {
      const e = { ...p };
      delete e[key];
      return e;
    });
  };

  const generateCaptcha = () => {
    set("captcha", "");
    updateFormData({ captcha_key: "" });
    setCaptchaRequestId((prev) => prev + 1);
  };

  // OTP countdown timer (OTP_010)
  useEffect(() => {
    if (phase !== "otp") return;
    // Auto-focus the OTP input (OTP_017)
    const focusTimer = setTimeout(() => otpInputRef.current?.focus(), 100);
    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setOtpExpired(true);
          setErrors(clearOtpError);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearTimeout(focusTimer);
      clearInterval(interval);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "otp" || resendCooldown <= 0) return;
    const timeout = setTimeout(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [phase, resendCooldown]);

  // TC_022 — Session timeout: warn at 9 min, redirect at 10 min of inactivity
  useIdleTimeout({
    timeoutMs: 9 * 60 * 1000, // 9 minutes → show warning toast
    enabled: phase === "input" || phase === "otp",
    onIdle: () => {
      toast.error(
        "Your session will expire due to inactivity. Please complete the form.",
        { duration: 60000, position: "top-left", id: "idle-warning" }
      );
    },
  });
  useIdleTimeout({
    timeoutMs: 10 * 60 * 1000, // 10 minutes → expire and reload
    enabled: phase === "input" || phase === "otp",
    onIdle: () => {
      toast.dismiss("idle-warning");
      toast.error("Session expired due to inactivity. Please start again.", {
        position: "top-left",
      });
      localStorage.removeItem(storageKey);
      localStorage.removeItem(offerReachedKey);
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem(`${storageKey}_session_active`);
      clearJourneyDraft(loanType);
      updateFormData({
        application_id: "",
        otp_reference_id: "",
        otp_verified: false,
        is_submitted: false,
        has_reached_eligibility_offer: false,
        otp: "",
      });
      setPhaseOverride("input");
      setErrors({});
      setOtpTimer(OTP_VALIDITY_SECONDS);
      setOtpExpired(false);
      setResendCooldown(0);
      setResendAttempts(0);
      setOtpAttemptCount(0);
      setOtpLocked(false);
      setTimeout(() => window.location.replace(pathname || window.location.pathname), 2000);
    },
  });


  /** Resend OTP (OTP_011) — sends a new OTP to the same mobile */
  const handleResendOtp = useCallback(async () => {
    if (resendCooldown > 0) {
      toast.error(`Please wait ${resendCooldown}s before requesting another OTP.`, {
        position: "top-left",
      });
      return;
    }
    if (resendAttempts >= OTP_MAX_RESEND_ATTEMPTS) {
      toast.error("Maximum resend attempts reached. Please change mobile number or restart the journey.", {
        position: "top-left",
      });
      return;
    }
    if (!beginRequest()) return;
    try {
      const stepConfig = config?.steps[currentStepIndex];
      const backendTenantId = config?.backendTenantId || "";
      const requestBody = {
        step_key: stepConfig?.stepKey || "LOGIN_INITIATE",
        loan_type: loanType,
        captcha: sanitizeCaptchaInput(formData.captcha),
        captcha_key: formData.captcha_key,
        payload: {
          is_existing_customer: isExisting,
          account_number: isExisting ? String(formData.customer_id ?? "").trim() : "",
          mobile: normalizeJourneyMobile(formData.mobile),
          email: normalizeJourneyEmail(formData.email),
          loan_type: loanType,
          communication_consent: formData.decl_contact_consent === "yes",
          not_npa_defaulter_flag: formData.decl_no_defaulter === "yes",
          is_special_category: formData.is_category_belong === "yes",
          section_id: "request_otp",
          application_id: formData.application_id,
        },
      };
      const response = await processJourneyStep({ tenantId: backendTenantId, data: requestBody }).unwrap();
      if (response?.data?.otp_reference_id || response?.data?.opt_reference_id) {
        updateFormData({
          otp_reference_id: response.data.otp_reference_id || response.data.opt_reference_id,
          otp: "",
        });
      }
      setErrors({});
      setOtpTimer(OTP_VALIDITY_SECONDS);
      setOtpExpired(false);
      setOtpAttemptCount(0);
      setOtpLocked(false);
      setResendAttempts((prev) => prev + 1);
      setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      toast.success("OTP resent successfully!", { position: "top-left" });
    } catch (err: unknown) {
      const errMsg = getApiErrorMessage(
        err,
        "Failed to resend OTP. Please try again.",
      );
      toast.error(errMsg, { position: "top-left" });
    } finally {
      finishRequest();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    beginRequest,
    config,
    currentStepIndex,
    finishRequest,
    formData,
    isExisting,
    loanType,
    resendAttempts,
    resendCooldown,
  ]);

  /* ─── Phase 1 validation ─── */
  const validateInput = async () => {
    const e: Record<string, string> = {};
    const mobileError = getIndianMobileValidationError(formData.mobile);
    if (mobileError) e.mobile = mobileError;
    
    const emailError = getEmailValidationError(formData.email);
    if (emailError) e.email = emailError;

    if (isExisting) {
      const customerId = String(formData.customer_id ?? "").trim();
      if (!customerId) {
        e.customer_id = "Customer ID is required";
      } else if (!/^[a-zA-Z0-9]{6,20}$/.test(customerId)) {
        e.customer_id = "Customer ID must be 6\u201320 alphanumeric characters (no spaces or special characters)";
      }
    }
    if (formData.decl_no_defaulter !== "yes")
      e.decl_no_defaulter = "Please confirm you are not a defaulter";
    if (formData.decl_contact_consent !== "yes")
      e.decl_contact_consent = "Please provide contact consent";
    if (step?.needsCaptcha) {
      const captcha = sanitizeCaptchaInput(formData.captcha);
      const captchaHash = normalizeCaptchaHash(
        captchaData?.respData?.captcha_key || formData.captcha_key,
      );

      if (!captcha) {
        e.captcha = "Please enter the security code";
      } else if (!captchaHash) {
        e.captcha = "Security code has expired. Please refresh CAPTCHA.";
      } else {
        try {
          const isCaptchaValid = await bcrypt.compare(captcha, captchaHash);
          if (!isCaptchaValid) {
            e.captcha = "Invalid CAPTCHA. Enter the code exactly as shown.";
          }
        } catch {
          e.captcha = "Unable to verify CAPTCHA. Please refresh and try again.";
        }
      }
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      scrollToFirstFieldError();
    }
    if (e.decl_no_defaulter || e.decl_contact_consent) {
      toast.error("Please accept the required declarations", { position: "top-left" });
    } else if (e.captcha) {
      toast.error(e.captcha, { position: "top-left" });
    }
    return Object.keys(e).length === 0;
  };

  /* ─── Phase 2 validation ─── */
  const validateOtp = () => {
    const e: Record<string, string> = {};
    if (otpLocked) {
      e.otp = OTP_LOCKED_MESSAGE;
    } else if (otpExpired) {
      e.otp = OTP_EXPIRED_MESSAGE;
    } else if (!otpValue) {
      e.otp = "OTP is required";
    } else if (!isOtpComplete) {
      e.otp = "Enter the 6-digit OTP";
    }
    setErrors(e);
    if (e.otp) {
      scrollToFirstFieldError();
      toast.error(e.otp, {
        position: "top-left",
        id: OTP_ERROR_TOAST_ID,
      });
      return false;
    }
    return true;
  };

  /* ─── Phase 3 validation ─── */
  const validateBranch = () => {
    const e: Record<string, string> = {};
    if (!formData.state) e.state = "Please select your state";
    if (!formData.district) e.district = "Please select your district";
    if (!formData.branch) e.branch = "Please select your branch";
    setErrors(e);
    if (Object.keys(e).length > 0) {
      scrollToFirstFieldError();
      toast.error("Please select State, District and Branch to continue");
      return false;
    }
    return true;
  };

  const clearApplicationBinding = () => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(offerReachedKey);
    sessionStorage.removeItem(sessionKey);
    sessionStorage.removeItem(`${storageKey}_session_active`);
    clearJourneyDraft(loanType);
    updateFormData({
      application_id: "",
      otp_reference_id: "",
      otp_verified: false,
      is_submitted: false,
      has_reached_eligibility_offer: false,
      last_initiated_mobile: "",
      last_initiated_email: "",
      last_initiated_loan_type: "",
    });
  };

  const setIdentityMismatchError = () => {
    setErrors((prev) => ({
      ...prev,
      mobile: IDENTITY_MISMATCH_ERROR,
      email: IDENTITY_MISMATCH_ERROR,
    }));
    toast.error(IDENTITY_MISMATCH_ERROR, { position: "top-left" });
  };

  const handleProceed = async () => {
    const requestedIdentity = createJourneyIdentity({
      mobile: formData.mobile,
      email: formData.email,
    });

    if (phase === "input") {
      // Block if user belongs to a special category — they must visit a branch
      if (formData.is_category_belong === "yes") return;
      if (!(await validateInput())) return;
      if (!beginRequest()) return;
      
      try {
        const stepConfig = config?.steps[currentStepIndex];
        const backendTenantId = config?.backendTenantId || "";
        const hasMatchingInitiatedIdentity =
          !formData.is_submitted &&
          formData.loan_type === loanType &&
          formData.last_initiated_loan_type === loanType &&
          normalizeJourneyMobile(formData.last_initiated_mobile) === requestedIdentity.mobile &&
          normalizeJourneyEmail(formData.last_initiated_email) === requestedIdentity.email;
        const currentJourneyApplicationId = hasMatchingInitiatedIdentity
          ? formData.application_id
          : undefined;

        const payloadData = {
          is_existing_customer: isExisting,
          account_number: isExisting ? String(formData.customer_id ?? "").trim() : "",
          mobile: requestedIdentity.mobile,
          email: requestedIdentity.email,
          loan_type: loanType,
          communication_consent: formData.decl_contact_consent === "yes",
          not_npa_defaulter_flag: formData.decl_no_defaulter === "yes",
          is_special_category: formData.is_category_belong === "yes",
          section_id: "request_otp",
          application_id: currentJourneyApplicationId,
        };

        const requestBody = {
          step_key: stepConfig?.stepKey || "LOGIN_INITIATE",
          loan_type: loanType,
          captcha: sanitizeCaptchaInput(formData.captcha),
          captcha_key: formData.captcha_key,
          payload: payloadData
        };

        // Avoid redundant API calls if we already have an application_id for this request
        if (
          currentJourneyApplicationId &&
          normalizeJourneyMobile(formData.last_initiated_mobile) === requestedIdentity.mobile &&
          normalizeJourneyEmail(formData.last_initiated_email) === requestedIdentity.email &&
          formData.last_initiated_loan_type === loanType
        ) {
           moveToOtpPhase();
           finishRequest();
           return;
        }

        const response = await processJourneyStep({
          tenantId: backendTenantId,
          data: requestBody
        }).unwrap();

        const responseData = response?.data ?? {};
        const responseApplicationId =
          responseData.application_id ||
          currentJourneyApplicationId ||
          formData.application_id ||
          "";
        const responseOtpReferenceId =
          responseData.otp_reference_id ||
          responseData.opt_reference_id ||
          formData.otp_reference_id ||
          "";

        if (responseApplicationId) {
           if (
             getJourneyIdentityMismatch(responseData, requestedIdentity, {
               requireCompleteActual: false,
             })
           ) {
             clearApplicationBinding();
             setIdentityMismatchError();
             finishRequest();
             return;
           }

           localStorage.setItem(storageKey, responseApplicationId);
           sessionStorage.setItem(sessionKey, "1");
           const resName = responseData.residentName || "";
           const p = resName.trim().split(/\s+/);
           const f = p[0] || "";
           let m = "";
           let l = "";
           
           if (p.length === 2) {
             l = p[1];
           } else if (p.length >= 3) {
             m = p[1];
             l = p.slice(2).join(" ");
           }

           updateFormData({ 
               application_id: responseApplicationId,
               loan_type: loanType,
               otp_reference_id: responseOtpReferenceId,
               mobile: requestedIdentity.mobile,
               email: requestedIdentity.email,
               last_initiated_mobile: requestedIdentity.mobile,
               last_initiated_email: requestedIdentity.email,
               last_initiated_loan_type: loanType,
               otp_verified: false,
               is_submitted: false,
               first_name:  f || responseData.first_name || formData.first_name || "",
               middle_name: m || responseData.middle_name || formData.middle_name || "",
               last_name:   l || responseData.last_name || formData.last_name || "",
               dob:         responseData.dob      ?? formData.dob   ?? "",
               pan:         responseData.pan      ?? formData.pan   ?? "",
           });
        } else {
          updateFormData({
            loan_type: loanType,
            otp_reference_id: responseOtpReferenceId,
            mobile: requestedIdentity.mobile,
            email: requestedIdentity.email,
            last_initiated_mobile: requestedIdentity.mobile,
            last_initiated_email: requestedIdentity.email,
            last_initiated_loan_type: loanType,
            otp_verified: false,
            is_submitted: false,
          });
        }
        
        if (responseData.application_data) {
           syncWithApplicationData(responseData.application_data);
        }
        
        // Validate backend's suggested next step
        if (responseData.next_step && step?.needsOtp) {
            const expectedKey = "OTP_VERIFICATION";
            if (responseData.next_step !== expectedKey) {
                console.warn(`Backend suggests ${responseData.next_step} while we expected ${expectedKey}`);
            }
        }
      } catch (err: unknown) {
        finishRequest();
        
        // Set root error or handle validation feedback
        const backendErrors = mapBackendFieldErrors(err);

        // Detect CAPTCHA-specific backend errors and map to captcha field
        const errMsg = getApiErrorMessage(
          err,
          "We couldn't send the OTP. Please check your connection and try again.",
        );
        const isCaptchaError =
          errMsg.toLowerCase().includes("captcha") ||
          backendErrors.captcha ||
          backendErrors.captcha_key;
        if (isCaptchaError) {
          const captchaMsg = backendErrors.captcha || backendErrors.captcha_key || errMsg || "Invalid CAPTCHA. Please try again.";
          setErrors((prev) => ({ ...prev, captcha: captchaMsg }));
          toast.error("Invalid CAPTCHA. A new one has been generated.", { position: "top-left" });
          generateCaptcha();
        } else if (Object.keys(backendErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...backendErrors }));
        } else if (errMsg) {
          toast.error(errMsg, { position: "top-left" });
        }
        return;
      }
      
      finishRequest();
      if (step?.needsOtp) {
        moveToOtpPhase();
      } else {
        setCurrentSubStepKey("BRANCH_SELECTION");
        setPhase("branch");
      }
    } else if (phase === "otp") {
      if (isLoading || requestInFlightRef.current) return;
      if (!validateOtp()) return;
      if (!beginRequest()) return;
      
      try {
        const stepConfig = config?.steps[currentStepIndex];
        const backendTenantId = config?.backendTenantId || "";
        const currentSubStepKey = stepConfig?.subSteps?.otp?.stepKey || "OTP_VERIFICATION";
        
        // Skip OTP verification only if already verified in this session
        if (formData.otp_verified) {
            setCurrentSubStepKey("BRANCH_SELECTION");
            setPhase("branch");
            finishRequest();
            return;
        }

        const response = await processJourneyStep({
          tenantId: backendTenantId,
          suppressErrorToast: true,
          data: {
             step_key: currentSubStepKey,
             loan_type: loanType,
             payload: {
               application_id: formData.application_id,
               otp_reference_id: formData.otp_reference_id,
               otp: otpValue,
               section_id: "validate_otp"
             }
          }
        }).unwrap();

        // Response will throw if status_code !== 200 due to global interceptor
        
        // Mark OTP as verified to allow skip logic on navigation
        const resName = response.data.residentName || "";
        const p = resName.trim().split(/\s+/);
        const f = p[0] || "";
        let m = "";
        let l = "";
        
        if (p.length === 2) {
          l = p[1];
        } else if (p.length >= 3) {
          m = p[1];
          l = p.slice(2).join(" ");
        }

        updateFormData({ 
            loan_type: loanType,
            otp_verified: true,
            is_submitted: false,
            mobile: requestedIdentity.mobile,
            first_name:  f || response.data.first_name || formData.first_name || "",
            middle_name: m || response.data.middle_name || formData.middle_name || "",
            last_name:   l || response.data.last_name || formData.last_name || "",
            dob:         response.data.dob      ?? formData.dob   ?? "",
            email:       requestedIdentity.email,
            pan:         response.data.pan      ?? formData.pan   ?? "",
        });

        if (response?.data?.application_data) {
          syncWithApplicationData(response.data.application_data);
        }

        const applicationId = formData.application_id || localStorage.getItem(storageKey);
        if (applicationId) {
          localStorage.setItem(storageKey, applicationId);
          sessionStorage.setItem(sessionKey, "1");

          const restored = await triggerGetLoanApplication({
            tenantId: backendTenantId,
            applicationId,
            loanType,
          }).unwrap();

          const restoredPayload = restored?.data ?? restored;
          if (
            getJourneyIdentityMismatch(restoredPayload, requestedIdentity, {
              requireCompleteActual: true,
            })
          ) {
            clearApplicationBinding();
            setIdentityMismatchError();
            finishRequest();
            return;
          }

          restoreFromApiData(restoredPayload, requestedIdentity);
        }

        // Validate backend state sync
        if (response?.data?.next_step && response.data.next_step !== "BRANCH_SELECTION") {
            console.warn(`OTP success but backend suggests jumping to: ${response.data.next_step}`);
        }
      } catch (err: unknown) {
        finishRequest();

        const backendErrors = mapBackendFieldErrors(err);
        const msg = getApiErrorMessage(
          err,
          "Verification failed. Please check your connection and try again.",
        );
        const otpMsg = backendErrors.otp || msg;
        const isOtpError = Boolean(backendErrors.otp) || msg.toLowerCase().includes("otp");

        if (isOtpError) {
          const nextAttemptCount = otpAttemptCount + 1;
          setOtpAttemptCount(nextAttemptCount);

          if (nextAttemptCount >= OTP_MAX_VERIFY_ATTEMPTS) {
            setOtpLocked(true);
            setErrors({ otp: OTP_LOCKED_MESSAGE });
            toast.error(OTP_LOCKED_MESSAGE, {
              position: "top-left",
              id: OTP_ERROR_TOAST_ID,
            });
          } else {
            setErrors({ otp: otpMsg });
            toast.error(otpMsg, {
              position: "top-left",
              id: OTP_ERROR_TOAST_ID,
            });
          }
        } else if (Object.keys(backendErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...backendErrors }));
          toast.error("Please correct the highlighted fields.", { position: "top-left" });
        } else {
          toast.error(msg, { position: "top-left" });
        }
        return;
      }
      
      finishRequest();
      setOtpAttemptCount(0);
      setOtpLocked(false);
      setCurrentSubStepKey("BRANCH_SELECTION");
      setPhase("branch");
    } else {
      // branch phase
      if (!validateBranch()) return;
      if (completedStepIndices.includes(currentStepIndex)) {
        nextStep();
        finishRequest();
        return;
      }
      if (!beginRequest()) return;
      
      try {
        const stepConfig = config?.steps[currentStepIndex];
        const backendTenantId = config?.backendTenantId || "";
        const currentSubStepKey = stepConfig?.subSteps?.branch?.stepKey || "BRANCH_SELECTION";
        
        const response = await processJourneyStep({
          tenantId: backendTenantId,
          data: {
             step_key: currentSubStepKey,
             loan_type: loanType,
             payload: {
               application_id: formData.application_id,
               state: formData.state,
               district: formData.district,
               branch: formData.branch,
               processing_center: "same as branch",
               section_id: "pan_verification" // Force skip to PAN verification
             }
          }
        }).unwrap();

        markStepComplete(currentStepIndex);
        nextStep();
        setOtpSent(false);

        if (response?.data?.application_data) {
          syncWithApplicationData(response.data.application_data);
        }
      } catch (err: unknown) {
        finishRequest();
        const backendErrors = mapBackendFieldErrors(err);
        if (Object.keys(backendErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...backendErrors }));
            toast.error("Please correct the highlighted fields.", { position: "top-left" });
        } else {
            toast.error(
              getApiErrorMessage(
                err,
                "We couldn't save your branch selection. Please check your connection and try again.",
              ),
              { position: "top-left" },
            );
        }
        return;
      }
      
      finishRequest();
    }
  };

  /* ══════════════════════════════════════════════
     PHASE 1: Input / OTP
  ══════════════════════════════════════════════ */
  const isSpecialCategory = formData.is_category_belong === "yes";

  if (phase === "input" || phase === "otp") {
    return (
      <StepCard
        title="Basic Details"
        subtitle={`Fill in your details to avail the ${config?.title ?? "loan"}`}
        icon={<LockIcon />}
      >
        <div className="space-y-3 animate-fade-slide-up">

          {phase === "input" && (
            <>
              {/* ── Existing account holder toggle ── */}
              {step?.showNewUserToggle && (
                <div className="space-y-1 mb-4">
                  <p className="text-sm text-gray-700">
                    Are you an existing account holder?
                  </p>
                  <ToggleSwitch
                    value={isExisting}
                    onChange={(v) => set("is_new_user", v ? "no" : "yes")}
                  />
                </div>
              )}
              {/* Customer ID — shown for existing users */}
              {(!step?.showNewUserToggle || isExisting) && (
                <FormInput
                  label="Customer ID"
                  name="customer_id"
                  required={isExisting}
                  value={formData.customer_id}
                  onChange={(v) => set("customer_id", v.replace(/\s/g, ""))}
                  error={errors.customer_id}
                  placeholder="Customer ID"
                />
              )}

              {/* Mobile */}
              {(!step?.showNewUserToggle ||
                isExisting ||
                isNew) && (
                <FormInput
                  label="Mobile number"
                  name="mobile"
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={(v) => set("mobile", sanitizeMobileNumber(v))}
                  error={errors.mobile}
                  placeholder="Your 10 digit mobile number"
                  prefix="+91"
                  inputStyle={{ paddingLeft: "48px" }}
                />
              )}

              {/* Email Address */}
              {(!step?.showNewUserToggle ||
                isExisting ||
                isNew) && (
                <FormInput
                  label="Email Address"
                  name="email"
                  type="email"
                  required
                  value={formData.email || ""}
                  onChange={(v) => set("email", v)}
                  error={errors.email}
                  placeholder="Your email address"
                />
              )}

              {/* Declarations — shown for all users */}
              <div className="space-y-2.5">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={formData.decl_no_defaulter === "yes"}
                      onChange={(e) =>
                        set("decl_no_defaulter", e.target.checked ? "yes" : "")
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        formData.decl_no_defaulter === "yes"
                          ? "border-[var(--accent,#2e3192)] bg-[var(--accent,#2e3192)]"
                          : errors.decl_no_defaulter
                            ? "border-red-400 bg-red-50"
                          : "border-gray-300 bg-white group-hover:border-gray-400"
                      }`}
                    >
                      {formData.decl_no_defaulter === "yes" && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 leading-relaxed">
                    <span>
                      I hereby confirm that I am not a defaulter for any bank&apos;s
                      loan and no insolvency proceedings are initiated against
                      me.*
                    </span>
                    {errors.decl_no_defaulter && (
                      <span className="block mt-1 text-[11px] font-medium text-red-500">
                        {errors.decl_no_defaulter}
                      </span>
                    )}
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5 shrink-0">
                    <input
                      type="checkbox"
                      checked={formData.decl_contact_consent === "yes"}
                      onChange={(e) =>
                        set(
                          "decl_contact_consent",
                          e.target.checked ? "yes" : "",
                        )
                      }
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        formData.decl_contact_consent === "yes"
                          ? "border-[var(--accent,#2e3192)] bg-[var(--accent,#2e3192)]"
                          : errors.decl_contact_consent
                            ? "border-red-400 bg-red-50"
                          : "border-gray-300 bg-white group-hover:border-gray-400"
                      }`}
                    >
                      {formData.decl_contact_consent === "yes" && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-600 leading-relaxed">
                    <span>
                      I hereby confirm that {config?.name ?? "the bank"} / bank agent can call me /
                      send SMS / send Email to me regarding my loan application.*
                    </span>
                    {errors.decl_contact_consent && (
                      <span className="block mt-1 text-[11px] font-medium text-red-500">
                        {errors.decl_contact_consent}
                      </span>
                    )}
                  </span>
                </label>

                {config?.type === "education" && (
                  <label className="flex items-start gap-3 cursor-pointer group animate-in slide-in-from-top-2">
                    <div className="relative mt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={formData.decl_edu_consent === "yes"}
                        onChange={(e) =>
                          set("decl_edu_consent", e.target.checked ? "yes" : "")
                        }
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                          formData.decl_edu_consent === "yes"
                            ? "border-[var(--accent,#2e3192)] bg-[var(--accent,#2e3192)]"
                            : "border-gray-300 bg-white group-hover:border-gray-400"
                        }`}
                      >
                        {formData.decl_edu_consent === "yes" && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-600 leading-relaxed">
                      I hereby confirm that I&apos;m an Indian resident and secured admission in a reputed institute in India / Abroad and my family members&apos; income is as declared.*
                    </span>
                  </label>
                )}
              </div>

              {/* Category toggle — shown for ALL users (both existing and new) */}
              <div className="space-y-1">
                <p className="text-sm text-gray-700">
                  Do you belong to following category (Share broker, Advocate,
                  Police Dept. Employee, Railway and Mine Employee, Passenger
                  Bus operator)?
                </p>
                <ToggleSwitch
                  value={isSpecialCategory}
                  onChange={(v) => set("is_category_belong", v ? "yes" : "no")}
                />
                {isSpecialCategory && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300">
                    <p className="text-amber-800 text-xs font-bold leading-snug">
                      ⚠️ Please visit your nearest branch for further loan enquiry and processing. Online application is not available for this category.
                    </p>
                  </div>
                )}
              </div>

              {/* Captcha */}
              {step?.needsCaptcha && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center p-1 rounded-lg min-w-[130px] bg-white border border-gray-200 shadow-sm overflow-hidden"
                    >
                      {isFetchingCaptcha ? (
                        <div className="w-full h-[40px] flex items-center justify-center bg-gray-50">
                          <div className="w-4 h-4 border-2 border-[var(--primary,#2e3192)] border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        captchaData?.respData?.captcha_img && (
                          <img 
                            src={captchaData.respData.captcha_img} 
                            alt="captcha" 
                            className="h-[40px] w-auto object-contain"
                          />
                        )
                      )}
                    </div>
                    <button
                      onClick={generateCaptcha}
                      type="button"
                      disabled={isFetchingCaptcha}
                      title="Refresh"
                      aria-label="Refresh CAPTCHA"
                      className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
                    >
                      <svg
                        className="w-4.5 h-4.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m0 0H15"
                        />
                      </svg>
                    </button>
                  </div>
                  <FormInput
                    label="Enter Captcha"
                    name="captcha"
                    required
                    value={formData.captcha}
                    onChange={(v) => set("captcha", sanitizeCaptchaInput(v))}
                    error={errors.captcha}
                    placeholder="Case-sensitive (e.g. aB3xZ)"
                    autoComplete="off"
                  />
                  <p className="text-[10px] text-amber-600 -mt-1 font-medium">
                    ⚠ CAPTCHA is case-sensitive. Enter exactly as shown.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── OTP Phase ── */}
          {phase === "otp" && (
            <div className="space-y-4 animate-scale-in">
              <div className={`p-3 rounded-lg flex items-start gap-2.5 border ${otpExpired ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                <svg
                  className={`w-4 h-4 shrink-0 mt-0.5 ${otpExpired ? "text-red-500" : "text-green-600"}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  {otpExpired ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                </svg>
                <div className="flex-1">
                  <p className={`text-xs font-bold ${otpExpired ? "text-red-700" : "text-green-800"}`}>
                    {otpExpired
                      ? OTP_EXPIRED_MESSAGE
                      : <>OTP sent to +91 {maskMobile(formData.mobile)}</>
                    }
                  </p>
                  {!otpExpired && (
                    <p className="text-[11px] text-green-600 mt-0.5 flex items-center gap-1">
                      <span>Expires in:</span>
                      <span className="font-mono font-bold">
                        {String(Math.floor(otpTimer / 60)).padStart(2, "0")}:{String(otpTimer % 60).padStart(2, "0")}
                      </span>
                      <span>· Do not share.</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[12px] font-semibold text-gray-600 tracking-wide uppercase">
                  Enter OTP{" "}
                  <span className="text-[var(--primary,#2e3192)]">*</span>
                </label>
                <input
                  ref={otpInputRef}
                  type="text"
                  aria-label="One-time password"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpValue}
                  onChange={(e) =>
                    set("otp", e.target.value.replace(/\D/g, ""))
                  }
                  disabled={isLoading || otpExpired || otpLocked}
                  placeholder="• • • • • •"
                  className={`w-full px-4 py-3 rounded-lg border text-2xl font-bold tracking-[0.5em] text-center text-gray-800 outline-none transition-all ${
                    otpExpired
                      ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                      : errors.otp
                        ? "border-red-400 ring-2 ring-red-100"
                        : "border-gray-300 focus:border-[var(--primary,#2e3192)] focus:ring-2 focus:ring-[var(--primary,#2e3192)]/15"
                  }`}
                />
                {errors.otp && (
                  <p className="text-red-500 text-[11px] font-medium">
                    {errors.otp}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOtpSent(false);
                    setCurrentSubStepKey("LOGIN_INITIATE");
                    setPhase("input");
                  }}
                  disabled={isLoading}
                  aria-label="Change mobile number"
                  className="text-xs font-semibold text-gray-500 hover:text-gray-700 hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  ← Change mobile number
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={
                    isLoading ||
                    resendCooldown > 0 ||
                    resendAttempts >= OTP_MAX_RESEND_ATTEMPTS
                  }
                  aria-label="Resend OTP"
                  className="text-xs font-semibold text-[var(--accent,#2e3192)] hover:underline disabled:opacity-50"
                >
                  {resendCooldown > 0
                    ? `Resend OTP (${resendCooldown}s)`
                    : "Resend OTP"}
                </button>
              </div>
              {resendAttempts >= OTP_MAX_RESEND_ATTEMPTS && (
                <p className="text-[11px] font-medium text-amber-700">
                  Maximum resend attempts reached. Change the mobile number or restart the journey.
                </p>
              )}
            </div>
          )}

          <PrimaryButton
            onClick={handleProceed}
            isLoading={isLoading}
            disabled={
              (isSpecialCategory && phase === "input") ||
              (phase === "otp" && (!isOtpComplete || otpExpired || otpLocked))
            }
          >
            {phase === "otp"
              ? "Verify OTP"
              : step?.needsOtp
                ? "Send OTP"
                : "Continue"}
          </PrimaryButton>
        </div>
      </StepCard>
    );
  }

  /* ══════════════════════════════════════════════
     PHASE 3: State → District → Branch selection
  ══════════════════════════════════════════════ */
  const states = (statesData as PublicState[] | undefined)?.map((s) => ({
    label: s.state_name || "",
    value: s.state_name || "",
  })) || [];
  const districts = (districtsData as PublicDistrict[] | undefined)?.map((d) => {
    const label = d.region_name || d.district_name || "";
    const value = label ? label.trim().replace(/\s+/g, '_') : "";
    return { label, value };
  }) || [];
  const branches = (branchesData as PublicBranch[] | undefined)?.map((b) => ({
    label: b.branch_name || "",
    value: b.branch_name || "",
  })) || [];

  return (
    <StepCard
      title="Select Your Branch"
      subtitle="Choose your state, district and preferred branch"
      icon={<LockIcon />}
    >
      <div className="space-y-6 animate-fade-slide-up">
        {/* 2-Column Grid for Selections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <FormSelect
            label="State"
            name="state"
            required
            value={formData.state}
            onChange={(v) => {
              set("state", v);
              set("district", "");
              set("branch", "");
            }}
            error={errors.state}
            options={states}
            placeholder="Select State"
          />

          <FormSelect
            label="District"
            name="district"
            required
            value={formData.district}
            onChange={(v) => {
              set("district", v);
              set("branch", "");
            }}
            error={errors.district}
            options={districts}
            placeholder="Select District"
            disabled={!formData.state}
          />

          <div className="md:col-span-1">
            <FormSelect
              label="Branch"
              name="branch"
              required
              value={formData.branch}
              onChange={(v) => set("branch", v)}
              error={errors.branch}
              options={branches}
              placeholder="Select Branch"
              disabled={!formData.district}
            />
          </div>
        </div>

        {formData.branch && (
          <div className="animate-in fade-in duration-300 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
               <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-xs text-gray-600 font-medium">
              <span className="font-bold text-gray-800">Assigned Branch:</span>{" "}
              {branches.find((branch) => branch.value === formData.branch)?.label}
            </p>
          </div>
        )}

        <div className="flex gap-4 pt-2">
          {/* Hide Previous button once OTP is verified to strictly prevent backward navigation as requested */}
          <div className="flex-1">
            <PrimaryButton onClick={handleProceed} isLoading={isLoading}>
              Next →
            </PrimaryButton>
          </div>
        </div>
      </div>
    </StepCard>
  );
}

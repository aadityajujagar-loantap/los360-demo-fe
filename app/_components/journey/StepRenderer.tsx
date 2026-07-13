"use client";

import { useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "../../_lib/redux/hooks";
import {
  restoreJourneyState,
  restoreFromApiData,
  updateFormData,
} from "../../_lib/redux/slices/journeySlice";
import { StepComponentRegistry } from "./step-registry";
import CommonStep from "../../(public)/[orgSlug]/apply/[journeyType]/steps/common-step";
import UncommonStep from "../../(public)/[orgSlug]/apply/[journeyType]/steps/uncommon-step";
import { usePathname } from "next/navigation";
import { useGetLoanApplicationQuery } from "../../_lib/redux/services/adminApiSlice";
import {
  getJourneyOfferReachedKey,
  getJourneySessionKey,
  getJourneyStorageKey,
  getLoanTypeFromJourney,
} from "../../_lib/loanType";
import {
  clearJourneyDraft,
  readJourneyDraft,
  writeJourneyDraft,
} from "../../_lib/journeyDraft";
import type { JourneyDraftState } from "../../_lib/journeyDraft";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

function hasApiOfferData(payload: unknown): boolean {
  if (!isRecord(payload)) return false;

  const application = isRecord(payload.application) ? payload.application : payload;
  const eligibleOffer = isRecord(application.eligible_offer)
    ? application.eligible_offer
    : isRecord(payload.eligible_offer)
      ? payload.eligible_offer
      : null;

  if (eligibleOffer) return true;

  return [
    "eligible",
    "sanction_amount",
    "eligible_loan_amount",
    "eligible_roi",
    "eligible_emi",
    "eligible_tenure",
  ].some((key) => {
    const value = application[key];
    return value !== undefined && value !== null && value !== "";
  });
}

function removeDraftEligibleOffer(draft: JourneyDraftState): JourneyDraftState {
  if (!draft.formData || !("eligible_offer" in draft.formData)) return draft;

  const formData = { ...draft.formData };
  delete formData.eligible_offer;
  return { ...draft, formData };
}

/**
 * Central dispatcher for the loan journey.
 * Hydrates from the backend when a prior session is active and renders the current step.
 */
export default function StepRenderer() {
  const dispatch = useAppDispatch();
  const {
    completedStepIndices,
    config,
    currentStepIndex,
    currentSubStepKey,
    formData,
    isOtpSent,
  } = useAppSelector((state) => state.journey);

  const pathname = usePathname() || "";
  const loanType = getLoanTypeFromJourney({
    journeyType: config?.journeyType,
    configType: config?.type,
    pathname,
  });

  const storageKey = getJourneyStorageKey(loanType);
  const offerReachedStorageKey = getJourneyOfferReachedKey(loanType);
  // sessionStorage is cleared when the browser is closed but survives page reloads.
  // We use this to distinguish a reload (same session) from a new browser session.
  const sessionAuthKey = getJourneySessionKey(loanType);
  const storedAppId = typeof window !== "undefined" ? localStorage.getItem(storageKey) || "" : "";
  const draftHydrationKey = `${storageKey}:${storedAppId || "anonymous"}`;
  const hydratedDraftKeyRef = useRef("");
  const canPersistDraftRef = useRef(false);
  const hasStoredOfferReachedFlag = (() => {
    if (typeof window === "undefined" || !storedAppId) return false;

    const raw = localStorage.getItem(offerReachedStorageKey);
    if (!raw) return false;

    try {
      const parsed = JSON.parse(raw);
      return parsed?.applicationId === storedAppId;
    } catch {
      return raw === storedAppId;
    }
  })();
  // Skip restoring if Redux already holds the state for this application ID.
  // This prevents the UI from unmounting (flashing a spinner) immediately after application creation.
  const hasAppAlreadyLoaded = Boolean(
    storedAppId && 
    formData.application_id === storedAppId && 
    !formData.is_submitted
  );
  const hasSubmittedApplication = formData.is_submitted === true;
  const restoreSkip =
    !config?.backendTenantId ||
    !storedAppId ||
    hasAppAlreadyLoaded ||
    hasSubmittedApplication;
  const {
    data: applicationResponse,
    isError: isRestoreError,
    isFetching: isRestoring,
  } = useGetLoanApplicationQuery(
    {
      tenantId: config?.backendTenantId || "",
      applicationId: storedAppId,
      loanType,
      suppressErrorToast: true,
    },
    { skip: restoreSkip },
  );

  useEffect(() => {
    if (!isRestoreError || restoreSkip || typeof window === "undefined") return;

    localStorage.removeItem(storageKey);
    localStorage.removeItem(offerReachedStorageKey);
    sessionStorage.removeItem(sessionAuthKey);
    sessionStorage.removeItem(`${storageKey}_session_active`);
    clearJourneyDraft(loanType);
  }, [
    isRestoreError,
    loanType,
    offerReachedStorageKey,
    restoreSkip,
    sessionAuthKey,
    storageKey,
  ]);

  useEffect(() => {
    if (!canPersistDraftRef.current || !config || isRestoring) return;

    if (formData.is_submitted) {
      clearJourneyDraft(loanType);
      return;
    }

    writeJourneyDraft(loanType, {
      applicationId: formData.application_id
        ? String(formData.application_id)
        : storedAppId || undefined,
      formData,
      currentStepIndex,
      currentSubStepKey,
      completedStepIndices,
      isOtpSent,
    });
  }, [
    completedStepIndices,
    config,
    currentStepIndex,
    currentSubStepKey,
    formData,
    isOtpSent,
    isRestoring,
    loanType,
    storedAppId,
  ]);

  useEffect(() => {
    if (!config || hydratedDraftKeyRef.current === draftHydrationKey) return;

    canPersistDraftRef.current = false;
    hydratedDraftKeyRef.current = draftHydrationKey;

    if (hasSubmittedApplication) return;

    if (restoreSkip) {
      const draft = readJourneyDraft(loanType, storedAppId || undefined);
      if (draft) {
        dispatch(restoreJourneyState(draft));
      }
      canPersistDraftRef.current = true;
    }
  }, [
    config,
    dispatch,
    draftHydrationKey,
    hasSubmittedApplication,
    loanType,
    restoreSkip,
    storedAppId,
  ]);

  useEffect(() => {
    // Do not persist the app ID once the journey is submitted — that would
    // cause the next reload to re-fetch the completed application and land on doc-upload.
    if (
      formData.application_id &&
      formData.loan_type === loanType &&
      !formData.is_submitted
    ) {
      localStorage.setItem(storageKey, formData.application_id);
    }
  }, [
    formData.application_id,
    formData.is_submitted,
    formData.loan_type,
    loanType,
    storageKey,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      formData.application_id &&
      formData.loan_type === loanType &&
      currentStepIndex >= 5 &&
      !formData.is_submitted
    ) {
      localStorage.setItem(
        offerReachedStorageKey,
        JSON.stringify({
          applicationId: formData.application_id,
          reachedAt: new Date().toISOString(),
        }),
      );

      if (!formData.has_reached_eligibility_offer) {
        dispatch(updateFormData({ has_reached_eligibility_offer: true }));
      }
    }
  }, [
    currentStepIndex,
    dispatch,
    formData.application_id,
    formData.has_reached_eligibility_offer,
    formData.is_submitted,
    formData.loan_type,
    loanType,
    offerReachedStorageKey,
  ]);

  useEffect(() => {
    if (!applicationResponse || restoreSkip || hasSubmittedApplication) return;

    const applicationPayload = applicationResponse?.data ?? applicationResponse;
    if (!applicationPayload) return;

    // jumpToStep is true only when the user is in the same browser session (sessionStorage flag present).
    // When the browser was closed the flag is gone → force re-auth at step 0, then jump after auth.
    const isReload =
      typeof window !== "undefined" &&
      sessionStorage.getItem(sessionAuthKey) === "1";
    const draft = isReload
      ? readJourneyDraft(loanType, storedAppId || undefined)
      : null;

    const app = applicationPayload.application || applicationPayload;
    const isCompleted =
      app?.current_step === "SUBMITTED" ||
      app?.current_step === "LOAN_APPLICATION" ||
      app?.status === "submitted" ||
      app?.status === "completed";

    dispatch(
      restoreFromApiData({
        data: applicationPayload,
        jumpToStep: isReload,
        hasReachedEligibilityOffer: hasStoredOfferReachedFlag,
      }),
    );

    if (!isCompleted && draft) {
      dispatch(
        restoreJourneyState(
          hasApiOfferData(applicationPayload) ? removeDraftEligibleOffer(draft) : draft,
        ),
      );
    }
    canPersistDraftRef.current = true;

    // (Re-)set the auth flag so subsequent reloads skip re-auth.
    if (typeof window !== "undefined") {
      sessionStorage.setItem(sessionAuthKey, "1");
    }

    // If the application is submitted/completed, wipe localStorage NOW so the
    // NEXT reload starts a fresh journey instead of bouncing to the doc-upload step.
    if (isCompleted) {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(offerReachedStorageKey);
      // Also wipe the session auth key so a future fresh journey re-auths properly.
      sessionStorage.removeItem(sessionAuthKey);
      sessionStorage.removeItem(`${storageKey}_session_active`);
      clearJourneyDraft(loanType);
    }
  }, [
    applicationResponse,
    dispatch,
    hasSubmittedApplication,
    hasStoredOfferReachedFlag,
    loanType,
    offerReachedStorageKey,
    restoreSkip,
    storedAppId,
    storageKey,
    sessionAuthKey,
  ]);

  const step = config?.steps[currentStepIndex];

  if (isRestoring || !step) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[calc(100vh-50px)]">
        <div className="relative h-8 w-8">
          <div className="absolute inset-0 rounded-full border-2 border-slate-700" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-slate-300 animate-spin" />
        </div>
      </div>
    );
  }

  const RegisteredComponent = step.component
    ? StepComponentRegistry[step.component]
    : null;

  if (RegisteredComponent) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <RegisteredComponent />
      </div>
    );
  }

  if (step.isExtra) {
    return (
      <div className="animate-in fade-in slide-in-from-right-2 duration-400">
        <UncommonStep step={step} />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-left-2 duration-400">
      <CommonStep step={step} />
    </div>
  );
}

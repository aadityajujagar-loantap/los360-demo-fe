"use client";

import { useState } from "react";
import { usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from "../../../_lib/redux/hooks";
import { 
  updateFormData as updateFormDataAction, 
  nextStep as nextStepAction, 
  markStepComplete as markStepCompleteAction,
  syncWithApplicationData as syncWithApplicationDataAction
} from "../../../_lib/redux/slices/journeySlice";
import { useProcessJourneyStepMutation } from "../../../_lib/redux/services/adminApiSlice";
import StepCard from "../StepCard";
import {
  FormInput,
  PrimaryButton,
  SecondaryButton,
} from "../FormPrimitives";
import { getAgeValidationError } from "../../../_lib/validation/age";
import { scrollToFirstFieldError } from "../../../_hooks/useScrollToFieldError";

const AadharIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const findStringByKey = (source: unknown, targetKey: string) => {
  const stack = [source];
  const seen = new WeakSet<object>();

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    if (seen.has(current)) continue;
    seen.add(current);

    const record = current as Record<string, unknown>;
    const value = record[targetKey];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    Object.values(record).forEach((item) => {
      if (item && typeof item === "object") stack.push(item);
    });
  }

  return "";
};

export default function AadharStep() {
  const pathname = usePathname() || "";
  const dispatch = useAppDispatch();
  const {
    config,
    formData,
    currentStepIndex,
    completedStepIndices,
  } = useAppSelector((state) => state.journey);

  const updateFormData = (data: Record<string, unknown>) => dispatch(updateFormDataAction(data));
  const nextStep = () => dispatch(nextStepAction());
  const markStepComplete = (index: number) => dispatch(markStepCompleteAction(index));
  const syncWithApplicationData = (data: string) => dispatch(syncWithApplicationDataAction(data));
  const [processJourneyStep] = useProcessJourneyStepMutation();
  const [isLoading, setIsLoading] = useState(false);
  
  // ─── Config-driven substep control ───────────────────────────────────────
  // If `aadhar_number` is NOT listed in the step's fields config, the Aadhaar
  // input + OTP substeps are skipped entirely and we start directly at PAN.
  const hasAadharField = config?.steps[currentStepIndex]?.fields?.some(f => f.name === "aadhar_number");
  const [subStep, setSubStep] = useState<"input" | "otp" | "pan">(hasAadharField ? "input" : "pan");
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [transId, setTransId] = useState("");
  const isStepCompleted = completedStepIndices.includes(currentStepIndex);
  const hasValidAadhaar = String(formData.aadhar_number || "").length === 12;
  const hasValidPan = String(formData.pan || "").length === 10;
  const aadhaarOtpValue = String(formData.aadhar_otp ?? "").trim();
  const hasValidAadhaarOtp = /^\d{6}$/.test(aadhaarOtpValue);
  const showAadhaarVerified =
    hasValidAadhaar && (Boolean(formData.aadhar_verified) || isStepCompleted);
  const showPanVerified =
    hasValidPan && (Boolean(formData.pan_verified) || isStepCompleted);

  const set = (key: string, val: string) => {
    updateFormData({ [key]: val });
    setErrors((p) => {
      const e = { ...p };
      delete e[key];
      return e;
    });
  };

  const validateAadhaarNumber = () => {
    if (!hasValidAadhaar) {
      setErrors({ aadhar_number: "Valid 12-digit Aadhaar required" });
      scrollToFirstFieldError();
      return false;
    }
    return true;
  };

  const validateAadhaarOtp = () => {
    if (!aadhaarOtpValue) {
      setErrors({ aadhar_otp: "OTP is required" });
      scrollToFirstFieldError();
      return false;
    }
    if (!hasValidAadhaarOtp) {
      setErrors({ aadhar_otp: "Valid 6-digit OTP required" });
      scrollToFirstFieldError();
      return false;
    }
    return true;
  };

  const validatePan = () => {
    if (!hasValidPan) {
      setErrors({ pan: "Valid 10-character PAN required" });
      scrollToFirstFieldError();
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (isLoading) return;
    if (subStep === "input") {
      if (!validateAadhaarNumber()) return;
      if (showAadhaarVerified) {
        setSubStep("pan");
        return;
      }
      setIsLoading(true);
      try {
        const backendTenantId = config?.backendTenantId || "";
        
        let loanType = "PERSONAL_LOAN";
        if (pathname.includes("home-loan")) loanType = "HOME_LOAN";
        else if (pathname.includes("vehicle-loan")) loanType = "VEHICLE_LOAN";
        else if (pathname.includes("property-loan") || pathname.includes("property-mortgage")) loanType = "PROPERTY_MORTGAGE_LOAN";
        else if (pathname.includes("education-loan")) loanType = "EDUCATION_LOAN";
        else if (pathname.includes("personal-loan")) loanType = "PERSONAL_LOAN";

        const response = await processJourneyStep({
          tenantId: backendTenantId,
          data: {
             step_key: "PERSONAL_DETAILS",
             loan_type: loanType,
             payload: {
               application_id: formData.application_id,
               aadhaar_number: formData.aadhar_number,
               section_id: "aadhaar_kyc_initiated"
             }
          }
        }).unwrap();
        
        if (response?.data?.aadhaar_kyc_response?.transId) {
            setTransId(response.data.aadhaar_kyc_response.transId);
        }
        setSubStep("otp");
      } catch (err: unknown) {
        console.error("Aadhar Initiate failed", err);
        setErrors({ aadhar_number: "Failed to initiate Aadhar verification" });
      } finally {
        setIsLoading(false);
      }
    } else {
      // subStep === "otp"
      if (showAadhaarVerified) {
        setSubStep("pan");
        return;
      }
      if (!validateAadhaarOtp()) return;
      setIsLoading(true);
      try {
        const backendTenantId = config?.backendTenantId || "";
        
        let loanType = "PERSONAL_LOAN";
        if (pathname.includes("home-loan")) loanType = "HOME_LOAN";
        else if (pathname.includes("vehicle-loan")) loanType = "VEHICLE_LOAN";
        else if (pathname.includes("property-loan") || pathname.includes("property-mortgage")) loanType = "PROPERTY_MORTGAGE_LOAN";
        else if (pathname.includes("education-loan")) loanType = "EDUCATION_LOAN";
        else if (pathname.includes("personal-loan")) loanType = "PERSONAL_LOAN";

        const response = await processJourneyStep({
          tenantId: backendTenantId,
          data: {
             step_key: "PERSONAL_DETAILS",
             loan_type: loanType,
             payload: {
               application_id: formData.application_id,
               otp: aadhaarOtpValue,
               transId: transId,
               section_id: "aadhaar_kyc_otp"
             }
          }
        }).unwrap();

        const kyc = response?.data?.aadhaar_kyc_response;
        if (kyc) {
            const dobParts = kyc.dateOfBirth?.split("-");
            const formattedDob = (dobParts && dobParts.length === 3) 
                ? `${dobParts[2]}-${dobParts[1]}-${dobParts[0]}` 
                : kyc.dateOfBirth;

            const resName = kyc.residentName || "";
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
                aadhar_verified: true,
                first_name: f,
                middle_name: m,
                last_name: l,
                dob: formattedDob,
                gender: kyc.gender === "M" ? "male" : kyc.gender === "F" ? "female" : "other",
                perm_addr_line1: kyc.houseName || "",
                perm_addr_line2: kyc.street || kyc.locality || "",
                perm_addr_line3: kyc.landmark || "",
                perm_city: kyc.villageTownCityName || kyc.districtName || "",
                perm_district: kyc.districtName || kyc.villageTownCityName || "",
                perm_state: kyc.stateName || "",
                perm_pincode: kyc.pinCode || "",
            });
        }

        if (response?.data?.next_section === "pan_verification") {
            setSubStep("pan");
        } else {
            markStepComplete(currentStepIndex);
            nextStep();
        }
      } catch (err: unknown) {
        console.error("Aadhar Verify failed", err);
        setErrors({ aadhar_otp: "Invalid OTP" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  // ─── PAN sub-step ─────────────────────────────────────────────────────────
  if (subStep === "pan") {
      return (
        <StepCard
          title="PAN Verification"
          subtitle="Please enter your PAN card details for verification"
          icon={<AadharIcon />}
        >
          <div className="space-y-4">
            {showPanVerified ? (
              <div className="animate-in fade-in slide-in-from-top-2">
                <div className="relative">
                  <FormInput
                    label="PAN Card Number"
                    name="pan"
                    value={formData.pan}
                    readOnly
                    className="bg-gray-50"
                    error={errors.pan}
                    suffix={
                      <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Verified</span>
                      </div>
                    }
                  />
                </div>
                <p className="text-[10px] text-green-600/70 mt-2 font-medium">
                  PAN verified successfully.
                </p>
              </div>
            ) : (
              <FormInput
                label={config?.steps[currentStepIndex]?.fields?.find(f => f.name === "pan")?.label || "PAN Card Number"}
                name="pan"
                placeholder={config?.steps[currentStepIndex]?.fields?.find(f => f.name === "pan")?.placeholder || "ABCDE1234F"}
                required
                value={formData.pan}
                onChange={(v) => set("pan", v.toUpperCase().slice(0, 10))}
                error={errors.pan}
              />
            )}

            <div className="flex gap-4 pt-2">
              {/* Back to Aadhaar OTP — only shown if Aadhaar substeps are active for this org */}
              {hasAadharField && (
                <SecondaryButton 
                  onClick={() => setSubStep("otp")}
                  className="flex-1"
                >
                  ← Back
                </SecondaryButton>
              )}
              <div className={hasAadharField ? "flex-[2]" : "w-full"}>
                <PrimaryButton 
                  onClick={async () => {
                      if (!validatePan()) return;
                      if (showPanVerified) {
                          if (formData.dob) {
                              const ageError = getAgeValidationError(formData.dob, "Applicant");
                              if (ageError) {
                                  setErrors({ pan: ageError });
                                  return;
                              }
                          }
                          nextStep();
                          return;
                      }
                      setIsLoading(true);
                      try {
                          let loanType = "PERSONAL_LOAN";
                          if (pathname.includes("home-loan")) loanType = "HOME_LOAN";
                          else if (pathname.includes("vehicle-loan")) loanType = "VEHICLE_LOAN";
                          else if (pathname.includes("property-loan") || pathname.includes("property-mortgage")) loanType = "PROPERTY_MORTGAGE_LOAN";
                          else if (pathname.includes("education-loan")) loanType = "EDUCATION_LOAN";
                          else if (pathname.includes("personal-loan")) loanType = "PERSONAL_LOAN";

                          const response = await processJourneyStep({
                              tenantId: config?.backendTenantId || "",
                              data: {
                                  step_key: "PERSONAL_DETAILS",
                                  loan_type: loanType,
                                  payload: {
                                      application_id: formData.application_id,
                                      pan: formData.pan,
                                      kyc_option: "ekyc",
                                      section_id: "pan_verification"
                                  }
                              }
                          }).unwrap();

                          // ── Autofill from PAN verification response ──────────────────────────
                          // Maps pan_verification_response.data fields → formData keys used
                          // by IndividualDetailsStep (first_name, dob, address, etc.)
                          if (response?.data?.pan_verification_response?.data) {
                              const p = response.data.pan_verification_response.data;

                              // ── Name: prefer individual fields, fall back to splitting fullName ──
                              let first = p.firstName || "";
                              let middle = p.middleName || "";
                              let last = p.lastName || "";
                              if (!first && !last && p.fullName) {
                                  const parts = p.fullName.trim().split(/\s+/);
                                  first = parts[0] || "";
                                  if (parts.length === 2) {
                                      last = parts[1];
                                  } else if (parts.length >= 3) {
                                      middle = parts[1];
                                      last = parts.slice(2).join(" ");
                                  }
                              }

                              // ── DOB: parse "02-Jul-1990" → "1990-07-02" (HTML date input format) ──
                              let dobFormatted = formData.dob || "";
                              if (p.dobOrDoi) {
                                  const monthMap: Record<string, string> = {
                                      Jan: "01", Feb: "02", Mar: "03", Apr: "04",
                                      May: "05", Jun: "06", Jul: "07", Aug: "08",
                                      Sep: "09", Oct: "10", Nov: "11", Dec: "12",
                                  };
                                  const dobParts = p.dobOrDoi.split("-"); // ["02", "Jul", "1990"]
                                  if (dobParts.length === 3) {
                                      const mm = monthMap[dobParts[1]] || dobParts[1];
                                      dobFormatted = `${dobParts[2]}-${mm}-${dobParts[0].padStart(2, "0")}`;
                                  }
                              }

                              const ageError = dobFormatted
                                  ? getAgeValidationError(dobFormatted, "Applicant")
                                  : "";
                              if (ageError) {
                                  updateFormData({
                                      pan: p.pan || formData.pan || "",
                                      dob: dobFormatted,
                                  });
                                  setErrors({ pan: ageError });
                                  setIsLoading(false);
                                  return;
                              }

                              // ── Gender: "Male"/"Female"/"M"/"F" → "male"/"female" ──
                              const genderMap: Record<string, string> = {
                                  Male: "male", Female: "female", M: "male", F: "female",
                              };
                              const gender = genderMap[p.gender] || formData.gender || "";

                              // ── Address: precisely fill addr line 1 and 2 ──
                              const cleanStr = (s: unknown) => typeof s === "string" ? s.replace(/^,+|,+$/g, "").trim() : "";
                              
                              const addrLine1Parts = [cleanStr(p.buildingName), cleanStr(p.streetName)]
                                  .filter(Boolean)
                                  .join(", ");
                                  
                              const addrLine2Parts = [cleanStr(p.locality)]
                                  .filter(Boolean)
                                  .join(", ");

                              const permanentAddressLine1 =
                                  findStringByKey(response.data, "permanent_address_line1") ||
                                  p.permanent_address_line1 ||
                                  p.perm_addr_1 ||
                                  p.addressLine1 ||
                                  p.address_line1 ||
                                  addrLine1Parts;
                              const permanentAddressLine2 =
                                  findStringByKey(response.data, "permanent_address_line2") ||
                                  p.permanent_address_line2 ||
                                  p.perm_addr_2 ||
                                  p.addressLine2 ||
                                  p.address_line2 ||
                                  addrLine2Parts;

                              // ── Equifax credit score ──────────────────────────────────────────
                              let creditScore = "";
                              try {
                                  const scoreDetails = response.data?.equifax_score_response?.data
                                      ?.CCRResponse?.CIRReportDataLst?.[0]
                                      ?.CIRReportData?.ScoreDetails;
                                  if (Array.isArray(scoreDetails) && scoreDetails.length > 0) {
                                      creditScore = String(scoreDetails[0].Value || "");
                                  }
                              } catch {}

                              updateFormData({
                                  pan_verified: true,
                                  // ── Name ─────────────────────────────────────────────────────
                                  first_name:  first  || formData.first_name  || "",
                                  // fatherName → middle_name per backend/journey convention
                                  middle_name: p.fatherName || middle || formData.middle_name || "",
                                  last_name:   last   || formData.last_name   || "",
                                  // ── Personal ─────────────────────────────────────────────────
                                  dob:    dobFormatted,
                                  gender: gender,
                                  email:  formData.email || p.email || "",
                                  // Only fill mobile if not already captured from auth step
                                  ...(p.phone && !formData.mobile ? { mobile: p.phone } : {}),
                                  // PAN confirmed from response
                                  pan: p.pan || formData.pan || "",
                                  pan_issue_date: p.dobOrDoi || formData.pan_issue_date || "",
                                  // Masked Aadhaar (reference/display only)
                                  masked_aadhaar: p.maskedAadhaarNumber || formData.masked_aadhaar || "",
                                  // ── Permanent Address ─────────────────────────────────────────
                                  perm_addr_line1: permanentAddressLine1 || formData.perm_addr_line1 || "",
                                  perm_addr_line2: permanentAddressLine2 || formData.perm_addr_line2 || "",
                                  perm_addr_line3: p.addressLine3 || p.permanent_address_line3 || p.perm_addr_3 || formData.perm_addr_line3 || "",
                                  perm_city: p.city || formData.perm_city || "",
                                  perm_district: p.city || formData.perm_district || "",
                                  perm_state: p.state || formData.perm_state || "",
                                  perm_pincode:  p.pinCode || formData.perm_pincode  || "",
                                  // ── Credit Score from Equifax ─────────────────────────────────
                                  ...(creditScore ? { score: creditScore } : {}),
                              });
                          }

                          if (response?.data?.application_data) {
                              syncWithApplicationData(response.data.application_data);
                          }

                          markStepComplete(currentStepIndex);
                          nextStep();
                      } catch (err: unknown) {
                          console.error("PAN verification failed", err);
                          const errorData =
                              typeof err === "object" && err !== null && "data" in err
                                  ? (err as { data?: { errors?: Record<string, string> } }).data
                                  : undefined;
                          if (errorData?.errors) {
                              setErrors((prev) => ({ ...prev, ...errorData.errors }));
                          } else {
                              setErrors({ pan: "PAN verification failed. Please check and try again." });
                          }
                      } finally {
                          setIsLoading(false);
                      }
                  }} 
                  isLoading={isLoading}
                >
                  {showPanVerified
                    ? "Continue →"
                    : "Verify PAN →"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </StepCard>
      );
  }

  // ─── Aadhaar input + OTP substeps (active only when hasAadharField = true) ─
  return (
    <StepCard
      title="Aadhar Verification"
      subtitle="Verify your identity using UIDAI Aadhar service"
      icon={<AadharIcon />}
    >
      <div className="space-y-5">
        {showAadhaarVerified ? (
          <div className="animate-in fade-in slide-in-from-top-2">
             <div className="relative">
                <FormInput
                  label="Aadhar Number"
                  name="aadhar_number"
                  value={formData.aadhar_number}
                  readOnly
                  className="bg-gray-50"
                  error={errors.aadhar_number}
                  suffix={
                    <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Verified</span>
                    </div>
                  }
                />
             </div>
             <p className="text-[10px] text-green-600/70 mt-2 font-medium">
               Aadhaar identification successfully matches our records.
             </p>
          </div>
        ) : subStep === "input" ? (
          <div className="animate-in fade-in slide-in-from-top-2">
            <FormInput
              label={config?.steps[currentStepIndex]?.fields?.find(f => f.name === "aadhar_number")?.label || "Aadhar Number"}
              name="aadhar_number"
              placeholder={config?.steps[currentStepIndex]?.fields?.find(f => f.name === "aadhar_number")?.placeholder || "0000 0000 0000"}
              required
              value={formData.aadhar_number}
              onChange={(v) => set("aadhar_number", v.replace(/\D/g, "").slice(0, 12))}
              error={errors.aadhar_number}
            />
            <p className="text-[10px] text-gray-400 mt-2">
              We will send an OTP to your mobile number linked with Aadhar.
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-2">
            <p className="text-sm font-medium text-gray-700 mb-2">
              OTP sent to mobile linked with {formData.aadhar_number?.slice(-4).padStart(12, "*")}
            </p>
            <FormInput
              label="Enter 6-digit OTP"
              name="aadhar_otp"
              placeholder="123456"
              required
              autoComplete="off"
              value={aadhaarOtpValue}
              onChange={(v) => set("aadhar_otp", v.replace(/\D/g, "").slice(0, 6))}
              error={errors.aadhar_otp}
            />
          </div>
        )}

        <div className="flex gap-4 pt-2">
          <SecondaryButton 
            onClick={() => {
                if (isLoading) return;
                if (subStep === "otp") setSubStep("input");
            }}
            className={`flex-1 ${subStep === "input" ? "hidden" : ""}`}
          >
            ← Back
          </SecondaryButton>
          <div className="flex-[2]">
            <PrimaryButton
              onClick={handleNext}
              isLoading={isLoading}
              disabled={
                subStep === "input"
                  ? !showAadhaarVerified && !hasValidAadhaar
                  : !showAadhaarVerified && !hasValidAadhaarOtp
              }
            >
              {showAadhaarVerified
                ? "Continue →" 
                : subStep === "input" ? "Request OTP" : "Verify Aadhaar →"}
            </PrimaryButton>
          </div>
        </div>
      </div>
    </StepCard>
  );
}

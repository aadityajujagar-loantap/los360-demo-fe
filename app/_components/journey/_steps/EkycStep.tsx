"use client";

import { useState } from "react";
import { usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from "../../../_lib/redux/hooks";
import { 
  updateFormData as updateFormDataAction,
  nextStep as nextStepAction, 
  prevStep as prevStepAction,
  markStepComplete as markStepCompleteAction,
  resetJourney as resetJourneyAction
} from "../../../_lib/redux/slices/journeySlice";
import { useProcessJourneyStepMutation } from "../../../_lib/redux/services/adminApiSlice";
import StepCard from "../StepCard";
import { PrimaryButton, SecondaryButton } from "../FormPrimitives";

function formatInr(value: number): string {
  const sign = value < 0 ? "- " : "";
  return `${sign}₹${Math.abs(value).toLocaleString("en-IN")}`;
}

function parseNumber(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstPositiveNumber(...values: unknown[]): number {
  for (const value of values) {
    const parsed = parseNumber(value);
    if (parsed > 0) return parsed;
  }
  return 0;
}

function firstPositiveRoiValue(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? "").replace(/,/g, "").trim();
    if (!text || text.toLowerCase() === "floating") continue;

    const parsed = Number(text);
    if (Number.isFinite(parsed) && parsed > 0) return text;
  }
  return "";
}

function calculateEmi(
  principal: number,
  annualRate: number,
  months: number,
): number {
  if (principal <= 0 || annualRate <= 0 || months <= 0) return 0;
  const monthlyRate = annualRate / (12 * 100);
  return Math.round(
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1),
  );
}

export default function EkycStep() {
  const pathname = usePathname() || "";
  const dispatch = useAppDispatch();
  const {
    config,
    formData,
    currentStepIndex,
  } = useAppSelector((state) => state.journey);

  const nextStep = () => dispatch(nextStepAction());
  const prevStep = () => dispatch(prevStepAction());
  const updateFormData = (data: any) => dispatch(updateFormDataAction(data));
  const markStepComplete = (index: number) => dispatch(markStepCompleteAction(index));
  const [processJourneyStep] = useProcessJourneyStepMutation();
  const [isLoading, setIsLoading] = useState(false);

  const offer = formData.eligible_offer;
  const requestedLoanAmount = firstPositiveNumber(
    formData.loan_amount,
    formData.loan_amount_requested,
  );
  const requestedTenure = firstPositiveNumber(
    formData.repayment_period,
    formData.loan_period_requested,
  );
  const sanctionAmt = firstPositiveNumber(
    offer?.sanction_amount,
    offer?.eligible_loan_amount,
    requestedLoanAmount,
  );
  const eligibleAmt = firstPositiveNumber(
    offer?.eligible_loan_amount,
    offer?.sanction_amount,
    requestedLoanAmount,
  );
  const roiValue = firstPositiveRoiValue(offer?.roi, offer?.eligible_roi);
  const rate = parseNumber(roiValue);
  const tenure = firstPositiveNumber(
    offer?.tenure,
    offer?.eligible_tenure,
    requestedTenure,
  );
  const emi =
    firstPositiveNumber(offer?.emi, offer?.eligible_emi) ||
    calculateEmi(sanctionAmt, rate, tenure);
  const isExplicitlyIneligible =
    offer?.eligible === false ||
    offer?.eligible === "false" ||
    offer?.eligible === "0";
  const isExplicitlyEligible =
    offer?.eligible === true ||
    offer?.eligible === "true" ||
    offer?.eligible === "1";
  const isEligible =
    !isExplicitlyIneligible &&
    (isExplicitlyEligible ||
      sanctionAmt > 0 ||
      eligibleAmt > 0 ||
      formData.has_reached_eligibility_offer === true);
  const normalizedOffer = {
    ...(offer || {}),
    eligible: isEligible,
    sanction_amount: sanctionAmt,
    eligible_loan_amount: eligibleAmt,
    roi: roiValue,
    eligible_roi: roiValue,
    emi,
    eligible_emi: emi,
    tenure,
    eligible_tenure: tenure,
  };
  
  const { completedStepIndices } = useAppSelector((state) => state.journey);

  const handleApply = async () => {
    if (completedStepIndices.includes(currentStepIndex)) {
      nextStep();
      return;
    }
    setIsLoading(true);
    try {
      const stepConfig = config?.steps[currentStepIndex];
      const backendTenantId = config?.backendTenantId || "";
      const currentStepKey = stepConfig?.stepKey || "LOAN_OFFER";

      let loanType = "PERSONAL_LOAN";
      if (pathname.includes("home-loan")) loanType = "HOME_LOAN";
      else if (pathname.includes("vehicle-loan")) loanType = "VEHICLE_LOAN";
      else if (pathname.includes("property-loan") || pathname.includes("property-mortgage")) loanType = "PROPERTY_MORTGAGE_LOAN";
      else if (pathname.includes("education-loan")) loanType = "EDUCATION_LOAN";
      else if (pathname.includes("personal-loan")) loanType = "PERSONAL_LOAN";
      else {
        loanType = config?.type === "home" ? "HOME_LOAN" : config?.type === "vehicle" ? "VEHICLE_LOAN" : "PERSONAL_LOAN";
      }
      if (config?.type === "property-mortgage") loanType = "PROPERTY_MORTGAGE_LOAN";
      if (config?.type === "education") loanType = "EDUCATION_LOAN";

      const payloadData = {
          application_id: formData.application_id,
          section_id: "loan_offer_details",
          eligible: isEligible,
          sanction_amount: sanctionAmt,
          eligible_loan_amount: eligibleAmt,
          roi: roiValue || null,
          eligible_roi: roiValue || null,
          eligible_emi: emi,
          eligible_tenure: tenure,
          ev_param_eligible_cases: {
            age: "pass",
            loan_amount: "pass",
            tenure: "pass",
            credit_score: "base_roi_applied",
            foir: "pass",
            ltv: config?.type === "personal" ? "not_applicable" : "pass"
          },
          rejection_reasons: !isEligible ? [offer?.reason || "Check documentation"] : []
      };

      await processJourneyStep({
        tenantId: backendTenantId,
        data: {
           step_key: currentStepKey,
           loan_type: loanType,
           payload: payloadData
        }
      }).unwrap();
      updateFormData({
        eligible_offer: normalizedOffer,
        has_reached_eligibility_offer: true,
      });
      markStepComplete(currentStepIndex);
      nextStep();
    } catch (err: any) {
      console.error("Failed Loan Offer phase (Continuing with dummy mode fallback)", err);
      // As per scratchpad instructions: allow dummy data / continue for now
      updateFormData({
        eligible_offer: normalizedOffer,
        has_reached_eligibility_offer: true,
      });
      markStepComplete(currentStepIndex);
      nextStep();
    } finally {
      setIsLoading(false);
    }
  };

  if (offer?.eligible === false) {
    return (
      <StepCard noHeader>
        <div className="py-10 px-6 text-center animate-in zoom-in-95 duration-500">
           <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
           </div>
           
           <h2 className="text-2xl font-black text-gray-900 mb-2">Not Eligible</h2>
           <p className="text-gray-500 text-sm mb-8 leading-relaxed max-w-[280px] mx-auto">
              We're sorry, but based on the information provided, we are unable to proceed with your loan application at this time.
           </p>

           {offer?.rejection_reasons?.length > 0 && (
             <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 mb-8 text-left">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Reasons for rejection</p>
                <ul className="space-y-2">
                   {offer.rejection_reasons.map((reason: string, i: number) => (
                     <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 bg-red-400 rounded-full flex-shrink-0" />
                        {reason}
                     </li>
                   ))}
                </ul>
             </div>
           )}

            <div className="space-y-3">
               <button 
                 onClick={prevStep}
                 className="w-full py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all active:scale-95"
               >
                  ← Modify Details
               </button>
              <button 
                 onClick={() => {
                   let loanType = "PERSONAL_LOAN";
                   if (pathname.includes("home-loan")) loanType = "HOME_LOAN";
                   else if (pathname.includes("vehicle-loan")) loanType = "VEHICLE_LOAN";
                   else if (pathname.includes("property-loan") || pathname.includes("property-mortgage")) loanType = "PROPERTY_MORTGAGE_LOAN";
                   else if (pathname.includes("education-loan")) loanType = "EDUCATION_LOAN";
                   else if (pathname.includes("personal-loan")) loanType = "PERSONAL_LOAN";

                   localStorage.removeItem(`cosmos_loan_app_${loanType}`);
                   localStorage.removeItem(`cosmos_loan_app_${loanType}_state`);
                   localStorage.removeItem(`cosmos_loan_app_${loanType}_offer_reached`);
                   sessionStorage.removeItem(`cosmos_loan_app_${loanType}_auth`);
                   dispatch(resetJourneyAction());
                 }}
                 className="w-full py-3.5 rounded-xl font-bold text-white bg-gray-900 hover:bg-black transition-all active:scale-95"
               >
                  Restart Journey
               </button>
            </div>
        </div>
      </StepCard>
    );
  }

  return (
    <StepCard noHeader>
      <div className="space-y-5">
        {/* ── Congratulations banner ── */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, var(--accent,#2e3192) 0%, var(--accent-dark,#1a1c54) 100%)",
          }}
        >
          <div className="p-5 text-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-white"
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
            <h2 className="text-xl font-black text-white mb-1">
              {isEligible ? "🎉 Congratulations!" : "Decision Pending"}
            </h2>
            <p className="text-white/70 text-sm">
              {isEligible 
                ? "You are eligible for the following loan offer" 
                : "We couldn't generate an instant offer at this time"}
            </p>
          </div>

          {!isEligible ? (
             <div className="bg-white/10 px-5 py-8 text-center">
                <p className="text-white/80 text-sm italic mb-4">
                   "{offer?.reason || "Our system requires manual review of your profile."}"
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 rounded-full border border-amber-500/30">
                   <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                   <span className="text-[10px] font-bold text-amber-200 uppercase tracking-wider">Manual Review Required</span>
                </div>
             </div>
          ) : (
            <div className="bg-white/10 px-5 py-6 text-center">
              {/* ROI & Amount Highlight */}
              <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">
                Eligible Loan Offer
              </p>
              <p className="text-4xl font-black text-white mb-4">
                ₹{sanctionAmt.toLocaleString("en-IN")}
              </p>
              <div className="flex flex-col items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/20">
                  <span className="text-[11px] font-bold text-white/90 uppercase tracking-wider">
                    EMI: ₹{emi.toLocaleString("en-IN")}/mo
                  </span>
                </div>
                {/* <div className="text-[10px] text-white/50 font-medium">
                  Eligible Limit: ₹{eligibleAmt.toLocaleString("en-IN")}
                </div> */}
              </div>
            </div>
          )}
        </div>

        {/* ── Offer terms ── */}
        <div className="space-y-2">
          {isEligible ? (
            [
              {
                label: "Eligible Loan Offer",
                value: formatInr(sanctionAmt),
              },
              /* {
                label: "Eligible Loan Amount",
                value: formatInr(eligibleAmt),
              }, */
              {
                label: "Monthly EMI (approx)",
                value: formatInr(emi),
              },
              {
                label: "Rate of Interest (ROI)",
                value: roiValue ? `${roiValue}% p.a.` : "—",
              },
              {
                label: "Tenure",
                value: `${tenure} Months`,
              },
              {
                label: "Disbursement Branch",
                value: formData.branch
                  ? `${formData.branch.replace(/_/g, " ").replace(/\s+branch$/i, "")} Branch`
                  : `${config?.name ?? "the bank"} Branch`,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between items-center py-3 border-b border-gray-100/80"
              >
                <span className="text-sm font-medium text-gray-500">{row.label}</span>
                <span className="text-sm font-bold text-gray-900">
                  {row.value}
                </span>
              </div>
            ))
          ) : (
            <div className="py-8 text-center">
               <p className="text-xs text-gray-500 max-w-[240px] mx-auto">
                  Don't worry! You can still submit your application for manual verification by our branch officers.
               </p>
            </div>
          )}
        </div>

        {/* ── T&C ── */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 leading-relaxed">
          This is a pre-approved tentative offer. Final approval is subject to
          document verification and credit assessment by {config?.name ?? "the bank"}.
        </div>

        {/* ── CTA ── */}
        <div className="flex gap-4 pt-2">
            {!isEligible && (
              <SecondaryButton onClick={prevStep} className="flex-1">
                  ← Back
              </SecondaryButton>
            )}
            <div className={isEligible ? "flex-1" : "flex-[2]"}>
                <PrimaryButton onClick={handleApply} isLoading={isLoading}>
                    {isEligible ? "Accept Offer & Continue →" : "Send for Manual Review →"}
                </PrimaryButton>
            </div>
        </div>
      </div>
    </StepCard>
  );
}

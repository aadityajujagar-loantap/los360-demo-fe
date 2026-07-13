"use client";

import { useAppSelector } from "../../_lib/redux/hooks";
import { journeys } from "../../_config/journeys";
import { useParams } from "next/navigation";
import { getJourneyTypeFromRouteParam } from "../../_lib/journeyUrl";

export default function ThinDotsProgressBar() {
  const { orgSlug, journeyType: routeJourneyType } = useParams();
  const journeyType = getJourneyTypeFromRouteParam(routeJourneyType);
  const { currentStepIndex, formData, completedStepIndices } = useAppSelector(
    (state) => state.journey,
  );

  const journeyDef = journeyType ? journeys[orgSlug as string]?.[journeyType] : null;
  const allSteps = journeyDef?.steps ?? [];

  // Filter steps for the progress bar dots
  const visibleSteps = allSteps.filter((s) => !s.isHidden);
  
  if (allSteps.length === 0 || visibleSteps.length === 0) return null;

  // Show progress bar only once OTP is verified
  const isOtpStep = 
    currentStepIndex === 0 && 
    !formData.otp_verified;

  // Find which "Visible Step" we are currently in
  let currentVisibleIndex = 0;
  allSteps.forEach((step, idx) => {
     if (idx <= currentStepIndex && !step.isHidden) {
        currentVisibleIndex = visibleSteps.findIndex(vs => vs.id === step.id);
     }
  });

  const progressPercent = visibleSteps.length > 1
    ? Math.round(((currentVisibleIndex) / (visibleSteps.length - 1)) * 100)
    : 100;

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <>
      {/* ── Unified Header Top Bar (Blue Bank) ── */}
      <div 
        className="w-full py-2 px-6 flex items-center justify-between border-b border-white/10 shrink-0"
        style={{ background: "var(--primary, #2e3192)" }}
      >
        <div className="flex-1">
          {!isOtpStep && formData.application_id && (
            <div className="flex items-center gap-2.5">
              <span className="text-white/50 text-[12px] font-black tracking-[0.15em]">Application ID:</span>
              <span className="text-white text-[14px] font-mono font-black tracking-wider">
                {formData.application_id}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-white/50 text-[11px] font-black tracking-[0.15em]">Date:</span>
          <span className="text-white text-[12px] font-bold uppercase">
            {currentDate}
          </span>
        </div>
      </div>

      {/* ── POST-OTP: Progress Bar ── */}
      {!isOtpStep && (
        <>
          {/* MOBILE: Compact scrollable pill tabs (< md) */}
          <div className="md:hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-50 bg-white">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-black"
                  style={{ background: "var(--primary, #2e3192)" }}
                >
                  {currentVisibleIndex + 1}
                </span>
                <div>
                  <p className="text-[11px] font-bold text-gray-800 leading-none">
                    {visibleSteps[currentVisibleIndex]?.label}
                  </p>
                  <p className="text-[10px] text-gray-400 leading-none mt-0.5">
                    Step {currentVisibleIndex + 1} of {visibleSteps.length}
                  </p>
                </div>
              </div>
              <span
                className="text-[10px] font-black px-2 py-0.5 rounded-full"
                style={{ background: "var(--primary-light, #eef0ff)", color: "var(--primary, #2e3192)" }}
              >
                {progressPercent}%
              </span>
            </div>
            <div className="h-1 bg-gray-100 w-full">
              <div
                className="h-full transition-all duration-700 ease-in-out"
                style={{
                  width: `${progressPercent}%`,
                  background: "var(--primary, #2e3192)",
                }}
              />
            </div>
          </div>

          {/* DESKTOP: Classic dots + labels (≥ md) */}
          <div className="hidden md:block w-full bg-white px-8 py-10">
            <div className="max-w-3xl mx-auto">
              <div className="flex relative items-center justify-between">
                <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-100 -translate-y-1/2 z-0 rounded-full" />
                <div 
                  className="absolute top-1/2 h-[2px] z-0 -translate-y-1/2 transition-all duration-700 ease-in-out rounded-full"
                  style={{
                    left: 0,
                    width: `${(currentVisibleIndex / Math.max(visibleSteps.length - 1, 1)) * 100}%`,
                    background: "var(--progress-sky, #299AD0)"
                  }}
                />

                {visibleSteps.map((step, index) => {
                  const masterStepActualIndex = allSteps.findIndex(s => s.id === step.id);
                  const isCompleted = completedStepIndices?.includes(masterStepActualIndex);
                  const isActive = currentVisibleIndex === index;
                  const isPast = index < currentVisibleIndex;

                  return (
                    <div key={step.id} className="relative z-10 flex flex-col items-center group">
                      <div className={`
                        w-4 h-4 rounded-full transition-all duration-500 border-2 shrink-0
                        ${isPast || isCompleted
                          ? "bg-[var(--progress-sky,#299AD0)] border-[var(--progress-sky,#299AD0)] shadow-[0_0_10px_rgba(41,154,208,0.35)]"
                          : isActive
                            ? "bg-white border-[var(--progress-sky,#299AD0)] scale-125 shadow-[0_0_15px_rgba(41,154,208,0.2)]"
                            : "bg-white border-gray-200"}
                      `}>
                        {isActive && (
                          <div className="absolute inset-0 m-auto w-1.5 h-1.5 bg-[var(--progress-sky,#299AD0)] rounded-full animate-pulse" />
                        )}
                        {(isPast || isCompleted) && (
                          <svg className="w-2 h-2 text-white absolute inset-0 m-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="absolute top-6 flex flex-col items-center w-28 xl:w-32">
                        <span className={`text-[10px] font-bold uppercase tracking-wider text-center leading-tight transition-colors duration-500 flex flex-col items-center ${
                          isActive || isPast || isCompleted ? "text-[var(--primary,#2e3192)]" : "text-gray-400"
                        }`}>
                          {step.label.split(" ").map((word, i) => (
                            <span key={i}>{word}</span>
                          ))}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

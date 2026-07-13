"use client";

import { useParams } from "next/navigation";
import Image from "next/image";
import { useEffect } from "react";
import { orgs } from "../../../../_config/orgs";
import ThinDotsProgressBar from "../../../../_components/journey/ThinDotsProgressBar";
import { useAppDispatch } from "../../../../_lib/redux/hooks";
import { journeys } from "../../../../_config/journeys";
import { setConfig } from "../../../../_lib/redux/slices/journeySlice";
import { getJourneyTypeFromRouteParam } from "../../../../_lib/journeyUrl";

export default function JourneyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const routeJourneyType = params.journeyType as string;
  const journeyType = getJourneyTypeFromRouteParam(routeJourneyType);
  const org = orgs[orgSlug];
  const journeyDef = journeyType ? journeys[orgSlug]?.[journeyType] : null;

  // 1. Initialize config on mount
  useEffect(() => {
    if (!journeyDef || !journeyType) return;

    // Always set config first with runtime metadata
    dispatch(setConfig({ 
      ...journeyDef, 
      orgSlug, 
      journeyType, 
      backendTenantId: org?.backendTenantId || "",
      name: org?.name || ""
    }));
  }, [dispatch, journeyDef, orgSlug, journeyType, org?.backendTenantId, org?.name]);

  if (!journeyDef || !journeyType) {
    return <>{children}</>;
  }

  // Derive a human-readable loan type title
  const loanTitle = journeyType
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f8fafc] font-sans">
      {/* ── Mobile Header (visible only on < lg) ── */}
      <header className="lg:hidden sticky top-0 z-50 w-full bg-white border-b border-gray-100 shadow-sm">
        <div className="flex justify-between items-center px-4 py-2.5">
          {/* Logo */}
          {org?.assets?.logo ? (
            <img
              src={org.assets.logo}
              alt={org.name}
              className="h-9 w-auto object-contain shrink-0"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0"
              style={{ background: "var(--primary, #2e3192)" }}
            >
              {org?.name?.charAt(0) ?? "C"}
            </div>
          )}

          {/* Org name + loan type */}
          <div className="w-auto">
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none truncate">
              {org?.name ?? orgSlug}
            </p>
            <p className="text-sm font-black text-gray-900 leading-tight truncate">
              {loanTitle}
            </p>
          </div>
        </div>
      </header>

      {/* ── Left Branding Panel (desktop only) ── */}
      <aside
        className="hidden lg:flex lg:w-[30%] xl:w-[28%] flex-col justify-center py-10 px-8 xl:px-10 pb-28 relative h-screen overflow-hidden shrink-0 border-r border-white/5 sticky top-0"
        style={{
          background: `
            linear-gradient(rgba(26, 28, 84, 0.96), rgba(46, 49, 146, 0.94)),
            url('https://www.transparenttextures.com/patterns/carbon-fibre.png'),
            #1a1c54
          `,
          backgroundSize: 'auto, 200px, cover'
        }}
      >
        {/* Animated Background Gradients */}
        <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
        <div className="absolute bottom-0 -right-20 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center gap-y-12">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-8">
              {org?.assets?.logo ? (
                <img
                  src={org.assets.logo}
                  alt={org.name}
                  className="h-12 xl:h-14 w-auto object-contain bg-white p-2 rounded-2xl shadow-xl"
                />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white font-bold backdrop-blur-md border border-white/20">
                  {org?.name?.charAt(0) ?? "C"}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl xl:text-3xl font-black text-white leading-tight tracking-tight">
                {loanTitle}
              </h1>
              <p className="text-[12px] xl:text-[14px] text-white/50 leading-relaxed font-medium max-w-[300px]">
                Complete your application in under 5 minutes with our fully digital process.
              </p>
            </div>
          </div>

        </div>

        <div className="absolute inset-x-8 bottom-6 z-10 flex flex-col items-center border-t border-white/5 pt-4 text-center [@media(max-height:580px)]:hidden">
          <div className="flex items-center justify-center gap-2 text-[13px] font-semibold tracking-wide text-white/75">
            <span>Proudly Powered by</span>
            <span className="relative inline-flex h-7 w-[112px] overflow-hidden rounded bg-white shadow-sm ring-1 ring-white/10">
              <Image
                src={org?.assets?.logo || "/assets/orgs/cosmos/cosmos-logo.png"}
                alt={org?.name || "Cosmos Bank"}
                width={1920}
                height={1080}
                sizes="84px"
                className="absolute left-0 top-1/2 h-auto w-full max-w-none -translate-y-1/2"
              />
            </span>
          </div>
        </div>
      </aside>

      {/* ── Right Side: Journey Steps ── */}
      <div className="flex-1 flex flex-col bg-[#f8fafc] relative min-h-0 lg:h-screen lg:overflow-hidden">
        {/* Sticky Global Progress Bar */}
        <div className="sticky top-[56px] lg:top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-gray-100 shrink-0">
          <ThinDotsProgressBar />
        </div>

        {/* Scrollable Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full custom-scrollbar">
          <div className="flex flex-col items-center justify-start lg:justify-center py-4 sm:py-6 lg:py-8 px-3 sm:px-5 lg:px-6 pb-16 sm:pb-20">
            <div className="w-full max-w-4xl animate-in fade-in zoom-in slide-in-from-bottom-4 duration-700">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

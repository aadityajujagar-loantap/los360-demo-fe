"use client";

import { use, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useAppDispatch } from "../../../../_lib/redux/hooks";
import { setConfig as setConfigAction } from "../../../../_lib/redux/slices/journeySlice";
import { journeys } from "../../../../_config/journeys";
import { orgs } from "../../../../_config/orgs";
import StepRenderer from "../../../../_components/journey/StepRenderer";
import { getJourneyTypeFromRouteParam } from "../../../../_lib/journeyUrl";
import type { OrgConfig } from "../../../../_types/org";

type HeroSectionConfig = {
  headline: string;
  subtext: string;
  ctaLabel?: string;
  ctaHref: string;
};

type RichTextSectionConfig = {
  content: string;
};

type CtaSectionConfig = {
  headline: string;
  ctaLabel: string;
  ctaHref: string;
};

// ─── Static Section Components ──────────────────────────────────────────────

function HeroSection({ config, org }: { config: HeroSectionConfig; org: OrgConfig }) {
  const primary = org.branding.primaryColor;
  const accent = org.branding.secondaryColor;
  return (
    <section
      className="relative overflow-hidden py-20 px-6 rounded-2xl mb-8"
      style={{
        background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 60%, ${primary}44 100%)`,
      }}
    >
      <div className="relative max-w-5xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-6">
          {config.headline}
        </h1>
        <p className="text-white/75 text-lg max-w-2xl mx-auto leading-relaxed mb-10">
          {config.subtext}
        </p>
        {config.ctaLabel && (
          <Link
            href={config.ctaHref}
            className="px-8 py-4 rounded-xl font-bold text-white text-sm transition-all hover:brightness-110 active:scale-[0.98] shadow-xl inline-block"
            style={{ backgroundColor: primary }}
          >
            {config.ctaLabel} →
          </Link>
        )}
      </div>
    </section>
  );
}

function RichTextSection({ config }: { config: RichTextSectionConfig }) {
  const formatContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      if (line.trim().startsWith("###")) {
        return <h3 key={i} className="text-2xl font-black text-gray-900 mt-8 mb-4">{line.replace("###", "").trim()}</h3>;
      }
      if (line.trim().startsWith("-")) {
        return <li key={i} className="ml-4 text-gray-600 mb-2 list-disc">{line.replace("-", "").trim()}</li>;
      }
      if (line.trim() === "") return <br key={i} />;
      return <p key={i} className="text-gray-600 leading-relaxed mb-4">{line.trim()}</p>;
    });
  };
  return (
    <section className="py-8 px-6 bg-white rounded-2xl mb-8 border border-gray-100 shadow-sm">
      <div className="max-w-3xl mx-auto">
        {formatContent(config.content)}
      </div>
    </section>
  );
}

function CtaSection({ config, org }: { config: CtaSectionConfig; org: OrgConfig }) {
  const primary = org.branding.primaryColor;
  return (
    <section className="py-12 px-6 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-black text-gray-900 mb-6">{config.headline}</h2>
        <Link
          href={config.ctaHref}
          className="px-8 py-4 rounded-xl font-bold text-white text-sm transition-all hover:brightness-110 active:scale-[0.98] shadow-xl inline-block"
          style={{ backgroundColor: primary }}
        >
          {config.ctaLabel}
        </Link>
      </div>
    </section>
  );
}

// ─── Unified Page Component ──────────────────────────────────────────────────

/**
 * Entry point for dynamic organization routes.
 * Resolves to either a Loan Journey or a Static Content Page.
 */
export default function UnifiedDynamicPage({ params }: { params: Promise<{ orgSlug: string; journeyType: string }> }) {
  const { orgSlug, journeyType: routeJourneyType } = use(params);
  const journeyType = getJourneyTypeFromRouteParam(routeJourneyType);
  const dispatch = useAppDispatch();
  
  const org = orgs[orgSlug as string];
  const orgJourneys = journeys[orgSlug as string];
  const journeyDef = journeyType && orgJourneys ? orgJourneys[journeyType] : null;
  const staticPageConfig = org?.site?.pages ? org.site.pages[routeJourneyType as string] : null;

  // Effect handles Journey store initialization if it's a journey
  useEffect(() => {
    if (journeyDef && journeyType && org && !staticPageConfig) {
      const allSteps = journeyDef.steps.map((s) => ({ ...s, isExtra: false }));
      dispatch(setConfigAction({
        orgSlug: orgSlug as string,
        name: org.name,
        backendTenantId: org.backendTenantId,
        journeyType,
        title: journeyDef.title,
        type: journeyDef.type,
        maxCoApplicants: org.maxCoApplicants,
        steps: allSteps,
      }));
    }
  }, [
    orgSlug,
    journeyType,
    journeyDef,
    staticPageConfig,
    dispatch,
    org,
  ]);

  // Non-existent route
  if ((!journeyDef && !staticPageConfig) || !org) {
    return notFound();
  }

  // 1. Render Static Page if matched
  if (staticPageConfig) {
    return (
      <div className="flex flex-col gap-0">
        {staticPageConfig.sections.map((section, idx) => {
          const key = `${section.type}-${idx}`;
          switch (section.type) {
            case "hero":
              return <HeroSection key={key} config={section.props} org={org} />;
            case "rich-text":
              return <RichTextSection key={key} config={section.props} />;
            case "cta":
              return <CtaSection key={key} config={section.props} org={org} />;
            default:
              return null;
          }
        })}
      </div>
    );
  }

  // 2. Render Journey Steps if matched
  return <StepRenderer />;
}

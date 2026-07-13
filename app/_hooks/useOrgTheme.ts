"use client";

import { useEffect } from "react";
import { orgs } from "../_config/orgs";

/**
 * useOrgTheme: Dynamically injects organizational branding tokens
 * into :root as CSS variables, driving the entire UI via var(--primary) etc.
 */
export function useOrgTheme(orgSlug: string, isAdmin: boolean = false) {
  useEffect(() => {
    const root = document.documentElement;
    const org = orgs[orgSlug];

    if (!org || !org.branding) return;

    const { primaryColor, secondaryColor, fontFamily } = org.branding;

    // Default branding from config
    root.style.setProperty("--primary", primaryColor);
    root.style.setProperty("--primary-dark", shadeColor(primaryColor, -15));
    root.style.setProperty("--primary-light", shadeColor(primaryColor, 90));
    root.style.setProperty("--accent", secondaryColor);
    root.style.setProperty("--accent-dark", shadeColor(secondaryColor, -15));
    root.style.setProperty("--accent-light", shadeColor(secondaryColor, 85));

    // Legacy vars for backward compatibility
    root.style.setProperty("--primary-brand", primaryColor);
    root.style.setProperty("--secondary-brand", secondaryColor);
    root.style.setProperty("--btn-primary", primaryColor);

    if (fontFamily) {
      root.style.setProperty("--font-brand", fontFamily);
    }


  }, [orgSlug]);
}

/** Lighten or darken a hex color by a percentage */
function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

/** Convert hex + alpha to rgba CSS string */
function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = num >> 16;
  const g = (num >> 8) & 0x00ff;
  const b = num & 0x0000ff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

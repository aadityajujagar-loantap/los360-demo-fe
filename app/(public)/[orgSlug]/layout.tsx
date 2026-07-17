"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { orgs } from "../../_config/orgs";
import { journeys } from "../../_config/journeys";
import { useOrgTheme } from "../../_hooks/useOrgTheme";
import { getJourneyTypeFromRouteParam } from "../../_lib/journeyUrl";

/**
 * OrgLayout: The top-level branding + nav shell for an organization.
 * - Applies org CSS vars (theme) for all children.
 * - Renders a config-driven sticky nav ONLY on non-journey pages.
 *   Journey pages ([orgSlug]/[journeyType]) have their own nested layout.tsx
 *   that provides the journey-specific header — Next.js nesting handles isolation.
 */
export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const { orgSlug } = useParams();
  const pathname = usePathname();
  const org = orgs[orgSlug as string];

  // Apply org branding CSS vars to :root
  useOrgTheme(orgSlug as string);

  // Journey routes have their own headers — skip the site nav for them.
  // We need to resolve the page slug whether it's /cosmos/personal or just /personal
  const pathParts = pathname?.split("/").filter(Boolean) ?? [];
  const routeParts = pathParts[0] === orgSlug ? pathParts.slice(1) : pathParts;
  const pageSlug = routeParts[0] ?? "";
  const applyPageSlug = pageSlug === "apply" ? routeParts[1] : undefined;
  const journeyType = getJourneyTypeFromRouteParam(applyPageSlug);

  const isJourneyRoute = Boolean(
    pageSlug === "apply" &&
      journeyType &&
      journeys[orgSlug as string]?.[journeyType],
  );
  const isLoginPage = pageSlug === "";

  const nav = org?.site?.nav;

  return (
    <div className="h-screen overflow-hidden flex flex-col font-sans bg-gray-50">
      {/* ── Sticky Org Navbar (hidden on journey routes) ── */}
      {!isJourneyRoute && !isLoginPage && nav && (
        <header className="shrink-0 bg-white border-b border-gray-100">
          <div className={`max-w-7xl mx-auto px-6 flex items-center justify-between ${isLoginPage ? "h-16" : "h-[72px]"}`}>
            {/* Logo */}
            <Link href={`/${orgSlug}`} className="flex items-center gap-3 shrink-0">
              <img
                src="/assets/iFlow.png"
                alt="iFlow"
                className={`${isLoginPage ? "h-11" : "h-14"} w-auto max-w-[230px] object-contain`}
              />
            </Link>

            {/* Nav links */}
            <nav className="hidden md:flex items-center gap-1">
              {nav.links
                .filter((link) => link.label.toLowerCase() !== "login")
                .map((link) => {
                const isActive =
                  pathname === link.href ||
                  pathname === link.href.replace(`/${orgSlug}`, "");
                
                // Clean the href for subdomain usage
                const cleanHref = link.href.startsWith(`/${orgSlug}`)
                  ? link.href.replace(`/${orgSlug}`, "") || "/"
                  : link.href;

                const hasChildren = link.children && link.children.length > 0;

                if (link.isCta) {
                  return (
                    <Link
                      key={link.href}
                      href={cleanHref}
                      className="ml-3 px-5 py-2 rounded-lg text-sm font-bold transition-all text-white shadow-sm hover:shadow-md active:scale-95 bg-[var(--primary)] hover:bg-[var(--primary-dark)]"
                    >
                      {link.label}
                    </Link>
                  );
                }

                if (hasChildren) {
                  return (
                    <div key={link.href} className="relative group">
                      <Link
                        href={cleanHref}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1 ${
                          isActive || link.children?.some(c => pathname === c.href || pathname === c.href.replace(`/${orgSlug}`, ""))
                            ? "text-[var(--primary)] bg-[var(--primary-light)]"
                            : "text-[var(--accent)] hover:bg-gray-50"
                        }`}
                      >
                        {link.label}
                        <svg className="w-3.5 h-3.5 opacity-60 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Link>
                      
                      {/* Dropdown Menu */}
                      <div className="absolute left-0 top-full pt-2 w-52 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden py-1.5 ring-1 ring-black/5">
                          {link.children?.map((child) => {
                            const childCleanHref = child.href.startsWith(`/${orgSlug}`)
                              ? child.href.replace(`/${orgSlug}`, "") || "/"
                              : child.href;
                            
                            return (
                              <Link
                                key={child.href}
                                href={childCleanHref}
                                className="block px-4 py-2.5 text-[13px] font-bold text-gray-600 hover:bg-gray-50 hover:text-[var(--primary,#2e3192)] transition-colors"
                              >
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={link.href}
                    href={cleanHref}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? "text-[var(--primary)] bg-[var(--primary-light)]"
                        : "text-[var(--accent)] hover:bg-gray-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

            </nav>
          </div>
        </header>
      )}

      {/* ── Page Content ── */}
      <main className="flex-1 min-h-0 overflow-hidden">{children}</main>

      {/* ── Footer (hidden on journey routes which have their own) ── */}
      {!isJourneyRoute && !isLoginPage && (
        <footer className="shrink-0 border-t border-gray-200 bg-white py-4 px-6">
          <p className="text-center text-[11px] text-gray-400 font-medium">
            © {new Date().getFullYear()} {org?.name ?? "your organization"} · All
            rights reserved ·{" "}
            <Link
              href={
                pathname.startsWith(`/${orgSlug}`)
                  ? `/${orgSlug}/privacy`
                  : "/privacy"
              }
              className="hover:underline"
              style={{ color: "var(--primary,#2e3192)" }}
            >
              Privacy Policy
            </Link>{" "}
            ·{" "}
            <Link
              href={
                pathname.startsWith(`/${orgSlug}`)
                  ? `/${orgSlug}/terms`
                  : "/terms"
              }
              className="hover:underline"
              style={{ color: "var(--primary,#2e3192)" }}
            >
              Terms of Use
            </Link>
          </p>
        </footer>
      )}
    </div>
  );
}

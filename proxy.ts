import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { orgs } from "./app/_config/orgs";

// Build a map of domain to orgSlug for fast lookup
const domainToOrgSlugMap: Record<string, string> = {};

for (const orgSlug in orgs) {
  const org = orgs[orgSlug];
  if (org.domains) {
    for (const domain of org.domains) {
      domainToOrgSlugMap[domain] = orgSlug;
    }
  }
}

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  
  // Get hostname (e.g., orgName.example.com, localhost:3000)
  const hostname = req.headers.get("host") || "";
  
  // Extract the domain without port for lookup, or use full hostname if you mapped port in config
  // Here we strip the port if it's there
  const currentHost = hostname.split(":")[0];
  
  // Special case for local testing, e.g. orgName.localhost
  // We allow exact host match in domainToOrgSlugMap
  const orgSlug = domainToOrgSlugMap[currentHost] || domainToOrgSlugMap[hostname];

  // If the request path is for an internal next path (e.g. /_next), APIs, or direct static files, skip rewriting.
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 1. If we have a matching domain-based orgSlug
  if (orgSlug) {
    // If the browser URL already has the slug (e.g., orgName.localhost:3000/orgName/about)
    // we redirect to the clean version (orgName.localhost:3000/about)
    if (url.pathname.startsWith(`/${orgSlug}/`) || url.pathname === `/${orgSlug}`) {
      const cleanPath = url.pathname.replace(`/${orgSlug}`, "") || "/";
      return NextResponse.redirect(new URL(cleanPath, req.url));
    }

    // Rewrite internally so Next.js finds the files: /about -> /orgName/about
    url.pathname = `/${orgSlug}${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Keep path-based tenant routes on the current host, e.g.
  // /cosmos/apply/personal-loan-new should remain on localhost, Vercel previews,
  // or any deployed URL instead of redirecting to cosmos.localhost.
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

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

function getHostPort(host: string): string {
  const port = host.split(":")[1];
  return port && /^\d+$/.test(port) ? port : "";
}

function withRequestPort(targetHost: string, requestHost: string): string {
  const requestPort = getHostPort(requestHost);
  if (!requestPort || getHostPort(targetHost)) return targetHost;
  return `${targetHost}:${requestPort}`;
}

export function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  
  // Get hostname (e.g., orgName.example.com, localhost:3000)
  const hostname = req.headers.get("host") || "";
  
  // Extract the domain without port for lookup, or use full hostname if you mapped port in config
  // Here we strip the port if it's there
  let currentHost = hostname.split(":")[0];
  
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

  // 2. Security/Tenant Isolation: If we are on the BASE domain (no orgSlug matched),
  // but the user is trying to access /[tenant] directly in the URL:
  // We forbid/redirect it to enforce subdomain-only access.
  const pathParts = url.pathname.split("/").filter(Boolean);
  const potentialOrgSlug = pathParts[0];

  if (potentialOrgSlug && orgs[potentialOrgSlug]) {
    // If localhost:3000/orgName is hit, we redirect to the specialized subdomain
    const org = orgs[potentialOrgSlug];
    const targetDomain = withRequestPort(
      org.domains?.[0] || `${potentialOrgSlug}.localhost`,
      hostname,
    );
    
    // Redirect /orgName/personal -> orgName.localhost:3000/personal
    const newPath = url.pathname.replace(`/${potentialOrgSlug}`, "") || "/";
    // Construct the full URL preserving the protocol (http/https)
    const protocol = req.nextUrl.protocol;
    const redirectUrl = new URL(newPath, `${protocol}//${targetDomain}`);
    return NextResponse.redirect(redirectUrl);
  }

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

/**
 * OrgTheme: Branding colors and fonts for a tenant.
 */
export interface OrgTheme {
  primaryColor: string;
  secondaryColor: string;
  fontFamily?: string;
}

/**
 * OrgAssets: Paths to all branded images/assets for a tenant.
 * Centralized here to keep UI code low-code/high-config.
 */
export interface OrgAssets {
  logo: string;
  logoWhite?: string;
  favicon?: string;
  heroBanner?: string;
  mobileAppBanner?: string;
}

// ─── Site-level config types ────────────────────────────────────────────────

/** A single nav link in the org site header */
export interface OrgNavLink {
  label: string;
  href: string;
  /** Optional child links for dropdown / submenu navigation */
  children?: OrgNavLink[];
  /** If true, renders as a CTA button instead of a plain link */
  isCta?: boolean;
}

/** Controls what auth fields the org login page shows */
export interface OrgAuthConfig {
  /** Fields shown on login form */
  loginFields: ("email" | "name")[];
  /** Whether the signup page is enabled for this org */
  signupEnabled: boolean;
  /** Optional custom tagline on the auth page */
  authTagline?: string;
  /** Where to redirect after successful login */
  postLoginRedirect: string;
}

/** A single feature/product card on the homepage */
export interface OrgProductCard {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji or path to svg/image
  ctaLabel: string;
  ctaHref: string;
}

/** A single stat shown in the trust/stats bar */
export interface OrgStat {
  value: string;
  label: string;
}

/** Full homepage content config */
export interface OrgHomepageConfig {
  hero: {
    headline: string;
    subtext: string;
    ctaLabel: string;
    ctaHref: string;
    estYear?: string;
  };
  products: OrgProductCard[];
  stats?: OrgStat[];
  /** Ordered list of sections to render */
  sections: ("hero" | "products" | "stats" | "contact")[];
}

/** Navigation config for the org site header */
export interface OrgNavConfig {
  links: OrgNavLink[];
}

/** Represents a generic section on any static page */
export interface OrgContentSection {
  type: "hero" | "stats" | "products" | "contact" | "rich-text" | "faq" | "cta";
  /** Props vary by type, handled by dynamic renderer */
  props?: any;
}

/** Full page content config for any static page (e.g., about, faq) */
export interface OrgStaticPageConfig {
  title: string;
  description?: string;
  /** Ordered list of sections to render on this page */
  sections: OrgContentSection[];
}

/** Top-level site config bundled into OrgConfig */
export interface OrgSiteConfig {
  nav: OrgNavConfig;
  auth: OrgAuthConfig;
  homepage: OrgHomepageConfig;
  /** Additional static pages for this organization tenant */
  pages?: Record<string, OrgStaticPageConfig>;
  /** Global contact info for this tenant */
  contact?: {
    phone: string;
    email: string;
    address?: string;
  };
}

// ─── Root org config ─────────────────────────────────────────────────────────

/**
 * OrgConfig: Root configuration for an organization tenant.
 */
export interface OrgConfig {
  slug: string;
  name: string;
  isDummy?: boolean;
  apiBaseUrl: string;

  backendTenantId: string;
  backendAPIToken?: string;
  theme: string;
  branding: OrgTheme;
  assets: OrgAssets;
  /** Domains that map to this organization */
  domains?: string[];
  /** Maximum number of co-applicants allowed for this organization */
  maxCoApplicants?: number;
  /** Optional full-site config. Present only for orgs that have a full portal. */
  site?: OrgSiteConfig;
}

export type OrgRegistry = Record<string, OrgConfig>;


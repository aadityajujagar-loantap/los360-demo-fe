import { OrgRegistry } from "../_types/org";
import { buildJourneyHref } from "../_lib/journeyUrl";

const cosmosJourneyHref = (journeyType: string) =>
  buildJourneyHref("cosmos", journeyType);

/*
 * Registry of all supported organizations.
 * Defines API base URLs, dynamic branding, and all org-specific assets.
 */
export const orgs: OrgRegistry = {
  cosmos: {
    slug: "cosmos",
    name: "Cosmos Bank",
    apiBaseUrl: "",
    backendTenantId: process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID || "",
    backendAPIToken: process.env.NEXT_PUBLIC_BACKEND_API_TOKEN || "",
    theme: "cosmos",
    domains: ["cosmos.localhost", process.env.NEXT_PUBLIC_FRONTEND_DOMAIN || ""],
    maxCoApplicants: 5,
    branding: {
      primaryColor: "#2e3192",
      secondaryColor: "#1a1c54",
    },
    assets: {
      logo: "/assets/orgs/cosmos/cosmos-logo.png",
      logoWhite: "/assets/orgs/cosmos/cosmos-logo.png",
      favicon: "/favicon.png",
    },
    site: {
      nav: {
        links: [
          {
            label: "Apply Loan",
            href: cosmosJourneyHref("personal-loan"),
            children: [
              { label: "Personal Loan", href: cosmosJourneyHref("personal-loan") },
              { label: "Vehicle Loan", href: cosmosJourneyHref("vehicle-loan") },
              { label: "Property Mortgage Loan", href: cosmosJourneyHref("property-mortgage-loan") },
              { label: "Education Loan", href: cosmosJourneyHref("education-loan") },
              { label: "Home Loan", href: cosmosJourneyHref("home-loan") },
            ],
          },
          { label: "Login", href: "/cosmos", isCta: true },
        ],
      },
      auth: {
        loginFields: ["email"],
        signupEnabled: false,
        authTagline: "Authorized Staff Enrollment Portal",
        postLoginRedirect: "/dashboard",
      },
      homepage: {
        hero: {
          headline: "Banking That Enriches Life",
          subtext:
            "Experience seamless banking with Cosmos Co-op Bank. Apply for loans, manage accounts, and grow your financial future in one place.",
          ctaLabel: "Apply for a Loan",
          ctaHref: cosmosJourneyHref("personal-loan"),
          estYear: "1906",
        },
        stats: [
          { value: "118+", label: "Years of Trust" },
          { value: "₹18,000 Cr+", label: "Business Volume" },
          { value: "140+", label: "Branch Network" },
          { value: "22 Lakh+", label: "Happy Members" },
        ],
        products: [
          {
            id: "personal",
            title: "Personal Loan",
            description:
              "Flexible personal loans for your needs — medical, travel, education, or any personal expense.",
            icon: "💼",
            ctaLabel: "Apply Now",
            ctaHref: cosmosJourneyHref("personal-loan"),
          },
          {
            id: "home",
            title: "Home Loan",
            description:
              "Realise your dream of owning a home with competitive interest rates and easy repayment options.",
            icon: "🏠",
            ctaLabel: "Explore",
            ctaHref: cosmosJourneyHref("home-loan"),
          },
          {
            id: "business",
            title: "Business Loan",
            description:
              "Fuel your business growth with working capital loans, term loans, and OD facilities.",
            icon: "📈",
            ctaLabel: "Explore",
            ctaHref: "/cosmos/apply/business-loan",
          },
          {
            id: "vehicle",
            title: "Vehicle Loan",
            description:
              "Drive your dream vehicle with affordable EMIs and minimal documentation.",
            icon: "🚗",
            ctaLabel: "Apply Now",
            ctaHref: cosmosJourneyHref("vehicle-loan"),
          },
          {
            id: "property-mortgage",
            title: "Property Mortgage Loan (LAP)",
            description:
              "Unlock the potential of your property with our Mortgage Loan at competitive rates.",
            icon: "🏢",
            ctaLabel: "Apply Now",
            ctaHref: cosmosJourneyHref("property-mortgage-loan"),
          },
          {
            id: "education",
            title: "Education Loan",
            description:
              "Invest in your future with our specialized education loans for India and abroad.",
            icon: "🎓",
            ctaLabel: "Apply Now",
            ctaHref: cosmosJourneyHref("education-loan"),
          },
        ],
        sections: ["hero", "stats", "products", "contact"],
      },
      contact: {
        phone: "1800-22-2236",
        email: "support@cosmosbank.com",
      },
      pages: {},
    },
  },
};

export type OrgSlug = keyof typeof orgs;

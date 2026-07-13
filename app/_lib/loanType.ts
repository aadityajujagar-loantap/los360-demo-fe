export type LoanType =
  | "PERSONAL_LOAN"
  | "HOME_LOAN"
  | "VEHICLE_LOAN"
  | "PROPERTY_MORTGAGE_LOAN"
  | "EDUCATION_LOAN";

const JOURNEY_TYPE_TO_LOAN_TYPE: Record<string, LoanType> = {
  "personal-loan": "PERSONAL_LOAN",
  personal: "PERSONAL_LOAN",
  "home-loan": "HOME_LOAN",
  home: "HOME_LOAN",
  "vehicle-loan": "VEHICLE_LOAN",
  vehicle: "VEHICLE_LOAN",
  "car-loan": "VEHICLE_LOAN",
  car: "VEHICLE_LOAN",
  "property-mortgage-loan": "PROPERTY_MORTGAGE_LOAN",
  "property-mortgage": "PROPERTY_MORTGAGE_LOAN",
  "property-loan": "PROPERTY_MORTGAGE_LOAN",
  education: "EDUCATION_LOAN",
  "education-loan": "EDUCATION_LOAN",
};

const normalize = (value?: string | null) => value?.trim().toLowerCase() || "";

export function getLoanTypeFromJourney(input: {
  journeyType?: string | null;
  configType?: string | null;
  pathname?: string | null;
}): LoanType {
  const journeyType = normalize(input.journeyType);
  if (JOURNEY_TYPE_TO_LOAN_TYPE[journeyType]) {
    return JOURNEY_TYPE_TO_LOAN_TYPE[journeyType];
  }

  const configType = normalize(input.configType);
  if (JOURNEY_TYPE_TO_LOAN_TYPE[configType]) {
    return JOURNEY_TYPE_TO_LOAN_TYPE[configType];
  }

  const pathname = normalize(input.pathname);
  if (pathname.includes("home-loan")) return "HOME_LOAN";
  if (pathname.includes("vehicle-loan") || pathname.includes("car-loan")) return "VEHICLE_LOAN";
  if (pathname.includes("property-loan") || pathname.includes("property-mortgage")) {
    return "PROPERTY_MORTGAGE_LOAN";
  }
  if (pathname.includes("education-loan")) return "EDUCATION_LOAN";

  return "PERSONAL_LOAN";
}

export const getJourneyStorageKey = (loanType: LoanType) => `cosmos_loan_app_${loanType}`;

export const getJourneySessionKey = (loanType: LoanType) =>
  `${getJourneyStorageKey(loanType)}_auth`;

export const getJourneyOfferReachedKey = (loanType: LoanType) =>
  `${getJourneyStorageKey(loanType)}_offer_reached`;

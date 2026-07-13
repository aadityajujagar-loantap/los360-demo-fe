"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from "../../../_lib/redux/hooks";
import {
  updateFormData as updateFormDataAction,
  nextStep as nextStepAction,
  prevStep as prevStepAction,
  markStepComplete as markStepCompleteAction,
} from "../../../_lib/redux/slices/journeySlice";
import {
  useProcessJourneyStepMutation,
  useGetPublicMasterValuesQuery,
  useGetPublicLoanProductsQuery,
  useGetPublicStatesQuery,
  useGetPublicDistrictsQuery,
} from "../../../_lib/redux/services/adminApiSlice";
import StepCard from "../StepCard";
import {
  FormInput,
  FormSelect,
  SectionHeader,
  SectionDivider,
  PrimaryButton,
  SecondaryButton,
} from "../FormPrimitives";
import { getApiErrorMessage, mapBackendFieldErrors } from "../../../_lib/apiErrors";
import { scrollToFirstFieldError } from "../../../_hooks/useScrollToFieldError";

const LoanIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M9 11a1 1 0 010-2h6a1 1 0 010 2H9zm8 6H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2z"
    />
  </svg>
);

type UnknownRecord = Record<string, unknown>;

type SchemeParameterOption = {
  min_loan_amount?: string | number;
  max_loan_amount?: string | number;
  min_period_months?: string | number;
  max_period_months?: string | number;
  ltv_slabs?: UnknownRecord[];
};

type LoanSchemeOption = {
  id?: string | number;
  name?: string;
  scheme_name?: string;
  label?: string;
  parameter?: SchemeParameterOption | null;
  parameters?: SchemeParameterOption | null;
  slabs?: UnknownRecord[];
  scheme_slabs?: UnknownRecord[];
  ltv_slabs?: UnknownRecord[];
  min_loan_amount?: string | number;
  max_loan_amount?: string | number;
  min_period_months?: string | number;
  max_period_months?: string | number;
};

type LoanProductOption = {
  id?: string | number;
  name?: string;
  schemes?: LoanSchemeOption[];
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function readOptionValue(item: UnknownRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }
  }
  return undefined;
}

function parseAmount(value: unknown): number | null {
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  if (!normalized) return null;

  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function formatInr(value: number): string {
  return `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
}

function readNumberValue(value: unknown): number | null {
  const parsed = parseAmount(value);
  return parsed !== null && Number.isFinite(parsed) ? parsed : null;
}

function normalizePolicyAmount(value: number | null, referenceAmount: number | null): number | null {
  if (value === null) return null;

  // Some backend rule payloads are stored in lakhs while newer ones are absolute INR.
  // Treat small configured policy amounts as lakhs when the user-entered amount is INR-scale.
  if (referenceAmount !== null && referenceAmount >= value * 1000 && value > 0 && value <= 1000) {
    return value * 100000;
  }

  return value;
}

function readNumberField(
  source: unknown,
  keys: string[],
  referenceAmount: number | null = null,
  isPolicyAmount = false,
): number | null {
  if (!isRecord(source)) return null;

  for (const key of keys) {
    const value = readNumberValue(source[key]);
    if (value !== null) {
      return isPolicyAmount ? normalizePolicyAmount(value, referenceAmount) : value;
    }
  }

  return null;
}

function toRecordArray(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function getSchemeParameter(scheme?: LoanSchemeOption): SchemeParameterOption | undefined {
  if (!scheme) return undefined;
  if (isRecord(scheme.parameter)) return scheme.parameter as SchemeParameterOption;
  if (isRecord(scheme.parameters)) return scheme.parameters as SchemeParameterOption;
  return undefined;
}

function getSchemeLtvSlabs(scheme?: LoanSchemeOption): UnknownRecord[] {
  const parameter = getSchemeParameter(scheme);
  return [
    ...toRecordArray(parameter?.ltv_slabs),
    ...toRecordArray(scheme?.ltv_slabs),
  ];
}

function getSchemeAmountSlabs(scheme?: LoanSchemeOption): UnknownRecord[] {
  return [
    ...toRecordArray(scheme?.slabs),
    ...toRecordArray(scheme?.scheme_slabs),
  ];
}

function getRangeType(slab: UnknownRecord): string {
  const raw = slab.range_type;
  if (typeof raw === "string") return raw.toLowerCase();
  if (isRecord(raw) && typeof raw.value === "string") return raw.value.toLowerCase();
  return "";
}

function matchesAmountRange(
  amount: number,
  slab: UnknownRecord,
  thresholdKeys: string[],
): boolean {
  const threshold = readNumberField(slab, thresholdKeys, amount, true);
  if (threshold === null) return false;

  const rangeType = getRangeType(slab);
  if (rangeType === "upto") return amount <= threshold;
  if (rangeType === "above") return amount > threshold;
  return amount <= threshold;
}

function findMatchingAmountSlab(
  slabs: UnknownRecord[],
  amount: number | null,
  thresholdKeys: string[],
): UnknownRecord | undefined {
  if (amount === null || amount <= 0) return undefined;
  return slabs.find((slab) => matchesAmountRange(amount, slab, thresholdKeys));
}

function getOfferReasons(offer: unknown): string[] {
  if (!isRecord(offer)) return [];
  const raw = offer.rejection_reasons;
  if (Array.isArray(raw)) return raw.map((reason) => String(reason));
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  if (typeof offer.reason === "string" && offer.reason.trim()) return [offer.reason.trim()];
  return [];
}

function findReason(reasons: string[], terms: string[]): string | undefined {
  return reasons.find((reason) => {
    const normalized = reason.toLowerCase();
    return terms.some((term) => normalized.includes(term));
  });
}

function getBackendOfferValidationErrors(offer: unknown): Record<string, string> {
  if (!isRecord(offer)) return {};

  const isIneligible =
    offer.eligible === false ||
    offer.eligible === "false" ||
    offer.eligible === "0";
  if (!isIneligible) return {};

  const cases = isRecord(offer.ev_param_eligible_cases)
    ? offer.ev_param_eligible_cases
    : {};
  const reasons = getOfferReasons(offer);
  const errors: Record<string, string> = {};

  if (cases.loan_amount === "fail") {
    errors.loan_amount =
      findReason(reasons, ["amount", "limit", "minimum", "maximum"]) ||
      "Requested amount is outside permitted limits.";
  }

  if (cases.tenure === "fail") {
    errors.repayment_period =
      findReason(reasons, ["tenure", "period"]) ||
      "Loan period is outside allowed range.";
  }

  if (cases.ltv === "fail") {
    errors.loan_amount =
      findReason(reasons, ["ltv", "asset", "value", "margin"]) ||
      "Requested amount exceeds the permitted asset value limit.";
  }

  if (cases.age === "fail") {
    errors.repayment_period =
      findReason(reasons, ["age", "working", "retirement"]) ||
      "Loan period does not fit the allowed working age.";
  }

  return errors;
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function hasToken(value: string, token: string): boolean {
  return ` ${value} `.includes(` ${token} `);
}

export default function LoanDetailsStep() {
  const pathname = usePathname() || "";
  const dispatch = useAppDispatch();
  const { config, formData, currentStepIndex } = useAppSelector(
    (state) => state.journey,
  );

  const updateFormData = (data: UnknownRecord) => dispatch(updateFormDataAction(data));
  const nextStep = () => dispatch(nextStepAction());
  const prevStep = () => dispatch(prevStepAction());
  const markStepComplete = (index: number) =>
    dispatch(markStepCompleteAction(index));
  const [processJourneyStep] = useProcessJourneyStepMutation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activatedMasters, setActivatedMasters] = useState<Record<string, boolean>>({});

  const triggerMaster = (key: string) => {
    if (!activatedMasters[key]) {
      setActivatedMasters((prev) => ({ ...prev, [key]: true }));
    }
  };

  const { data: productsData = [] } = useGetPublicLoanProductsQuery();
  const { data: purposeData = [] } =
    useGetPublicMasterValuesQuery("purpose_of_loan", {
      skip: config?.type === "home" || config?.type === "vehicle" || (!activatedMasters["purpose"] && !formData.loan_purpose),
    });

  // Loan-type-specific master values — all lazy-loaded
  const { data: propertyTypeData = [] } = useGetPublicMasterValuesQuery(
    "property_type",
    { skip: (!activatedMasters["property_type"] && !formData.property_type) || config?.type !== "property-mortgage" },
  );
  const { data: studyLocationData = [] } = useGetPublicMasterValuesQuery(
    "study_location",
    { skip: (!activatedMasters["study_location"] && !formData.study_location) || config?.type !== "education" },
  );
  const { data: repaymentMethodData = [] } = useGetPublicMasterValuesQuery(
    "repayment_method",
    { skip: (!activatedMasters["repayment_method"] && !formData.repayment_method) || config?.type !== "education" },
  );
  const { data: statesData = [] } = useGetPublicStatesQuery(undefined, {
    skip: (!activatedMasters["dealer_state"] && !formData.dealer_state) || config?.type !== "vehicle"
  });
  const { data: districtsData = [] } = useGetPublicDistrictsQuery(
    formData.dealer_state || "",
    { skip: !formData.dealer_state || config?.type !== "vehicle" }
  );

  const mapToOptions = (data: unknown[]) =>
    data.map((item) => {
      if (typeof item === "string") return { label: item, value: item };
      if (!isRecord(item)) return { label: String(item), value: String(item) };

      const label =
        readOptionValue(item, ["meta_value", "name", "label", "value", "id"]) || "";
      const value =
        readOptionValue(item, ["meta_key", "meta_value", "id", "value", "name"]) ||
        String(item);

      return {
        label,
        value,
      };
    });

  const purposeOptions = mapToOptions(purposeData);
  const propertyTypeOptions = mapToOptions(propertyTypeData);
  const studyLocationOptions = mapToOptions(studyLocationData);
  const repaymentMethodOptions = mapToOptions(repaymentMethodData);

  const stateOptions = statesData.map((state) => ({
    label: isRecord(state)
      ? readOptionValue(state, ["state_name", "name"]) || String(state)
      : String(state),
    value: isRecord(state)
      ? readOptionValue(state, ["state_name", "name"]) || String(state)
      : String(state),
  }));
  const districtOptions = districtsData.map((district) => ({
    label: isRecord(district)
      ? readOptionValue(district, ["district_name", "name"]) || String(district)
      : String(district),
    value: isRecord(district)
      ? readOptionValue(district, ["district_name", "name"]) || String(district)
      : String(district),
  }));

  // Filter products based on journey type
  const loanProducts = productsData as LoanProductOption[];
  const filteredProducts = loanProducts.filter((p) => {
    const name = normalizeText(p.name);
    const type = config?.type;
    if (type === "vehicle") return name.includes("auto") || name.includes("vehicle") || name.includes("car");
    if (type === "home") return name.includes("home") || name.includes("housing") || hasToken(name, "hl");
    if (type === "property-mortgage") return name.includes("property") || name.includes("mortgage") || hasToken(name, "lap");
    if (type === "education") return name.includes("education") || name.includes("study");
    if (type === "personal") return name.includes("personal");
    return true;
  });

  // Auto-select Loan Product based on journey type and API data
  useEffect(() => {
    if (filteredProducts.length > 0) {
      // Prefer the first filtered product
      const matchedProduct = filteredProducts[0];
      
      if (matchedProduct) {
        const productId = String(matchedProduct.id);
        // Only update if it's different to avoid loops
        if (formData.loan_product !== productId) {
          updateFormData({ 
            loan_product: productId,
            // Auto-select first scheme if available
            loan_scheme: matchedProduct.schemes?.[0] ? String(matchedProduct.schemes[0].id) : ""
          });
        }
      }
    }
  }, [filteredProducts, config?.type]);

  const selectedProduct = filteredProducts.find(
    (p) => String(p.id) === String(formData.loan_product),
  );
  const selectedSchemes: LoanSchemeOption[] = selectedProduct?.schemes || [];
  const selectedScheme = selectedSchemes.find(
    (s) => String(s.id) === String(formData.loan_scheme),
  );
  const selectedSchemeName = normalizeText(
    selectedScheme?.name || selectedScheme?.scheme_name || selectedScheme?.label || "",
  );
  const isHomeJourney = config?.type === "home";
  const isVehicleJourney = config?.type === "vehicle";
  const isHomeResaleScheme =
    isHomeJourney && includesAny(selectedSchemeName, ["resale", "old property", "old house"]);
  const isHomeConstructionScheme =
    isHomeJourney && includesAny(selectedSchemeName, ["construction", "construct"]);
  const isHomeImprovementScheme =
    isHomeJourney &&
    includesAny(selectedSchemeName, ["improv", "repair", "renovation", "extension"]);
  const showHomePropertyFields = isHomeJourney && Boolean(formData.loan_scheme);
  const homeCostFieldName = isHomeConstructionScheme
    ? "construction_value"
    : "agreement_cost";
  const homeCostFieldLabel = isHomeConstructionScheme
    ? "Construction Value"
    : isHomeImprovementScheme
      ? "Estimated Cost of Improvement"
      : "Agreement Cost";
  const homeCostFieldValue = formData[homeCostFieldName] || "";
  const homeCostFieldError = errors[homeCostFieldName];
  const homePropertySectionTitle = isHomeConstructionScheme
    ? "Construction Details"
    : isHomeResaleScheme
      ? "Resale Property Details"
      : isHomeImprovementScheme
        ? "Property Improvement Details"
        : "Property Details";
  const selectedSchemeParameter = getSchemeParameter(selectedScheme);
  const selectedSchemeAmountSlabs = getSchemeAmountSlabs(selectedScheme);
  const selectedSchemeLtvSlabs = getSchemeLtvSlabs(selectedScheme);

  const getSecurityValue = () => {
    if (isVehicleJourney) {
      return {
        amount: parseAmount(formData.asset_value),
        label: "asset value",
      };
    }

    if (isHomeJourney) {
      const amount = parseAmount(homeCostFieldValue) ?? parseAmount(formData.market_value);
      return {
        amount,
        label: homeCostFieldLabel.toLowerCase(),
      };
    }

    if (config?.type === "property-mortgage") {
      return {
        amount: parseAmount(formData.market_value),
        label: "market value",
      };
    }

    if (config?.type === "education") {
      return {
        amount: parseAmount(formData.total_education_cost),
        label: "total education cost",
      };
    }

    return {
      amount: null,
      label: "asset value",
    };
  };

  const set = (key: string, val: string) => {
    updateFormData({ [key]: val });
    setErrors((p) => {
      const e = { ...p };
      delete e[key];
      if (key === "loan_amount") delete e.asset_value;
      if (key === "loan_scheme") {
        [
          "loan_amount",
          "repayment_period",
          "agreement_cost",
          "construction_value",
          "property_area",
          "property_address",
          "market_value",
          "age_of_property",
        ].forEach((field) => delete e[field]);
      }
      return e;
    });
  };

  const validateLoan = () => {
    const e: Record<string, string> = {};
    const requestedAmount = parseAmount(formData.loan_amount);
    const requestedTenure = parseAmount(formData.repayment_period);

    if (!formData.loan_product) e.loan_product = "Required";
    if (!formData.loan_scheme) e.loan_scheme = "Required";
    if (!isHomeJourney || showHomePropertyFields) {
      if (!formData.loan_amount) e.loan_amount = "Required";
      else if (requestedAmount === null || requestedAmount <= 0)
        e.loan_amount = "Enter a positive amount";

      if (!formData.repayment_period) e.repayment_period = "Required";
      else if (requestedTenure === null || requestedTenure <= 0)
        e.repayment_period = "Enter a positive loan period";
    }
    if (!isHomeJourney && !isVehicleJourney && !formData.loan_purpose) e.loan_purpose = "Required";

    if (config?.type === "property-mortgage") {
      if (!formData.property_type) e.property_type = "Required";
      if (!formData.market_value) e.market_value = "Required";
      if (!formData.age_of_property) e.age_of_property = "Required";
    }
    if (config?.type === "education") {
      if (!formData.course_name) e.course_name = "Required";
      if (!formData.study_location) e.study_location = "Required";
      if (!formData.institute_name) e.institute_name = "Required";
      if (!formData.repayment_method) e.repayment_method = "Required";
      if (!formData.total_education_cost) e.total_education_cost = "Required";
    }
    if (config?.type === "vehicle") {
      if (!formData.vehicle_make_model) e.vehicle_make_model = "Required";
      if (!formData.showroom_price) e.showroom_price = "Required";
      if (!formData.asset_value) {
        e.asset_value = "Required";
      } else {
        const assetValue = parseAmount(formData.asset_value);
        const requestedAmount = parseAmount(formData.loan_amount);

        if (assetValue === null || assetValue <= 0) {
          e.asset_value = "Enter a positive amount";
        } else if (requestedAmount !== null && requestedAmount > assetValue) {
          e.asset_value = "Must be at least the loan amount required";
        }
      }
      if (!formData.dealer_name) e.dealer_name = "Required";
      if (!formData.dealer_address) e.dealer_address = "Required";
      if (!formData.dealer_state) e.dealer_state = "Required";
      if (!formData.dealer_district) e.dealer_district = "Required";
    }
    if (isHomeJourney) {
      if (showHomePropertyFields) {
        if (!formData[homeCostFieldName]) e[homeCostFieldName] = "Required";
        if (!formData.property_area) e.property_area = "Required";
        if (!formData.property_address) e.property_address = "Required";
        if (isHomeResaleScheme) {
          if (!formData.market_value) e.market_value = "Required";
          if (!formData.age_of_property) e.age_of_property = "Required";
        }
      }
    }

    if (requestedAmount !== null && requestedAmount > 0 && !e.loan_amount) {
      const minLoanAmount = readNumberField(
        selectedSchemeParameter || selectedScheme,
        ["min_loan_amount", "minimum_loan_amount"],
        requestedAmount,
        true,
      );
      const maxLoanAmount = readNumberField(
        selectedSchemeParameter || selectedScheme,
        ["max_loan_amount", "maximum_loan_amount"],
        requestedAmount,
        true,
      );

      if (minLoanAmount !== null && requestedAmount < minLoanAmount) {
        e.loan_amount = `Minimum loan amount is ${formatInr(minLoanAmount)}`;
      } else if (maxLoanAmount !== null && requestedAmount > maxLoanAmount) {
        e.loan_amount = `Maximum loan amount is ${formatInr(maxLoanAmount)}`;
      }
    }

    if (requestedTenure !== null && requestedTenure > 0 && !e.repayment_period) {
      const matchingSchemeSlab = findMatchingAmountSlab(
        selectedSchemeAmountSlabs,
        requestedAmount,
        ["max_loan_amount_val"],
      );
      const minPeriod = readNumberField(
        selectedSchemeParameter || selectedScheme,
        ["min_period_months", "min_tenure_months"],
      );
      const parameterMaxPeriod = readNumberField(
        selectedSchemeParameter || selectedScheme,
        ["max_period_months", "max_tenure_months"],
      );
      const slabMaxPeriod = readNumberField(matchingSchemeSlab, [
        "max_period_months",
        "max_tenure_months",
      ]);
      const maxPeriod =
        parameterMaxPeriod !== null && slabMaxPeriod !== null
          ? Math.min(parameterMaxPeriod, slabMaxPeriod)
          : parameterMaxPeriod ?? slabMaxPeriod;

      if (minPeriod !== null && requestedTenure < minPeriod) {
        e.repayment_period = `Minimum loan period is ${minPeriod} months`;
      } else if (maxPeriod !== null && requestedTenure > maxPeriod) {
        e.repayment_period = `Maximum loan period is ${maxPeriod} months`;
      }
    }

    if (requestedAmount !== null && requestedAmount > 0 && !e.loan_amount) {
      const securityValue = getSecurityValue();
      if (securityValue.amount !== null && securityValue.amount > 0) {
        if (requestedAmount > securityValue.amount) {
          e.loan_amount = `Loan amount cannot exceed ${securityValue.label}`;
        }

        const matchingLtvSlab = findMatchingAmountSlab(
          selectedSchemeLtvSlabs,
          requestedAmount,
          ["amount_lakhs", "amount", "max_loan_amount_val"],
        );
        const minMarginPct = readNumberField(matchingLtvSlab, [
          "min_margin_pct",
          "margin_pct",
        ]);

        if (minMarginPct !== null && minMarginPct > 0) {
          const maxLoanFromAsset = securityValue.amount * ((100 - minMarginPct) / 100);
          if (requestedAmount > maxLoanFromAsset) {
            e.loan_amount = `Loan amount cannot exceed ${formatInr(maxLoanFromAsset)} for the entered ${securityValue.label}`;
          }
        }
      }
    }

    setErrors(e);
    if (Object.keys(e).length > 0) {
      scrollToFirstFieldError();
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateLoan()) return;
    setIsLoading(true);
    try {
      const stepConfig = config?.steps[currentStepIndex];
      const backendTenantId = config?.backendTenantId || "";
      const currentSubStepKey =
        stepConfig?.subSteps?.loan?.stepKey || "LOAN_DETAILS";

      let loanType = "PERSONAL_LOAN";
      if (pathname.includes("home-loan")) loanType = "HOME_LOAN";
      else if (pathname.includes("vehicle-loan")) loanType = "VEHICLE_LOAN";
      else if (pathname.includes("property-loan") || pathname.includes("property-mortgage"))
        loanType = "PROPERTY_MORTGAGE_LOAN";
      else if (pathname.includes("education-loan")) loanType = "EDUCATION_LOAN";
      else if (pathname.includes("personal-loan")) loanType = "PERSONAL_LOAN";

      const payload: Record<string, unknown> = {
        application_id: formData.application_id,
        section_id: "loan_requirement_details",
        loan_product: formData.loan_product,
        loan_scheme: formData.loan_scheme,
        loan_amount_requested: formData.loan_amount || "0",
        loan_period_requested: String(Number(formData.repayment_period || 0)),
        loan_purpose: isHomeJourney || isVehicleJourney
          ? selectedScheme?.name || selectedScheme?.scheme_name || selectedScheme?.label || ""
          : formData.loan_purpose,
        overdraft_amount: formData.overdraft_amount || "0",
      };

      // Inject Journey-Specific fields dynamically
      if (config?.type === "property-mortgage") {
        Object.assign(payload, {
          property_type: formData.property_type,
          market_value: formData.market_value,
          age_of_property: formData.age_of_property,
          property_area: formData.property_area,
          remaining_period: formData.remaining_period,
          outstanding_bal: formData.outstanding_bal,
          property_address: formData.property_address,
        });
      } else if (config?.type === "education") {
        Object.assign(payload, {
          course_name: formData.course_name,
          study_location: formData.study_location,
          institute_name: formData.institute_name,
          affiliated_institution: formData.affiliated_institution,
          repayment_method: formData.repayment_method,
          expected_future_income: formData.expected_future_income,
          moratorium_period: formData.moratorium_period,
          total_loan_period: formData.total_loan_period,
          total_education_cost: formData.total_education_cost,
          college_fees: formData.college_fees,
          other_costs: formData.other_costs,
          collateral_details: formData.collateral_details,
          collateral_market_value: formData.collateral_market_value,
        });
      } else if (config?.type === "vehicle") {
        Object.assign(payload, {
          vehicle_make_model: formData.vehicle_make_model,
          showroom_price: formData.showroom_price,
          rto_charges: formData.rto_charges,
          other_accessories: formData.other_accessories,
          insurance_cost: formData.insurance_cost,
          asset_value: formData.asset_value,
          dealer_name: formData.dealer_name,
          dealer_address: formData.dealer_address,
          dealer_state: formData.dealer_state,
          dealer_district: formData.dealer_district,
        });
      } else if (config?.type === "home") {
        Object.assign(payload, {
          agreement_cost: isHomeConstructionScheme
            ? formData.construction_value
            : formData.agreement_cost,
          ...(isHomeConstructionScheme
            ? { construction_value: formData.construction_value }
            : {}),
          property_area: formData.property_area,
          property_address: formData.property_address,
          ...(isHomeResaleScheme
            ? {
                age_of_property: formData.age_of_property,
                market_value: formData.market_value,
              }
            : {}),
        });
      }

      const response = await processJourneyStep({
        tenantId: backendTenantId,
        suppressErrorToast: true,
        data: {
          step_key: currentSubStepKey,
          loan_type: loanType,
          payload: payload,
        },
      }).unwrap();

      const offerValidationErrors = getBackendOfferValidationErrors(
        response.data?.eligible_offer,
      );
      if (Object.keys(offerValidationErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...offerValidationErrors }));
        scrollToFirstFieldError();
        toast.error(
          Object.values(offerValidationErrors)[0] ||
            getOfferReasons(response.data?.eligible_offer)[0] ||
            "Please correct the highlighted loan details.",
          { position: "top-left" },
        );
        return;
      }

      updateFormData({
        ...(response.data?.eligible_offer
          ? { eligible_offer: response.data.eligible_offer }
          : {}),
        has_reached_eligibility_offer: true,
      });

      markStepComplete(currentStepIndex);
      nextStep();
    } catch (err: unknown) {
      console.error("Failed Loan Details phase", err);
      const backendErrors = mapBackendFieldErrors(err, {
        loan_amount_requested: "loan_amount",
        loan_period_requested: "repayment_period",
        loan_period: "repayment_period",
        tenure: "repayment_period",
        property_value: isHomeJourney ? homeCostFieldName : "market_value",
        agreement_cost: "agreement_cost",
        construction_value: "construction_value",
        total_education_cost: "total_education_cost",
      });

      if (Object.keys(backendErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...backendErrors }));
        scrollToFirstFieldError();
      }

      toast.error(
        Object.values(backendErrors).find(Boolean) ||
          getApiErrorMessage(err, undefined, "Could not save loan details."),
        { position: "top-left" },
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loanAmt = parseFloat(formData.loan_amount?.replace(/,/g, "") || "0");
  const assetValue = parseAmount(formData.asset_value);
  const requestedLoanAmount = parseAmount(formData.loan_amount);
  const ownContribution =
    assetValue !== null && requestedLoanAmount !== null
      ? String(assetValue - requestedLoanAmount)
      : "";
  const rate = 10.5;
  const tenure = parseFloat(formData.repayment_period || "0");
  const monthlyRate = rate / (12 * 100);
  const emi =
    tenure > 0 && loanAmt > 0
      ? Math.round(
          (loanAmt * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
            (Math.pow(1 + monthlyRate, tenure) - 1),
        )
      : 0;

  /* ══════════════════════════════════════════════
     SUB-STEP 1: Loan Details
  ══════════════════════════════════════════════ */
  return (
    <StepCard
      title="Loan Details"
      subtitle="Tell us about the loan you're applying for"
      icon={<LoanIcon />}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormSelect
            label="Loan Product"
            name="loan_product"
            required
            disabled={filteredProducts.length <= 1}
            value={formData.loan_product}
            onChange={(v) => {
              set("loan_product", v);
              const p = filteredProducts.find((prod) => String(prod.id) === v);
              if (p?.schemes?.[0]) {
                set("loan_scheme", String(p.schemes[0].id));
              }
            }}
            error={errors.loan_product}
            options={filteredProducts.map((p) => ({
              label: p.name || String(p.id || ""),
              value: String(p.id || ""),
            }))}
          />
          <FormSelect
            label="Loan Scheme"
            name="loan_scheme"
            required
            value={formData.loan_scheme}
            onChange={(v) => set("loan_scheme", v)}
            error={errors.loan_scheme}
            options={selectedSchemes.map((s) => ({
              label: s.name || s.scheme_name || s.label || String(s.id),
              value: String(s.id),
            }))}
          />
        </div>

        {!isHomeJourney && (
          <>
        <div className="grid grid-cols-2 gap-3">
          {!isVehicleJourney && (
            <FormSelect
              label="Purpose of Loan"
              name="loan_purpose"
              required
              value={formData.loan_purpose}
              onChange={(v) => set("loan_purpose", v)}
              error={errors.loan_purpose}
              options={purposeOptions}
              onOpen={() => triggerMaster("purpose")}
            />
          )}
          <FormInput
            label="Loan Amount Required"
            name="loan_amount"
            type="number"
            required
            placeholder="e.g. 500000"
            value={formData.loan_amount}
            onChange={(v) => set("loan_amount", v)}
            error={errors.loan_amount}
            prefix="₹"
          />
          {isVehicleJourney && (
            <FormInput
              label="Repayment Period (Mons)"
              name="repayment_period"
              type="number"
              required
              placeholder="e.g. 60"
              value={formData.repayment_period}
              onChange={(v) => set("repayment_period", v)}
              error={errors.repayment_period}
            />
          )}
        </div>

        {!isVehicleJourney && (
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Repayment Period (Mons)"
            name="repayment_period"
            type="number"
            required
            placeholder="e.g. 60"
            value={formData.repayment_period}
            onChange={(v) => set("repayment_period", v)}
            error={errors.repayment_period}
          />
        </div>
        )}
          </>
        )}

        {/* Specialized Fields for Property Mortgage (LAP) */}
        {config?.type === "property-mortgage" && (
          <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
            <SectionHeader title="Property Details (LAP)" />
            <div className="grid grid-cols-2 gap-3">
              <FormSelect
                label="Type of Property"
                name="property_type"
                required
                value={formData.property_type}
                onChange={(v) => set("property_type", v)}
                error={errors.property_type}
                options={propertyTypeOptions}
                onOpen={() => triggerMaster("property_type")}
              />
              <FormInput
                label="Apprx Market Value (₹)"
                name="market_value"
                type="number"
                required
                prefix="₹"
                value={formData.market_value}
                onChange={(v) => set("market_value", v)}
                error={errors.market_value}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormInput
                label="Age of Property (Yrs)"
                name="age_of_property"
                type="number"
                required
                value={formData.age_of_property}
                onChange={(v) => set("age_of_property", v)}
                error={errors.age_of_property}
              />
              <FormInput
                label="Area (Sq Ft)"
                name="property_area"
                type="number"
                value={formData.property_area}
                onChange={(v) => set("property_area", v)}
                suffix="sq ft"
              />
              <FormInput
                label="Remaining Loan Period (Mons)"
                name="remaining_period"
                type="number"
                value={formData.remaining_period}
                onChange={(v) => set("remaining_period", v)}
              />
            </div>
            <FormInput
              label="Outstanding Balance of Existing Loan (₹)"
              name="outstanding_bal"
              type="number"
              prefix="₹"
              value={formData.outstanding_bal}
              onChange={(v) => set("outstanding_bal", v)}
            />
            <FormInput
              label="Address of Property"
              name="property_address"
              value={formData.property_address}
              onChange={(v) => set("property_address", v)}
            />
          </div>
        )}

        {/* Specialized Fields for Education Loan */}
        {config?.type === "education" && (
          <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
            <SectionHeader title="Course & Institution Details" />
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Name of Course"
                name="course_name"
                required
                value={formData.course_name}
                onChange={(v) => set("course_name", v)}
                error={errors.course_name}
              />
              <FormSelect
                label="Study At"
                name="study_location"
                required
                value={formData.study_location}
                onChange={(v) => set("study_location", v)}
                error={errors.study_location}
                options={studyLocationOptions}
                onOpen={() => triggerMaster("study_location")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Name of College/Institution"
                name="institute_name"
                required
                value={formData.institute_name}
                onChange={(v) => set("institute_name", v)}
                error={errors.institute_name}
              />
              <FormInput
                label="Name of Affiliated Institution"
                name="affiliated_institution"
                value={formData.affiliated_institution}
                onChange={(v) => set("affiliated_institution", v)}
              />
            </div>

            <SectionDivider />
            <SectionHeader title="Financials & Security" />
            <div className="grid grid-cols-2 gap-3">
              <FormSelect
                label="Repayment Method"
                name="repayment_method"
                required
                value={formData.repayment_method}
                onChange={(v) => set("repayment_method", v)}
                error={errors.repayment_method}
                options={repaymentMethodOptions}
                onOpen={() => triggerMaster("repayment_method")}
              />
              <FormInput
                label="Expected Future Monthly Income (₹)"
                name="expected_future_income"
                type="number"
                prefix="₹"
                value={formData.expected_future_income}
                onChange={(v) => set("expected_future_income", v)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormInput
                label="Moratorium Period (Mons)"
                name="moratorium_period"
                type="number"
                value={formData.moratorium_period}
                onChange={(v) => set("moratorium_period", v)}
              />
              <FormInput
                label="Total Loan Period (Mons)"
                name="total_loan_period"
                type="number"
                value={formData.total_loan_period}
                onChange={(v) => set("total_loan_period", v)}
              />
              <FormInput
                label="Total Education Cost (₹)"
                name="total_education_cost"
                type="number"
                required
                prefix="₹"
                value={formData.total_education_cost}
                onChange={(v) => set("total_education_cost", v)}
                error={errors.total_education_cost}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="College Fees (₹)"
                name="college_fees"
                type="number"
                prefix="₹"
                value={formData.college_fees}
                onChange={(v) => set("college_fees", v)}
              />
              <FormInput
                label="Other Costs (₹)"
                name="other_costs"
                type="number"
                prefix="₹"
                value={formData.other_costs}
                onChange={(v) => set("other_costs", v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Collateral Security Details / Address"
                name="collateral_details"
                value={formData.collateral_details}
                onChange={(v) => set("collateral_details", v)}
              />
              <FormInput
                label="Apprx Market Value of Collateral (₹)"
                name="collateral_market_value"
                type="number"
                prefix="₹"
                value={formData.collateral_market_value}
                onChange={(v) => set("collateral_market_value", v)}
              />
            </div>
          </div>
        )}
        {config?.type === "vehicle" && (
          <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
            <SectionHeader title="Vehicle Details" />
            <div className="grid grid-cols-1 gap-3">
              <FormInput
                label="Make & Model of Vehicle"
                name="vehicle_make_model"
                required
                placeholder="e.g. Maruti Swift 2024"
                value={formData.vehicle_make_model}
                onChange={(v) => set("vehicle_make_model", v)}
                error={errors.vehicle_make_model}
              />
            </div>

            <SectionDivider />
            <SectionHeader title="Vehicle Cost Breakup" />
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Ex Showroom Price (₹)"
                name="showroom_price"
                type="number"
                required
                prefix="₹"
                placeholder="e.g. 800000"
                value={formData.showroom_price}
                onChange={(v) => set("showroom_price", v)}
                error={errors.showroom_price}
              />
              <FormInput
                label="RTO charges and other taxes (₹)"
                name="rto_charges"
                type="number"
                prefix="₹"
                placeholder="e.g. 50000"
                value={formData.rto_charges}
                onChange={(v) => set("rto_charges", v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Other Accessories (₹)"
                name="other_accessories"
                type="number"
                prefix="₹"
                placeholder="e.g. 20000"
                value={formData.other_accessories}
                onChange={(v) => set("other_accessories", v)}
              />
              <FormInput
                label="Insurance Cost (₹)"
                name="insurance_cost"
                type="number"
                prefix="₹"
                placeholder="e.g. 30000"
                value={formData.insurance_cost}
                onChange={(v) => set("insurance_cost", v)}
              />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <FormInput
                label="Name of Dealer / Vendor"
                name="dealer_name"
                required
                placeholder="e.g. ABC Motors Pvt. Ltd."
                value={formData.dealer_name}
                onChange={(v) => set("dealer_name", v)}
                error={errors.dealer_name}
              />
            </div>

            <SectionDivider />
            <SectionHeader title="Dealer Address" />
            <div className="grid grid-cols-1 gap-3">
              <FormInput
                label="Address of Dealer"
                name="dealer_address"
                required
                placeholder="Shop No, Street, Area..."
                value={formData.dealer_address}
                onChange={(v) => set("dealer_address", v)}
                error={errors.dealer_address}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormSelect
                label="State"
                name="dealer_state"
                required
                value={formData.dealer_state}
                onChange={(v) => {
                  set("dealer_state", v);
                  set("dealer_district", ""); // Reset district
                }}
                error={errors.dealer_state}
                options={stateOptions}
                onOpen={() => triggerMaster("dealer_state")}
              />
              <FormSelect
                label="District"
                name="dealer_district"
                required
                value={formData.dealer_district}
                onChange={(v) => set("dealer_district", v)}
                error={errors.dealer_district}
                options={districtOptions}
                disabled={!formData.dealer_state}
              />
            </div>

            <SectionDivider />
            <SectionHeader title="LTV Details" />
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Total Quotation/On Road Price of the Vehicle (INR)"
                name="asset_value"
                type="number"
                required
                prefix="Rs."
                placeholder="e.g. 900000"
                value={formData.asset_value}
                onChange={(v) => set("asset_value", v)}
                error={errors.asset_value}
              />
              <FormInput
                label="Own Contribution (Margin) (INR)"
                name="own_contribution"
                type="number"
                readOnly
                prefix="Rs."
                value={ownContribution}
              />
            </div>
          </div>
        )}
        {isHomeJourney && showHomePropertyFields && (
          <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
            <SectionHeader title={homePropertySectionTitle} />

            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1">
              <FormInput
                label="Amount Required"
                name="loan_amount"
                type="number"
                required
                prefix="Rs."
                value={formData.loan_amount}
                onChange={(v) => set("loan_amount", v)}
                error={errors.loan_amount}
              />
              <FormInput
                label="Repayment Period (Mons)"
                name="repayment_period"
                type="number"
                required
                value={formData.repayment_period}
                onChange={(v) => set("repayment_period", v)}
                error={errors.repayment_period}
              />
              <FormInput
                label={homeCostFieldLabel}
                name={homeCostFieldName}
                type="number"
                required
                prefix="Rs."
                value={homeCostFieldValue}
                onChange={(v) => set(homeCostFieldName, v)}
                error={homeCostFieldError}
              />
              <FormInput
                label="Area of Property"
                name="property_area"
                type="number"
                required
                suffix="sq ft"
                value={formData.property_area}
                onChange={(v) => set("property_area", v)}
                error={errors.property_area}
              />
            </div>

            {isHomeResaleScheme && (
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Apprx Market Value of Property"
                  name="market_value"
                  type="number"
                  required
                  prefix="Rs."
                  value={formData.market_value}
                  onChange={(v) => set("market_value", v)}
                  error={errors.market_value}
                />
                <FormInput
                  label="Age of Property"
                  name="age_of_property"
                  type="number"
                  required
                  suffix="yrs"
                  value={formData.age_of_property}
                  onChange={(v) => set("age_of_property", v)}
                  error={errors.age_of_property}
                />
              </div>
            )}

            <FormInput
              label="Address of Property"
              name="property_address"
              required
              value={formData.property_address}
              onChange={(v) => set("property_address", v)}
              error={errors.property_address}
            />
          </div>
        )}

          {/* Live EMI Estimation Hidden
          {emi > 0 && (
            <div className="rounded-xl overflow-hidden border border-[var(--primary,#2e3192)]/20 animate-in fade-in duration-400">
              <div
                className="p-4 text-white"
                style={{ backgroundColor: "var(--primary, #2e3192)" }}
              >
                <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest mb-2">
                  Estimated EMI
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black">
                    ₹{emi.toLocaleString("en-IN")}
                  </span>
                  <span className="text-white/60 text-sm mb-0.5">/month</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-0 bg-blue-50 divide-x divide-blue-200">
                <div className="p-3 text-center">
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">
                    Principal
                  </p>
                  <p className="text-sm font-black text-gray-800">
                    ₹{(loanAmt / 100000).toFixed(1)}L
                  </p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">
                    Rate
                  </p>
                  <p className="text-sm font-black text-gray-800">
                    {rate}% p.a.
                  </p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">
                    Interest
                  </p>
                  <p className="text-sm font-black text-gray-800">
                    ₹{((emi * tenure - loanAmt) / 100000).toFixed(1)}L
                  </p>
                </div>
              </div>
            </div>
          )}
          */}

          <div className="flex gap-4 pt-4">
            <SecondaryButton 
                onClick={prevStep} 
                className="flex-1"
            >
              ← Back
            </SecondaryButton>
            <div className="flex-[2]">
              <PrimaryButton onClick={handleNext} isLoading={isLoading}>
                Calculate Eligibility →
              </PrimaryButton>
            </div>
          </div>
        </div>
      </StepCard>
    );
}

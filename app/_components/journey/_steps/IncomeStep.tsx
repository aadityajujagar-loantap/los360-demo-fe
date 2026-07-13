"use client";

import { usePathname } from 'next/navigation';

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
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
} from "../../../_lib/redux/services/adminApiSlice";
import {
  getOptionalEmailValidationError,
  getOptionalTenDigitPhoneValidationError,
  getIndianMobileValidationError,
  sanitizeMobileNumber,
} from "../../../_lib/validation/mobile";
import {
  calculateAge,
  getAgeValidationError,
} from "../../../_lib/validation/age";
import { getApiErrorMessage, mapBackendFieldErrors } from "../../../_lib/apiErrors";
import { scrollToFirstFieldError } from "../../../_hooks/useScrollToFieldError";
import StepCard from "../StepCard";
import {
  FormInput,
  FormSelect,
  SectionHeader,
  SectionDivider,
  ToggleSwitch,
  PrimaryButton,
  SecondaryButton,
} from "../FormPrimitives";
import CoApplicantForm from "./CoApplicantForm";
const IncomeIcon = () => (
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
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const BriefcaseIcon = () => (
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
      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const PersonIcon = () => (
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
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

function formatMmYyyy(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + "/" + digits.slice(2);
}

function mmYyyyToIsoDate(val?: string): string {
  const match = (val || "").match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
  if (!match) return "";
  const [, month, year] = match;
  return `${year}-${month}-01`;
}

const OCCUPATION_META_KEYS_BY_EMPLOYMENT_TYPE = {
  SELF_EMPLOYED: [
    "01", "07", "08", "09", "11", "12", "21", "22", "23", "24", "25",
    "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36",
    "37", "38", "39", "40", "41", "42", "44", "45", "52", "53", "SCRPD",
    "TECH", "54", "56", "57", "58", "59", "60", "61",
  ],
  SELF_EMPLOYED_PROFESSIONAL: ["ADV", "ARCHT", "CA", "CS", "DR", "ENGG", "ICWA"],
  OTHER: ["19", "46", "55"],
  RETIRED: ["15", "16"],
  SALARIED: ["14"],
  HOUSEWIFE: ["20"],
} as const;

function normalizeMasterMetaKey(value: unknown): string {
  const key = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  return /^\d+$/.test(key) ? key.replace(/^0+(?=\d)/, "") : key;
}

function getMasterMetaKey(item: unknown): string {
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    return normalizeMasterMetaKey(record.meta_key ?? record.value ?? record.id);
  }

  return normalizeMasterMetaKey(item);
}

function filterOccupationTypes(
  items: readonly unknown[],
  employmentType: unknown,
): unknown[] {
  const employmentKey = normalizeMasterMetaKey(employmentType);
  const matchingKeys =
    OCCUPATION_META_KEYS_BY_EMPLOYMENT_TYPE[
      employmentKey as keyof typeof OCCUPATION_META_KEYS_BY_EMPLOYMENT_TYPE
    ];

  if (!matchingKeys) return [];

  const allowedKeys = new Set(matchingKeys.map(normalizeMasterMetaKey));
  return items.filter((item) => allowedKeys.has(getMasterMetaKey(item)));
}

function calculateRetirementAge(
  totalWorkExperience: unknown,
  remainingWorkingYears: unknown,
): string {
  if (
    totalWorkExperience === undefined ||
    totalWorkExperience === "" ||
    remainingWorkingYears === undefined ||
    remainingWorkingYears === ""
  ) {
    return "";
  }

  const totalExperience = Number(totalWorkExperience);
  const remainingYears = Number(remainingWorkingYears);
  if (!Number.isFinite(totalExperience) || !Number.isFinite(remainingYears)) {
    return "";
  }

  return String(totalExperience + remainingYears);
}

const showValidationToast = (
  errors: Record<string, string>,
  fallback: string,
) => {
  const specificMessage = Object.values(errors).find(
    (message) => message && message !== "Required",
  );
  toast.error(specificMessage || fallback, { position: "top-left" });
};

const showBackendValidationToast = (
  err: unknown,
  errors: Record<string, string>,
  fallback: string,
) => {
  const specificMessage = Object.values(errors).find(
    (message) => message && message !== "Required",
  );
  toast.error(specificMessage || getApiErrorMessage(err, undefined, fallback), {
    position: "top-left",
  });
};

export default function IncomeStep() {
  const pathname = usePathname() || "";
  const dispatch = useAppDispatch();
  const { config, formData, currentStepIndex, completedStepIndices, currentSubStepKey } =
    useAppSelector((state) => state.journey);

  const updateFormData = (data: any) => dispatch(updateFormDataAction(data));
  const nextStep = () => dispatch(nextStepAction());
  const prevStep = () => dispatch(prevStepAction());
  const markStepComplete = (index: number) =>
    dispatch(markStepCompleteAction(index));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [subStep, setSubStep] = useState<
    "occupation" | "income" | "coapplicant"
  >("occupation");
  const [isLoading, setIsLoading] = useState(false);
  const [processJourneyStep] = useProcessJourneyStepMutation();
  const [activatedMasters, setActivatedMasters] = useState<Record<string, boolean>>({});
  const [expandedIndices, setExpandedIndices] = useState<number[]>([0]);
  const isServiceOccupation =
    String(formData.occupation ?? "").toLowerCase() === "service";

  const toggleExpand = (index: number) => {
    setExpandedIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const triggerMaster = (key: string) => {
    if (!activatedMasters[key]) {
      setActivatedMasters((prev) => ({ ...prev, [key]: true }));
    }
  };

  useEffect(() => {
    if (currentSubStepKey === "personal_detail") {
      setSubStep("occupation");
    } else if (currentSubStepKey === "orgnization_details") {
      setSubStep("occupation");
    } else if (currentSubStepKey === "income_details") {
      setSubStep("income");
    } else if (currentSubStepKey === "coapp_information") {
      setSubStep("coapplicant");
    }
  }, [currentSubStepKey]);

  const { data: educationData = [] } = useGetPublicMasterValuesQuery(
    "education",
    { skip: (!activatedMasters["education"] && !formData.education) || subStep === "income" },
  );
  const { data: occupationData = [] } = useGetPublicMasterValuesQuery(
    "occupation",
    { skip: (!activatedMasters["occupation"] && !formData.occupation) || subStep === "income" },
  );
  const { data: employmentTypeData = [] } = useGetPublicMasterValuesQuery(
    "employment_type",
    {
      skip:
        (!activatedMasters["employment_type"] && !formData.employment_type) ||
        !isServiceOccupation ||
        subStep !== "occupation",
    },
  );
  const {
    data: occupationTypeData = [],
    isFetching: isFetchingOccupationTypes,
    isError: hasOccupationTypeFetchError,
    isSuccess: hasLoadedOccupationTypes,
    refetch: refetchOccupationTypes,
  } = useGetPublicMasterValuesQuery("occupation_type", {
    skip:
      !isServiceOccupation ||
      !formData.employment_type ||
      subStep !== "occupation",
  });
  const { data: relationshipData = [] } = useGetPublicMasterValuesQuery(
    "relationship_with_applicant",
    { skip: (!activatedMasters["relationship"] && !formData.co_relationship) || subStep !== "coapplicant" },
  );
  const { data: genderData = [] } = useGetPublicMasterValuesQuery("gender", {
    skip: (!activatedMasters["gender"] && !formData.co_gender) || subStep === "income",
  });
  const { data: orgNatureData = [] } = useGetPublicMasterValuesQuery(
    "nature_of_organization",
    { skip: (!activatedMasters["org_nature"] && !formData.org_nature && !formData.co_org_nature) || subStep === "income" },
  );
  const { data: businessNatureData = [] } = useGetPublicMasterValuesQuery(
    "business_nature",
    { skip: (!activatedMasters["business_nature"] && !formData.business_nature && !formData.co_business_nature) || subStep === "income" },
  );
  const { data: professionData = [] } = useGetPublicMasterValuesQuery(
    "profession",
    { skip: (!activatedMasters["profession"] && !formData.profession && !formData.co_profession) || subStep === "income" },
  );

  const mapToOptions = (data: unknown[]) =>
    data.map((item) => {
      if (typeof item === "string") return { label: item, value: item };
      if (!item || typeof item !== "object") {
        const value = String(item ?? "");
        return { label: value, value };
      }
      const record = item as Record<string, unknown>;
      return {
        label: String(
          record.meta_value ||
          record.name ||
          record.label ||
          record.value ||
          record.id ||
          "",
        ),
        value: String(
          record.meta_key || record.id || record.value || record.name || "",
        ),
      };
    });

  const educationOptions = mapToOptions(educationData);
  const occupationOptions = mapToOptions(occupationData);
  const employmentTypeOptions = mapToOptions(employmentTypeData);
  const occupationTypeOptions = mapToOptions(
    filterOccupationTypes(occupationTypeData, formData.employment_type),
  );
  const relationshipOptions = mapToOptions(relationshipData);
  const genderOptions = mapToOptions(genderData);
  const orgNatureOptions = mapToOptions(orgNatureData);
  const businessNatureOptions = mapToOptions(businessNatureData);
  const professionOptions = mapToOptions(professionData);

  const set = (key: string, val: any) => {
    updateFormData({ [key]: val });
    setErrors((p) => {
      const e = { ...p };
      delete e[key];
      if (key === "office_phone") delete e.work_phone;
      if (key === "work_phone") delete e.office_phone;
      if (key === "business_since") delete e.business_since_date;
      return e;
    });
  };

  const setOccupation = (value: string) => {
    const isNextServiceOccupation = value.toLowerCase() === "service";
    const didChange =
      String(formData.occupation ?? "").toLowerCase() !==
      value.toLowerCase();
    updateFormData({
      occupation: value,
      ...(didChange || !isNextServiceOccupation
        ? { employment_type: "", occupation_type: "" }
        : {}),
    });
    setErrors((previous) => {
      const next = { ...previous };
      delete next.occupation;
      if (didChange || !isNextServiceOccupation) {
        delete next.employment_type;
        delete next.occupation_type;
      }
      return next;
    });
  };

  const setEmploymentType = (value: string) => {
    const didChange =
      normalizeMasterMetaKey(formData.employment_type) !==
      normalizeMasterMetaKey(value);

    updateFormData({
      employment_type: value,
      ...(didChange ? { occupation_type: "" } : {}),
    });
    setErrors((previous) => {
      const next = { ...previous };
      delete next.employment_type;
      if (didChange) delete next.occupation_type;
      return next;
    });
  };

  const hasCoApplicant = formData.has_co_applicant === "yes";
  const coApplicants = formData.coapplicants || [];
  const maxCoApps = config?.maxCoApplicants || 5;
  const coOccupation = (i: number) => coApplicants[i]?.occupation?.toLowerCase();
  const occupation = formData.occupation?.toLowerCase();
  const retirementAge = calculateRetirementAge(
    formData.work_exp,
    formData.service_remaining,
  );

  const setCoApp = (index: number, key: string | Record<string, any>, val?: any) => {
    const updates = typeof key === "string" ? { [key]: val } : key;
    const newCoApps = [...coApplicants];
    if (!newCoApps[index]) newCoApps[index] = {};
    newCoApps[index] = { ...newCoApps[index], ...updates };
    updateFormData({ coapplicants: newCoApps });
    setErrors((p) => {
      const e = { ...p };
      const aliases: Record<string, string[]> = {
        avg_monthly_income: ["income"],
        monthly_deduction: ["deduction"],
        existing_monthly_obligations: ["obligations"],
        employer_name: ["org_name"],
        nature_of_org: ["org_nature"],
        total_work_exp: ["work_exp"],
      };
      Object.keys(updates).forEach((updatedKey) => {
        [`co_${index}_${updatedKey}`, ...(aliases[updatedKey] || []).map((k) => `co_${index}_${k}`)].forEach(
          (errorKey) => {
            delete e[errorKey];
          },
        );
        if (updatedKey === "business_since") delete e[`co_${index}_business_since_date`];
      });
      return e;
    });
  };

  const addCoApplicant = () => {
    if (coApplicants.length > 0 && !validateCoApplicant()) {
      // Expand all co-applicants that have errors
      const newExpanded = [...expandedIndices];
      coApplicants.forEach((_: any, i: number) => {
        const hasError = Object.keys(errors).some(k => k.startsWith(`co_${i}_`));
        if (hasError && !newExpanded.includes(i)) newExpanded.push(i);
      });
      setExpandedIndices(newExpanded);
      return;
    }
    
    if (coApplicants.length < maxCoApps) {
      const nextIdx = coApplicants.length;
      updateFormData({ coapplicants: [...coApplicants, {}] });
      setExpandedIndices([nextIdx]); // Open the new one, close others for focus
    }
  };

  const removeCoApplicant = (index: number) => {
    const newCoApps = coApplicants.filter((_: any, i: number) => i !== index);
    updateFormData({ 
      coapplicants: newCoApps,
      has_co_applicant: newCoApps.length > 0 ? "yes" : "no" 
    });
  };

  const validateOccupation = () => {
    const e: Record<string, string> = {};
    if (!formData.occupation) e.occupation = "Required";
    if (!formData.education) e.education = "Required";
    if (config?.type === "education" && !formData.current_qualification) {
      e.current_qualification = "Required";
    }
    if (occupation === "service") {
      if (!formData.employment_type) e.employment_type = "Required";
      if (!formData.occupation_type) {
        e.occupation_type = "Required";
      } else if (formData.employment_type) {
        const isAllowedOccupationType = occupationTypeOptions.some(
          (option) =>
            normalizeMasterMetaKey(option.value) ===
            normalizeMasterMetaKey(formData.occupation_type),
        );

        if (isFetchingOccupationTypes) {
          e.occupation_type = "Please wait while occupation types load.";
        } else if (hasOccupationTypeFetchError) {
          e.occupation_type = "Unable to load occupation types. Please retry.";
        } else if (!hasLoadedOccupationTypes || !isAllowedOccupationType) {
          e.occupation_type = "Select an occupation type applicable to the employment type.";
        }
      }
      if (!formData.employer_name) e.employer_name = "Required";
      if (!formData.org_nature) e.org_nature = "Required";
      if (!formData.work_exp) e.work_exp = "Required";
      if (!formData.service_remaining) e.service_remaining = "Required";
      if (!formData.org_address) e.org_address = "Required";
      const workEmailError = getOptionalEmailValidationError(
        formData.work_email,
        "Work email must be valid.",
      );
      if (workEmailError) e.work_email = workEmailError;
      if (!formData.office_phone) {
        e.office_phone = "Required";
      } else {
        const workPhoneError = getOptionalTenDigitPhoneValidationError(
          formData.office_phone,
          "Work phone must be 10 digits.",
        );
        if (workPhoneError) e.office_phone = workPhoneError;
      }
    } else if (occupation === "business") {
      if (!formData.org_name) e.org_name = "Required";
      if (!formData.org_nature) e.org_nature = "Required";
      if (!formData.business_nature) e.business_nature = "Required";
      if (!formData.business_since) e.business_since = "Required";
      else if (!mmYyyyToIsoDate(formData.business_since))
        e.business_since = "Use MM/YYYY";
      if (!formData.org_address) e.org_address = "Required";
      const businessEmailError = getOptionalEmailValidationError(
        formData.business_email,
        "Business email must be valid.",
      );
      if (businessEmailError) e.business_email = businessEmailError;
    } else if (
      occupation === "professional" ||
      occupation === "self_employed"
    ) {
      if (!formData.profession) e.profession = "Required";
      if (!formData.org_nature) e.org_nature = "Required";
      if (!formData.org_name) e.org_name = "Required";
      if (!formData.business_since) e.business_since = "Required";
      else if (!mmYyyyToIsoDate(formData.business_since))
        e.business_since = "Use MM/YYYY";
      if (!formData.org_address) e.org_address = "Required";
      const businessEmailError = getOptionalEmailValidationError(
        formData.business_email,
        "Business email must be valid.",
      );
      if (businessEmailError) e.business_email = businessEmailError;
    } else if (occupation === "student") {
      if (!formData.institute_name) e.institute_name = "Required";
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      scrollToFirstFieldError();
      showValidationToast(e, "Please fill all the required fields");
      return false;
    }
    return true;
  };

  const validateCoApplicant = () => {
    if (!hasCoApplicant) return true;
    const e: Record<string, string> = {};
    
    if (coApplicants.length === 0) {
      e.has_co_applicant = "Please add at least one co-applicant";
    }

    coApplicants.forEach((co: any, i: number) => {
      if (!co.title) e[`co_${i}_title`] = "Required";
      if (!co.first_name) e[`co_${i}_first_name`] = "Required";
      if (!co.last_name) e[`co_${i}_last_name`] = "Required";
      if (!co.email) e[`co_${i}_email`] = "Required";
      else if (getOptionalEmailValidationError(co.email))
        e[`co_${i}_email`] = "Enter a valid email address";
      const mobileError = getIndianMobileValidationError(co.phone, "Required");
      if (mobileError) e[`co_${i}_phone`] = mobileError;
      if (!co.relationship) e[`co_${i}_relationship`] = "Required";
      if (!co.marital_status) e[`co_${i}_marital_status`] = "Required";
      const coPan = co.pan || co.pan_number || co.pan_no || formData.pan;
      if (!coPan) e[`co_${i}_pan`] = "Required";
      const ageError = getAgeValidationError(co.dob, "Co-applicant");
      if (ageError) e[`co_${i}_dob`] = ageError;
      if (!co.perm_addr_line1) e[`co_${i}_perm_addr_line1`] = "Required";
      if (!co.perm_addr_line2) e[`co_${i}_perm_addr_line2`] = "Required";
      if (!co.perm_state) e[`co_${i}_perm_state`] = "Required";
      if (!(co.perm_district || co.perm_city)) e[`co_${i}_perm_district`] = "Required";
      if (!co.perm_pincode) e[`co_${i}_perm_pincode`] = "Required";
      if (!co.perm_ownership) e[`co_${i}_perm_ownership`] = "Required";
      if (co.same_address !== "yes") {
        if (!co.pres_addr_line1) e[`co_${i}_pres_addr_line1`] = "Required";
        if (!co.pres_addr_line2) e[`co_${i}_pres_addr_line2`] = "Required";
        if (!co.pres_state) e[`co_${i}_pres_state`] = "Required";
        if (!(co.pres_district || co.pres_city)) e[`co_${i}_pres_district`] = "Required";
        if (!co.pres_pincode) e[`co_${i}_pres_pincode`] = "Required";
        if (!co.pres_ownership) e[`co_${i}_pres_ownership`] = "Required";
      }
      if (!co.avg_monthly_income) e[`co_${i}_income`] = "Required";
      if (!co.monthly_deduction) e[`co_${i}_deduction`] = "Required";
      if (!co.existing_monthly_obligations) e[`co_${i}_obligations`] = "Required";
      if (!co.education) e[`co_${i}_education`] = "Required";
      if (!co.occupation) e[`co_${i}_occupation`] = "Required";

      const occ = co.occupation?.toLowerCase();
      if (occ === "service") {
        if (!co.employer_name) e[`co_${i}_org_name`] = "Required";
        if (!co.nature_of_org) e[`co_${i}_org_nature`] = "Required";
        if (!co.total_work_exp) e[`co_${i}_work_exp`] = "Required";
        if (!co.service_remaining) e[`co_${i}_service_remaining`] = "Required";
        if (!co.org_address) e[`co_${i}_org_address`] = "Required";
      } else if (occ === "business" || occ === "self_employed" || occ === "professional") {
        if (!co.employer_name) e[`co_${i}_org_name`] = "Required";
        if (!co.nature_of_org) e[`co_${i}_org_nature`] = "Required";
        if (!co.org_address) e[`co_${i}_org_address`] = "Required";
        if (!co.business_nature && occ === "business") e[`co_${i}_business_nature`] = "Required";
        if (!co.profession && (occ === "professional" || occ === "self_employed")) e[`co_${i}_profession`] = "Required";
        if (!co.business_since) e[`co_${i}_business_since`] = "Required";
        else if (!mmYyyyToIsoDate(co.business_since))
          e[`co_${i}_business_since`] = "Use MM/YYYY";
      }
      const coBusinessEmailError = getOptionalEmailValidationError(
        co.business_email,
        "Business email must be valid.",
      );
      if (coBusinessEmailError) e[`co_${i}_business_email`] = coBusinessEmailError;
    });

    setErrors(e);
    if (Object.keys(e).length > 0) {
      scrollToFirstFieldError();
      showValidationToast(e, "Please fill all the required fields");
      return false;
    }
    return true;
  };

  const validateIncome = () => {
    const e: Record<string, string> = {};
    if (!formData.monthly_income) e.monthly_income = "Required";
    if (!formData.monthly_deduction) e.monthly_deduction = "Required";
    if (!formData.existing_obligations) e.existing_obligations = "Required";
    if (formData.tc_accepted !== "yes")
      e.tc_accepted = "You must agree to the Terms & Conditions";

    setErrors(e);
    if (Object.keys(e).length > 0) {
      scrollToFirstFieldError();
      showValidationToast(e, "Please fill all the required fields and accept terms");
      return false;
    }
    return true;
  };

  const getLoanType = () => {
    if (pathname.includes("home-loan")) return "HOME_LOAN";
    if (pathname.includes("vehicle-loan")) return "VEHICLE_LOAN";
    if (pathname.includes("property-loan") || pathname.includes("property-mortgage")) return "PROPERTY_MORTGAGE_LOAN";
    if (pathname.includes("education-loan")) return "EDUCATION_LOAN";
    if (pathname.includes("personal-loan")) return "PERSONAL_LOAN";
    if (config?.type === "home") return "HOME_LOAN";
    if (config?.type === "vehicle") return "VEHICLE_LOAN";
    if (config?.type === "property-mortgage") return "PROPERTY_MORTGAGE_LOAN";
    if (config?.type === "education") return "EDUCATION_LOAN";
    return "PERSONAL_LOAN";
  };

  const handleNext = async () => {
    const backendTenantId = config?.backendTenantId || "";
    const loanType = getLoanType();
    const isStepCompleted = completedStepIndices.includes(currentStepIndex);

    if (subStep === "occupation") {
      if (!validateOccupation()) return;
      setIsLoading(true);
      try {
        await processJourneyStep({
          tenantId: backendTenantId,
          suppressErrorToast: true,
          data: {
            step_key: "OCCUPATION_DETAILS",
            loan_type: loanType,
            payload: {
              application_id: formData.application_id,
              section_id: "orgnization_details",
              educational_qualification: formData.education,
              occupation: formData.occupation,
              employment_type: isServiceOccupation ? formData.employment_type : "",
              occupation_type: isServiceOccupation ? formData.occupation_type : "",
              employer_name: formData.employer_name,
              nature_of_org: formData.org_nature,
              work_email: formData.work_email || undefined,
              work_phone: formData.office_phone,
              total_work_exp: formData.work_exp,
              remaining_service_period: formData.service_remaining,
              retirement_age: retirementAge || undefined,
              designation: formData.designation,
              org_address: formData.org_address,
              business_email: formData.business_email || undefined,
              business_nature: formData.business_nature,
              org_name: formData.org_name,
              business_since: formData.business_since,
              business_since_date:
                mmYyyyToIsoDate(formData.business_since) || undefined,
              profession: formData.profession,
            },
          },
        }).unwrap();
        setSubStep("income");
      } catch (err: any) {
        console.error("Failed Occupation phase", err);
        const backendErrors = mapBackendFieldErrors(err, {
          age: "service_remaining",
          max_working_age: "service_remaining",
          retirement_age: "service_remaining",
        });
        if (Object.keys(backendErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...backendErrors }));
          scrollToFirstFieldError();
        }
        showBackendValidationToast(
          Object.keys(backendErrors).length > 0 ? err : undefined,
          backendErrors,
          "Could not save qualification details. Please check the highlighted fields.",
        );
      } finally {
        setIsLoading(false);
      }
    } else if (subStep === "income") {
      if (!validateIncome()) return;
      if (isStepCompleted) {
        setSubStep("coapplicant");
        return;
      }
      setIsLoading(true);
      try {
        const stepConfig = config?.steps[currentStepIndex];
        const currentSubStepKey =
          stepConfig?.subSteps?.income?.stepKey || "INCOME_DETAILS";

        await processJourneyStep({
          tenantId: backendTenantId,
          data: {
            step_key: currentSubStepKey,
            loan_type: loanType,
            payload: {
              ...formData,
              application_id: formData.application_id,
              section_id: "income_assessment",
              avg_monthly_income: Number(formData.monthly_income || 0),
              monthly_deduction: Number(formData.monthly_deduction || 0),
              existing_monthly_obligations: Number(
                formData.existing_obligations || 0,
              ),
              total_monthly_income:
                Number(formData.monthly_income || 0) -
                Number(formData.monthly_deduction || 0) -
                Number(formData.existing_obligations || 0),
              income_assessment_consent: formData.tc_accepted === "yes",
            },
          },
        }).unwrap();
        setSubStep("coapplicant");
      } catch (err: any) {
        console.error("Failed Income phase", err);
        const backendErrors = mapBackendFieldErrors(err);
        if (Object.keys(backendErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...backendErrors }));
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!validateCoApplicant()) return;
      if (isStepCompleted) {
        nextStep();
        return;
      }
      setIsLoading(true);
      try {
        const stepConfig = config?.steps[currentStepIndex];
        const currentSubStepKey =
          stepConfig?.subSteps?.coapplicant?.stepKey || "COAPP_DETAILS";

        let coapplicantsInfo: any[] = [];
        if (hasCoApplicant) {
          coapplicantsInfo = coApplicants.map((co: any) => {
            const coPan = co.pan || co.pan_number || co.pan_no || formData.pan || "";
            const coAge = calculateAge(co.dob);

            return {
            applicant_type: "co-applicant",
            title: co.title || "",
            first_name: co.first_name || "",
            middle_name: co.middle_name || "",
            last_name: co.last_name || "",
            relationship: co.relationship || "",
            pan: coPan,
            pan_number: coPan,
            dob: co.dob || "",
            date_of_birth: co.dob || "",
            dob_in_months: coAge !== null ? coAge * 12 : null,
            email_id: co.email || co.email_id || "",
            phone: sanitizeMobileNumber(co.phone || ""),
            gender:
              co.gender === "male"
                ? "M"
                : co.gender === "female"
                  ? "F"
                  : "O",
            marital_status: co.marital_status || "",
            no_of_dependents: co.dependents || "0",
            religion: co.religion || "",
            category: co.category || "",

            perm_addr_1: co.perm_addr_line1 || "",
            perm_addr_2: co.perm_addr_line2 || "",
            perm_addr_3: co.perm_addr_line3 || "",
            perm_city: co.perm_district || co.perm_city || "",
            perm_pincode: co.perm_pincode || "",
            perm_state: co.perm_state || "",
            perm_country: co.perm_country || "India",
            perm_residence_ownership: co.perm_ownership || "",

            curr_addr_1: co.same_address === "yes" ? co.perm_addr_line1 : co.pres_addr_line1 || "",
            curr_address_2: co.same_address === "yes" ? co.perm_addr_line2 : co.pres_addr_line2 || "",
            curr_addr_3: co.same_address === "yes" ? co.perm_addr_line3 || "" : co.pres_addr_line3 || "",
            curr_city: co.same_address === "yes" ? co.perm_district || co.perm_city : co.pres_district || co.pres_city || "",
            curr_pincode: co.same_address === "yes" ? co.perm_pincode : co.pres_pincode || "",
            curr_state: co.same_address === "yes" ? co.perm_state : co.pres_state || "",
            curr_country: co.same_address === "yes" ? co.perm_country || "India" : co.pres_country || "India",
            curr_residence_ownership: co.same_address === "yes" ? co.perm_ownership : co.pres_ownership || "",

            avg_monthly_income: Number(co.avg_monthly_income || 0),
            monthly_deduction: Number(co.monthly_deduction || 0),
            existing_monthly_obligations: Number(co.existing_monthly_obligations || 0),
            total_monthly_income:
              Number(co.avg_monthly_income || 0) -
              Number(co.monthly_deduction || 0) -
              Number(co.existing_monthly_obligations || 0),
            equifax_payload: {},
            educational_qualification: co.education || co.educational_qualification || "",
            occupation: co.occupation || "",
            employer_name: co.employer_name || "",
            designation: co.designation || "",
            nature_of_org: co.nature_of_org || "",
            org_address: co.org_address || "",
            work_email: co.business_email || co.work_email || undefined,
            work_phone: co.work_phone || undefined,
            total_work_exp: Number(co.total_work_exp || 0),
            business_nature: co.business_nature || "",
            business_since: co.business_since || "",
            business_since_date: mmYyyyToIsoDate(co.business_since) || undefined,
            profession: co.profession || "",
            remaining_service_period: co.service_remaining || "",
            };
          });
        }

        await processJourneyStep({
          tenantId: backendTenantId,
          data: {
            step_key: currentSubStepKey,
            loan_type: loanType,
            payload: {
              application_id: formData.application_id,
              section_id: "coapp_information",
              coapplicants: coapplicantsInfo,
            },
          },
        }).unwrap();
        markStepComplete(currentStepIndex);
        nextStep();
      } catch (err: any) {
        console.error("Failed Co-Applicant phase", err);
        const backendErrors = mapBackendFieldErrors(err);
        if (Object.keys(backendErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...backendErrors }));
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const income = parseFloat(formData.monthly_income || "0");
  const deduction = parseFloat(formData.monthly_deduction || "0");
  const obligations = parseFloat(formData.existing_obligations || "0");
  const netTakeHome = income - deduction - obligations;

  if (subStep === "occupation") {
    return (
      <StepCard
        title="Occupation Details"
        subtitle="Your current employment and organizational information"
        icon={<BriefcaseIcon />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 md:gap-3">
            <FormSelect
              label="Education"
              name="education"
              required
              value={formData.education}
              onChange={(v) => set("education", v)}
              error={errors.education}
              options={educationOptions.length > 0 ? educationOptions : []}
              onOpen={() => triggerMaster("education")}
            />
            <FormSelect
              label="Occupation"
              name="occupation"
              required
              value={formData.occupation}
              onChange={setOccupation}
              error={errors.occupation}
              options={occupationOptions}
              onOpen={() => triggerMaster("occupation")}
            />
          </div>
          {isServiceOccupation && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 md:gap-3">
              <FormSelect
                label="Employment Type"
                name="employment_type"
                required
                value={formData.employment_type}
                onChange={setEmploymentType}
                error={errors.employment_type}
                options={employmentTypeOptions}
                onOpen={() => triggerMaster("employment_type")}
              />
              <FormSelect
                label="Occupation Type"
                name="occupation_type"
                required
                value={formData.occupation_type}
                onChange={(v) => set("occupation_type", v)}
                error={errors.occupation_type}
                options={occupationTypeOptions}
                placeholder={
                  !formData.employment_type
                    ? "Select employment type first"
                    : isFetchingOccupationTypes
                      ? "Loading occupation types..."
                      : "Select an option"
                }
                disabled={
                  !formData.employment_type ||
                  isFetchingOccupationTypes
                }
                onOpen={() => {
                  if (hasOccupationTypeFetchError) {
                    void refetchOccupationTypes();
                  }
                }}
              />
            </div>
          )}

          {config?.type === "education" && (
            <div className="animate-in slide-in-from-top-2">
              <FormInput
                label="Current Qualification"
                name="current_qualification"
                required
                value={formData.current_qualification}
                onChange={(v) => set("current_qualification", v)}
                error={errors.current_qualification}
                placeholder="e.g. B.Tech Graduate, HSC, etc."
              />
            </div>
          )}

          {occupation === "service" && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in slide-in-from-top-2 duration-300">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                Employment Details
              </p>
              <FormInput
                label="Employer Name"
                name="employer_name"
                required
                value={formData.employer_name}
                onChange={(v) => set("employer_name", v)}
                error={errors.employer_name}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 md:gap-3">
                <FormSelect
                  label="Nature of Organisation"
                  name="org_nature"
                  required
                  value={formData.org_nature}
                  onChange={(v) => set("org_nature", v)}
                  error={errors.org_nature}
                  options={orgNatureOptions}
                  onOpen={() => triggerMaster("org_nature")}
                />
                <FormInput
                  label="Designation"
                  name="designation"
                  value={formData.designation}
                  onChange={(v) => set("designation", v)}
                  error={errors.designation}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 md:gap-3">
                <FormInput
                  label="Work Email"
                  name="work_email"
                  type="email"
                  value={formData.work_email}
                  onChange={(v) => set("work_email", v)}
                  error={errors.work_email}
                />
                <FormInput
                  label="Office Phone"
                  name="office_phone"
                  type="tel"
                  required
                  value={formData.office_phone}
                  onChange={(v) => set("office_phone", sanitizeMobileNumber(v))}
                  error={errors.office_phone || errors.work_phone}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 md:gap-3">
                <FormInput
                  label="Total Experience (yrs)"
                  name="work_exp"
                  type="number"
                  required
                  value={formData.work_exp}
                  onChange={(v) => set("work_exp", v)}
                  error={errors.work_exp || errors.total_work_exp}
                />
                <FormInput
                  label="Remaining Service (yrs)"
                  name="service_remaining"
                  type="number"
                  required
                  value={formData.service_remaining}
                  onChange={(v) => set("service_remaining", v)}
                  error={
                    errors.service_remaining || errors.remaining_service_period
                  }
                />
                <FormInput
                  label="Retirement Age (yrs)"
                  name="retirement_age"
                  type="number"
                  readOnly
                  value={retirementAge}
                />
              </div>
              <FormInput
                label="Organisation Address"
                name="org_address"
                required
                value={formData.org_address}
                onChange={(v) => set("org_address", v)}
                error={errors.org_address}
              />
            </div>
          )}

          {occupation === "business" && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in slide-in-from-top-2 duration-300">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                Business Details
              </p>
              <FormInput
                label="Organisation Name"
                name="org_name"
                required
                value={formData.org_name}
                onChange={(v) => set("org_name", v)}
                error={errors.org_name}
              />
              <FormInput
                label="Business Email"
                name="business_email"
                type="email"
                value={formData.business_email}
                onChange={(v) => set("business_email", v)}
                error={errors.business_email}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormSelect
                  label="Nature of Organisation"
                  name="org_nature"
                  required
                  value={formData.org_nature}
                  onChange={(v) => set("org_nature", v)}
                  error={errors.org_nature}
                  options={orgNatureOptions}
                  onOpen={() => triggerMaster("org_nature")}
                />
                <FormSelect
                  label="Nature of Business"
                  name="business_nature"
                  required
                  value={formData.business_nature}
                  onChange={(v) => set("business_nature", v)}
                  error={errors.business_nature}
                  options={
                    businessNatureOptions.length > 0
                      ? businessNatureOptions
                      : [
                          { label: "Manufacturing", value: "mfg" },
                          { label: "Trading", value: "trading" },
                          { label: "Services", value: "services" },
                          { label: "Agriculture", value: "agri" },
                        ]
                  }
                  onOpen={() => triggerMaster("business_nature")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Business Since (MM/YYYY)"
                  name="business_since"
                  required
                  placeholder="MM/YYYY"
                  value={formData.business_since}
                  onChange={(v) => set("business_since", formatMmYyyy(v))}
                  error={errors.business_since || errors.business_since_date}
                />
              </div>
              <FormInput
                label="Organisation Address"
                name="org_address"
                required
                value={formData.org_address}
                onChange={(v) => set("org_address", v)}
                error={errors.org_address}
              />
            </div>
          )}

          {(occupation === "self_employed" ||
            occupation === "professional") && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in slide-in-from-top-2 duration-300">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                Professional Details
              </p>
              <FormSelect
                label="Profession / Expertise"
                name="profession"
                required
                value={formData.profession}
                onChange={(v) => set("profession", v)}
                error={errors.profession}
                options={professionOptions}
                onOpen={() => triggerMaster("profession")}
              />
              <FormInput
                label="Organisation Name"
                name="org_name"
                required
                value={formData.org_name}
                onChange={(v) => set("org_name", v)}
                error={errors.org_name}
              />
              <FormInput
                label="Business Email"
                name="business_email"
                type="email"
                value={formData.business_email}
                onChange={(v) => set("business_email", v)}
                error={errors.business_email}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormSelect
                  label="Nature of Organisation"
                  name="org_nature"
                  required
                  value={formData.org_nature}
                  onChange={(v) => set("org_nature", v)}
                  error={errors.org_nature}
                  options={orgNatureOptions}
                  onOpen={() => triggerMaster("org_nature")}
                />
                <FormInput
                  label="Business Since (MM/YYYY)"
                  name="business_since"
                  required
                  placeholder="MM/YYYY"
                  value={formData.business_since}
                  onChange={(v) => set("business_since", formatMmYyyy(v))}
                  error={errors.business_since || errors.business_since_date}
                />
              </div>
              <FormInput
                label="Organisation Address"
                name="org_address"
                required
                value={formData.org_address}
                onChange={(v) => set("org_address", v)}
                error={errors.org_address}
              />
            </div>
          )}

          {occupation === "student" && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in slide-in-from-top-2 duration-300">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                Institute Details
              </p>
              <FormInput
                label="Institution Name"
                name="institute_name"
                required
                value={formData.institute_name}
                onChange={(v) => set("institute_name", v)}
                error={errors.institute_name}
              />
              <FormInput
                label="Student ID / Roll No"
                name="student_id"
                value={formData.student_id}
                onChange={(v) => set("student_id", v)}
              />
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <SecondaryButton onClick={prevStep} className="flex-1">
              ← Back
            </SecondaryButton>
            <div className="flex-[2]">
              <PrimaryButton onClick={handleNext} isLoading={isLoading}>
                Save Details →
              </PrimaryButton>
            </div>
          </div>
        </div>
      </StepCard>
    );
  }

  if (subStep === "income") {
    return (
      <StepCard
        title="Income Details"
        subtitle="Your monthly earnings and financial commitments"
        icon={<IncomeIcon />}
      >
        <div className="space-y-4">
          <SectionHeader title="Monthly Financials" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 md:gap-3">
            <FormInput
              label="Avg Monthly Income (₹)"
              name="monthly_income"
              type="number"
              required
              value={formData.monthly_income}
              onChange={(v) => set("monthly_income", v)}
              error={errors.monthly_income}
              prefix="₹"
            />
            <FormInput
              label="Monthly Deductions (₹)"
              name="monthly_deduction"
              type="number"
              required
              value={formData.monthly_deduction}
              onChange={(v) => set("monthly_deduction", v)}
              error={errors.monthly_deduction}
              prefix="₹"
            />
            <FormInput
              label="Existing Obligations (₹)"
              name="existing_obligations"
              type="number"
              required
              value={formData.existing_obligations}
              onChange={(v) => set("existing_obligations", v)}
              error={errors.existing_obligations}
              prefix="₹"
            />
          </div>

          {income > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg animate-in fade-in duration-300">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                Estimated Net Take-Home
              </p>
              <div className="flex items-end gap-1.5">
                <span
                  className={`text-2xl font-black ${netTakeHome < 0 ? "text-red-500" : "text-[var(--accent,#2e3192)]"}`}
                >
                  ₹{Math.abs(netTakeHome).toLocaleString("en-IN")}
                </span>
                <span className="text-gray-500 text-sm mb-0.5">/month</span>
              </div>
            </div>
          )}

          <SectionDivider />

          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${errors.tc_accepted ? "bg-red-50 border-red-300" : "bg-gray-50 border-gray-200 hover:border-gray-300"}`}
          >
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={formData.tc_accepted === "yes"}
                onChange={(e) =>
                  set("tc_accepted", e.target.checked ? "yes" : "")
                }
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${formData.tc_accepted === "yes" ? "border-[var(--accent,#2e3192)] bg-[var(--accent,#2e3192)]" : "border-gray-400 bg-white"}`}
              >
                {formData.tc_accepted === "yes" && (
                  <svg
                    className="w-2.5 h-2.5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-600 leading-relaxed">
              I have read and agree to the{" "}
              <span className="text-[var(--accent,#2e3192)] font-semibold underline">
                Terms & Conditions
              </span>{" "}
              and authorize {config?.name ?? "the bank"} to process my loan application.
            </span>
          </label>
          {errors.tc_accepted && (
            <p className="text-red-500 text-[11px] font-medium">
              {errors.tc_accepted}
            </p>
          )}

          <div className="flex gap-4 pt-4">
            <SecondaryButton onClick={() => setSubStep("occupation")} className="flex-1">
              ← Back
            </SecondaryButton>
            <div className="flex-[2]">
              <PrimaryButton onClick={handleNext} isLoading={isLoading}>
                Save & Continue →
              </PrimaryButton>
            </div>
          </div>
        </div>
      </StepCard>
    );
  }

  return (
    <StepCard
      title="Co-Applicant Information"
      subtitle="Details of secondary applicant (if any)"
      icon={<PersonIcon />}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-sm font-semibold text-gray-700">
            Add Co-Applicant(s)?
          </span>
          <ToggleSwitch
            value={hasCoApplicant}
            onChange={(v) => {
              const newValue = v ? "yes" : "no";
              set("has_co_applicant", newValue);
              if (v && coApplicants.length === 0) {
                updateFormData({ coapplicants: [{}] });
              }
            }}
          />
        </div>

        {hasCoApplicant && (
          <div className="space-y-4">
            {coApplicants.map((co: any, i: number) => {
              const isExpanded = expandedIndices.includes(i);
              const hasError = Object.keys(errors).some(k => k.startsWith(`co_${i}_`));
              
              return (
                <div 
                  key={i} 
                  className={`border rounded-xl transition-all duration-300 ${isExpanded ? "bg-white border-gray-200 shadow-md" : "bg-gray-50 border-gray-100 shadow-sm"}`}
                >
                  {/* Accordion Header */}
                  <div 
                    onClick={() => toggleExpand(i)}
                    className="flex justify-between items-center p-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isExpanded ? "bg-[var(--accent,#2e3192)] text-white" : "bg-gray-200 text-gray-500"}`}>
                        {i + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">
                          {co.first_name ? `${co.first_name} ${co.last_name || ""}` : `Co-Applicant ${i + 1}`}
                        </h4>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                          {co.occupation || "Click to fill details"}
                        </p>
                      </div>
                      {hasError && !isExpanded && (
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse ml-2" />
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      {coApplicants.length > 1 && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCoApplicant(i);
                          }}
                          className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase tracking-tighter transition-colors"
                        >
                          Remove
                        </button>
                      )}
                      <svg 
                        className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <>
                    <CoApplicantForm 
                      i={i}
                      co={co}
                      setCoApp={setCoApp}
                      errors={errors}
                      triggerMaster={triggerMaster}
                      relationshipOptions={relationshipOptions}
                      genderOptions={genderOptions}
                      occupationOptions={occupationOptions}
                      orgNatureOptions={orgNatureOptions}
                      businessNatureOptions={businessNatureOptions}
                      professionOptions={professionOptions}
                      applicantPan={formData.pan}
                    />
                    {false && (
                    <div style={{ display: 'none' }}>
                    <div className="p-4 pt-0 border-t border-gray-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <SectionHeader title="Personal Details" />
                      <div className="grid grid-cols-2 gap-3">
                        <FormInput
                          label="First Name"
                          name={`co_${i}_first_name`}
                          required
                          value={co.first_name || ""}
                          onChange={(v) => setCoApp(i, "first_name", v)}
                          error={errors[`co_${i}_first_name`]}
                        />
                        <FormInput
                          label="Last Name"
                          name={`co_${i}_last_name`}
                          required
                          value={co.last_name || ""}
                          onChange={(v) => setCoApp(i, "last_name", v)}
                          error={errors[`co_${i}_last_name`]}
                        />
                      </div>
                      {/* ... rest of existing form fields ... */}
                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    label="Mobile Number"
                    name={`co_${i}_phone`}
                    type="tel"
                    required
                    value={co.phone || ""}
                    onChange={(v) => setCoApp(i, "phone", v)}
                    error={errors[`co_${i}_phone`]}
                    prefix="+91"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormSelect
                    label="Relationship"
                    name={`co_${i}_relationship`}
                    required
                    value={co.relationship || ""}
                    onChange={(v) => setCoApp(i, "relationship", v)}
                    error={errors[`co_${i}_relationship`]}
                    options={relationshipOptions}
                    onOpen={() => triggerMaster("relationship")}
                  />
                  <FormSelect
                    label="Gender"
                    name={`co_${i}_gender`}
                    value={co.gender || ""}
                    onChange={(v) => setCoApp(i, "gender", v)}
                    options={genderOptions}
                    onOpen={() => triggerMaster("gender")}
                  />
                </div>

                <SectionDivider />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FormInput
                    label="Monthly Income (₹)"
                    name={`co_${i}_income`}
                    type="number"
                    required
                    value={co.avg_monthly_income || ""}
                    onChange={(v) => setCoApp(i, "avg_monthly_income", v)}
                    error={errors[`co_${i}_income`]}
                  />
                  <FormInput
                    label="Deductions (₹)"
                    name={`co_${i}_deduction`}
                    type="number"
                    required
                    value={co.monthly_deduction || ""}
                    onChange={(v) => setCoApp(i, "monthly_deduction", v)}
                    error={errors[`co_${i}_deduction`]}
                  />
                  <FormInput
                    label="Obligations (₹)"
                    name={`co_${i}_obligations`}
                    type="number"
                    required
                    value={co.existing_monthly_obligations || ""}
                    onChange={(v) => setCoApp(i, "existing_monthly_obligations", v)}
                    error={errors[`co_${i}_obligations`]}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormSelect
                    label="Occupation"
                    name={`co_${i}_occupation`}
                    value={co.occupation || ""}
                    onChange={(v) => setCoApp(i, "occupation", v)}
                    options={occupationOptions}
                    onOpen={() => triggerMaster("occupation")}
                  />
                </div>

                {coOccupation(i) === "service" && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Employment Details</p>
                    <FormInput
                      label="Employer Name"
                      name={`co_${i}_org_name`}
                      required
                      value={co.employer_name || ""}
                      onChange={(v) => setCoApp(i, "employer_name", v)}
                      error={errors[`co_${i}_org_name`]}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <FormSelect
                        label="Org Nature"
                        name={`co_${i}_org_nature`}
                        required
                        value={co.nature_of_org || ""}
                        onChange={(v) => setCoApp(i, "nature_of_org", v)}
                        error={errors[`co_${i}_org_nature`]}
                        options={orgNatureOptions}
                        onOpen={() => triggerMaster("org_nature")}
                      />
                      <FormInput
                        label="Designation"
                        name={`co_${i}_designation`}
                        value={co.designation || ""}
                        onChange={(v) => setCoApp(i, "designation", v)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormInput
                        label="Total Exp (yrs)"
                        name={`co_${i}_work_exp`}
                        type="number"
                        required
                        value={co.total_work_exp || ""}
                        onChange={(v) => setCoApp(i, "total_work_exp", v)}
                        error={errors[`co_${i}_work_exp`]}
                      />
                      <FormInput
                        label="Remaining (yrs)"
                        name={`co_${i}_service_remaining`}
                        type="number"
                        required
                        value={co.service_remaining || ""}
                        onChange={(v) => setCoApp(i, "service_remaining", v)}
                        error={errors[`co_${i}_service_remaining`]}
                      />
                    </div>
                  </div>
                )}

                {coOccupation(i) === "business" && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Business Details</p>
                    <FormInput
                      label="Organisation Name"
                      name={`co_${i}_org_name`}
                      required
                      value={co.employer_name || ""}
                      onChange={(v) => setCoApp(i, "employer_name", v)}
                      error={errors[`co_${i}_org_name`]}
                    />
                    <FormInput
                      label="Business Email"
                      name={`co_${i}_business_email`}
                      type="email"
                      value={co.business_email || ""}
                      onChange={(v) => setCoApp(i, "business_email", v)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <FormSelect
                        label="Nature of Organisation"
                        name={`co_${i}_org_nature`}
                        required
                        value={co.nature_of_org || ""}
                        onChange={(v) => setCoApp(i, "nature_of_org", v)}
                        error={errors[`co_${i}_org_nature`]}
                        options={orgNatureOptions}
                        onOpen={() => triggerMaster("org_nature")}
                      />
                      <FormSelect
                        label="Nature of Business"
                        name={`co_${i}_business_nature`}
                        required
                        value={co.business_nature || ""}
                        onChange={(v) => setCoApp(i, "business_nature", v)}
                        error={errors[`co_${i}_business_nature`]}
                        options={businessNatureOptions.length > 0 ? businessNatureOptions : [
                          { label: "Manufacturing", value: "mfg" },
                          { label: "Trading", value: "trading" },
                          { label: "Services", value: "services" },
                          { label: "Agriculture", value: "agri" },
                        ]}
                        onOpen={() => triggerMaster("business_nature")}
                      />
                    </div>
                    <FormInput
                      label="Business Since (MM/YYYY)"
                      name={`co_${i}_business_since`}
                      required
                      placeholder="MM/YYYY"
                      value={co.business_since || ""}
                      onChange={(v) => setCoApp(i, "business_since", formatMmYyyy(v))}
                      error={errors[`co_${i}_business_since`]}
                    />
                  </div>
                )}

                {(coOccupation(i) === "professional" || coOccupation(i) === "self_employed") && (
                  <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-in slide-in-from-top-2 duration-300">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Professional Details</p>
                    <FormSelect
                      label="Profession / Expertise"
                      name={`co_${i}_profession`}
                      required
                      value={co.profession || ""}
                      onChange={(v) => setCoApp(i, "profession", v)}
                      error={errors[`co_${i}_profession`]}
                      options={professionOptions}
                      onOpen={() => triggerMaster("profession")}
                    />
                    <FormInput
                      label="Organisation Name"
                      name={`co_${i}_org_name`}
                      required
                      value={co.employer_name || ""}
                      onChange={(v) => setCoApp(i, "employer_name", v)}
                      error={errors[`co_${i}_org_name`]}
                    />
                    <FormInput
                      label="Business Email"
                      name={`co_${i}_business_email`}
                      type="email"
                      value={co.business_email || ""}
                      onChange={(v) => setCoApp(i, "business_email", v)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <FormSelect
                        label="Nature of Organisation"
                        name={`co_${i}_org_nature`}
                        required
                        value={co.nature_of_org || ""}
                        onChange={(v) => setCoApp(i, "nature_of_org", v)}
                        error={errors[`co_${i}_org_nature`]}
                        options={orgNatureOptions}
                        onOpen={() => triggerMaster("org_nature")}
                      />
                      <FormInput
                        label="Since (MM/YYYY)"
                        name={`co_${i}_business_since`}
                        required
                        value={co.business_since || ""}
                        onChange={(v) => setCoApp(i, "business_since", formatMmYyyy(v))}
                        error={errors[`co_${i}_business_since`]}
                      />
                    </div>
                  </div>
                )}
              </div>
              </div>
                    )}
              </>
            )}
          </div>
        );
      })}

      <button 
        type="button"
        onClick={addCoApplicant}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold text-sm hover:border-[var(--accent,#2e3192)] hover:text-[var(--accent,#2e3192)] transition-all flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
        </svg>
        Add Another Co-Applicant
      </button>
    </div>
  )}

        <div className="flex gap-4 pt-4">
          <SecondaryButton onClick={() => setSubStep("income")} className="flex-1">
            ← Back
          </SecondaryButton>
          <div className="flex-[2]">
            <PrimaryButton onClick={handleNext} isLoading={isLoading}>
              Complete Step →
            </PrimaryButton>
          </div>
        </div>
      </div>
    </StepCard>
  );
}

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
  syncWithApplicationData as syncWithApplicationDataAction
} from "../../../_lib/redux/slices/journeySlice";
import { 
  useProcessJourneyStepMutation,
  useGetPublicMasterValuesQuery,
} from "../../../_lib/redux/services/adminApiSlice";
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
import {
  getEmailValidationError,
  getIndianMobileValidationError,
} from "../../../_lib/validation/mobile";
import {
  calculateAge,
  getAgeValidationError,
} from "../../../_lib/validation/age";
import { scrollToFirstFieldError } from "../../../_hooks/useScrollToFieldError";
import { mapBackendFieldErrors } from "../../../_lib/apiErrors";

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

function getOwnershipSelectionText(
  value: unknown,
  options: Array<{ label: unknown; value: unknown }>,
): string {
  const selectedLabel = options.find(
    (option) => String(option.value) === String(value ?? ""),
  )?.label;

  return `${String(value ?? "")} ${String(selectedLabel ?? "")}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

function isRentalWithAgreementSelection(
  value: unknown,
  options: Array<{ label: unknown; value: unknown }>,
): boolean {
  const text = getOwnershipSelectionText(value, options);
  return text.includes("rent") && text.includes("agreement");
}

function isOtherOwnershipSelection(
  value: unknown,
  options: Array<{ label: unknown; value: unknown }>,
): boolean {
  return /\bothers?\b/.test(getOwnershipSelectionText(value, options));
}


export default function IndividualDetailsStep() {
  const pathname = usePathname() || "";
  const dispatch = useAppDispatch();
  const {
    config,
    formData,
    currentStepIndex,
    completedStepIndices,
    currentSubStepKey,
  } = useAppSelector((state) => state.journey);

  const updateFormData = (data: any) => dispatch(updateFormDataAction(data));
  const nextStep = () => dispatch(nextStepAction());
  const prevStep = () => dispatch(prevStepAction());
  const markStepComplete = (index: number) => dispatch(markStepCompleteAction(index));
  const syncWithApplicationData = (data: string) => dispatch(syncWithApplicationDataAction(data));
  const [processJourneyStep] = useProcessJourneyStepMutation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [subStep, setSubStep] = useState("personal");
  const [isLoading, setIsLoading] = useState(false);
  const [activatedMasters, setActivatedMasters] = useState<Record<string, boolean>>({});

  const triggerMaster = (key: string) => {
    if (!activatedMasters[key]) {
      setActivatedMasters((prev) => ({ ...prev, [key]: true }));
    }
  };

  // Master data queries
  const { data: categoryData = [], isFetching: fetchingNum3 } = useGetPublicMasterValuesQuery("category", { skip: !activatedMasters["category"] && !formData.category });
  const { data: religionData = [], isFetching: fetchingNum4 } = useGetPublicMasterValuesQuery("community_religion", { skip: !activatedMasters["religion"] && !formData.religion });
  const { data: genderData = [], isFetching: fetchingNum5 } = useGetPublicMasterValuesQuery("gender", { skip: !activatedMasters["gender"] && !formData.gender });
  const { data: maritalData = [], isFetching: fetchingNum6 } = useGetPublicMasterValuesQuery("marital_status", { skip: !activatedMasters["marital_status"] && !formData.marital_status });
  const { data: ownershipData = [], isFetching: fetchingNum7 } = useGetPublicMasterValuesQuery("permanent_residence_ownership", { skip: !activatedMasters["perm_ownership"] && !formData.perm_ownership });
  const { data: presentOwnershipData = [], isFetching: fetchingNum8 } = useGetPublicMasterValuesQuery("present_residence_ownership", { skip: !activatedMasters["pres_ownership"] && !formData.pres_ownership });
  const { data: titleData = [], isFetching: fetchingNum9 } = useGetPublicMasterValuesQuery("title", { skip: !activatedMasters["title"] && !formData.title });



  const categoryOptions = categoryData.map((item: any) => {
    if (typeof item === 'string') return { label: item, value: item };
    return {
      label: item.meta_value || item.name || item.label || item.value || String(item.id || ''),
      value: item.meta_key || item.id || item.value || item.name || String(item)
    };
  });

  const religionOptions = religionData.map((item: any) => {
    if (typeof item === 'string') return { label: item, value: item };
    return {
      label: item.meta_value || item.name || item.label || item.value || String(item.id || ''),
      value: item.meta_key || item.id || item.value || item.name || String(item)
    };
  });

  const genderOptions = genderData.map((item: any) => {
    if (typeof item === 'string') return { label: item, value: item };
    return {
      label: item.meta_value || item.name || item.label || item.value || String(item.id || ''),
      value: item.meta_key || item.id || item.value || item.name || String(item)
    };
  });

  const maritalOptions = maritalData.map((item: any) => {
    if (typeof item === 'string') return { label: item, value: item };
    return {
      label: item.meta_value || item.name || item.label || item.value || String(item.id || ''),
      value: item.meta_key || item.id || item.value || item.name || String(item)
    };
  });

  const ownershipOptions = ownershipData.map((item: any) => {
    if (typeof item === 'string') return { label: item, value: item };
    return {
      label: item.meta_value || item.name || item.label || item.value || String(item.id || ''),
      value: item.meta_key || item.id || item.value || item.name || String(item)
    };
  });

  const presentOwnershipOptions = presentOwnershipData.map((item: any) => {
    if (typeof item === 'string') return { label: item, value: item };
    return {
      label: item.meta_value || item.name || item.label || item.value || String(item.id || ''),
      value: item.meta_key || item.id || item.value || item.name || String(item)
    };
  });

  const titleOptions = titleData.map((item: any) => {
    if (typeof item === 'string') return { label: item, value: item };
    return {
      label: item.meta_value || item.name || item.label || item.value || String(item.id || ''),
      value: item.meta_key || item.id || item.value || item.name || String(item)
    };
  });

  const optionValue = (value: unknown, fallback: unknown) =>
    String(value ?? fallback ?? "");

  useEffect(() => {
    if (currentSubStepKey) {
      const stepConfig = config?.steps[currentStepIndex];
      if (stepConfig?.subSteps?.personal?.stepKey === currentSubStepKey) {
        setSubStep("personal");
      } else if (stepConfig?.subSteps?.occupation?.stepKey === currentSubStepKey) {
        setSubStep("occupation");
      }
    }
  }, [currentSubStepKey, currentStepIndex, config]);

  const setFields = (data: Record<string, string>, errorKeys = Object.keys(data)) => {
    updateFormData(data);
    setErrors((p) => {
      const e = { ...p };
      errorKeys.forEach((key) => {
        delete e[key];
      });
      return e;
    });
  };

  const touchedRef = React.useRef<Set<string>>(new Set());

  const set = (key: string, val: string) => {
    touchedRef.current.add(key);
    setFields({ [key]: val });
  };

  const setOwnership = (key: "perm_ownership" | "pres_ownership", val: string) => {
    touchedRef.current.add(key);

    if (String(formData[key] ?? "") === val) {
      setFields({ [key]: val });
      return;
    }

    const dependentFields: Record<string, string> =
      key === "perm_ownership"
        ? {
            perm_resident_owned_by: "",
            perm_rent_per_month: "",
            perm_ownership_other_value: "",
          }
        : {
            pres_resident_owned_by: "",
            pres_rent_per_month: "",
            pres_ownership_other_value: "",
          };

    setFields({ [key]: val, ...dependentFields });
  };

  const isFieldReadOnly = (key: string) => {
    return Boolean(formData[key] && !touchedRef.current.has(key));
  };

  const sameAddress = formData.same_address === "yes";
  const occupation = formData.occupation;

  const age = calculateAge(formData.dob);
  const hasPermanentRentalDetails = isRentalWithAgreementSelection(
    formData.perm_ownership,
    ownershipOptions,
  );
  const hasPermanentOtherOwnership = isOtherOwnershipSelection(
    formData.perm_ownership,
    ownershipOptions,
  );
  const hasPresentRentalDetails = isRentalWithAgreementSelection(
    formData.pres_ownership,
    presentOwnershipOptions,
  );
  const hasPresentOtherOwnership = isOtherOwnershipSelection(
    formData.pres_ownership,
    presentOwnershipOptions,
  );

  /* ── Sub-step 1 validation ── */
  const validatePersonal = () => {
    const e: Record<string, string> = {};
    if (!formData.title) e.title = "Required";
    if (!formData.first_name) e.first_name = "Required";
    if (!formData.last_name) e.last_name = "Required";
    const emailError = getEmailValidationError(formData.email, "Required");
    if (emailError) e.email = emailError;
    const mobileError = getIndianMobileValidationError(formData.mobile, "Required");
    if (mobileError) e.mobile = mobileError;
    if (!formData.pan) e.pan = "Required";
    if (!formData.perm_addr_line1) e.perm_addr_line1 = "Required";
    if (!formData.perm_addr_line2) e.perm_addr_line2 = "Required";
    if (!(formData.perm_district || formData.perm_city)) e.perm_district = "Required";
    if (!formData.perm_state) e.perm_state = "Required";
    if (!formData.perm_pincode) e.perm_pincode = "Required";
    if (!formData.perm_ownership) e.perm_ownership = "Required";
    if (hasPermanentRentalDetails) {
      if (!formData.perm_resident_owned_by) e.perm_resident_owned_by = "Required";
      if (!formData.perm_rent_per_month) e.perm_rent_per_month = "Required";
    }
    if (hasPermanentOtherOwnership && !formData.perm_ownership_other_value) {
      e.perm_ownership_other_value = "Required";
    }
    if (!formData.gender) e.gender = "Required";
    if (!formData.marital_status) e.marital_status = "Required";
    const ageError = getAgeValidationError(formData.dob, "Applicant");
    if (ageError) e.dob = ageError;
    
    if (!sameAddress) {
        if (!formData.pres_addr_line1) e.pres_addr_line1 = "Required";
        if (!formData.pres_addr_line2) e.pres_addr_line2 = "Required";
        if (!formData.pres_state) e.pres_state = "Required";
        if (!(formData.pres_district || formData.pres_city)) e.pres_district = "Required";
        if (!formData.pres_pincode) e.pres_pincode = "Required";
        if (!formData.pres_ownership) e.pres_ownership = "Required";
        if (hasPresentRentalDetails) {
          if (!formData.pres_resident_owned_by) e.pres_resident_owned_by = "Required";
          if (!formData.pres_rent_per_month) e.pres_rent_per_month = "Required";
        }
        if (hasPresentOtherOwnership && !formData.pres_ownership_other_value) {
          e.pres_ownership_other_value = "Required";
        }
    }

    setErrors(e);
    if (Object.keys(e).length > 0) {
      scrollToFirstFieldError();
      const specificMessage = Object.values(e).find(
        (message) => message && message !== "Required",
      );
      toast.error(specificMessage || "Please fill all the required fields", {
        position: "top-left",
      });
      return false;
    }
    return true;
  };

  const checkAuthCompleteness = () => {
    if (!formData.branch || !formData.mobile) {
      toast.error("Missing Authentication details. Please go back to the first step.");
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    // Check previous step
    if (!checkAuthCompleteness()) return;

    if (subStep === "personal") {
      if (!validatePersonal()) return;

      // Skip API if already complete, but never skip required-field validation.
      if (completedStepIndices.includes(currentStepIndex)) {
        nextStep();
        return;
      }

      setIsLoading(true);
      try {
        const stepConfig = config?.steps[currentStepIndex];
        const backendTenantId = config?.backendTenantId || "";
        const currentSubStepKey = stepConfig?.subSteps?.personal?.stepKey || "";

        let loanType = "PERSONAL_LOAN";
        if (pathname.includes("home-loan")) loanType = "HOME_LOAN";
        else if (pathname.includes("vehicle-loan")) loanType = "VEHICLE_LOAN";
        else if (pathname.includes("property-loan") || pathname.includes("property-mortgage")) loanType = "PROPERTY_MORTGAGE_LOAN";
        else if (pathname.includes("education-loan")) loanType = "EDUCATION_LOAN";
        else if (pathname.includes("personal-loan")) loanType = "PERSONAL_LOAN";

        const response = await processJourneyStep({
          tenantId: backendTenantId,
          data: {
             step_key: "PERSONAL_DETAILS",
             loan_type: loanType,
             payload: {
               application_id: formData.application_id,
               section_id: "personal_detail",
               pan: formData.pan,
               email_id: formData.email,
               gender: formData.gender === "male" ? "M" : formData.gender === "female" ? "F" : "O",
               dob: formData.dob,
               dob_in_months: age !== null ? age * 12 : null,
               no_of_dependents: formData.dependents?.toString() || "0",
               marital_status: formData.marital_status || "",
               religion: formData.religion || "",
               category: formData.category || "",
               perm_addr_1: formData.perm_addr_line1,
               perm_addr_2: formData.perm_addr_line2,
               perm_addr_3: formData.perm_addr_line3 || "",
               perm_city: formData.perm_district || formData.perm_city,
               perm_pincode: formData.perm_pincode,
               perm_state: formData.perm_state,
               perm_country: formData.perm_country || "India",
               perm_residence_ownership: formData.perm_ownership,
               permanent_residence_ownership: formData.perm_ownership,
               perm_resident_owned_by: hasPermanentRentalDetails ? formData.perm_resident_owned_by : "",
               perm_rent_per_month: hasPermanentRentalDetails ? formData.perm_rent_per_month : "",
               perm_residence_ownership_other_value: hasPermanentOtherOwnership ? formData.perm_ownership_other_value : "",
               permanent_residence_ownership_other_value: hasPermanentOtherOwnership ? formData.perm_ownership_other_value : "",
               curr_addr_1: formData.same_address === "yes" ? formData.perm_addr_line1 : formData.pres_addr_line1,
               curr_address_2: formData.same_address === "yes" ? formData.perm_addr_line2 : formData.pres_addr_line2,
               curr_addr_3: formData.same_address === "yes" ? formData.perm_addr_line3 || "" : formData.pres_addr_line3 || "",
               curr_city: formData.same_address === "yes" ? formData.perm_district || formData.perm_city : formData.pres_district || formData.pres_city,
               curr_pincode: formData.same_address === "yes" ? formData.perm_pincode : formData.pres_pincode,
               curr_state: formData.same_address === "yes" ? formData.perm_state : formData.pres_state,
               curr_country: formData.same_address === "yes" ? formData.perm_country || "India" : formData.pres_country || "India",
               curr_residence_ownership: formData.same_address === "yes" ? formData.perm_ownership : formData.pres_ownership,
               current_residence_ownership: formData.same_address === "yes" ? formData.perm_ownership : formData.pres_ownership,
               curr_resident_owned_by: formData.same_address === "yes"
                 ? (hasPermanentRentalDetails ? formData.perm_resident_owned_by : "")
                 : (hasPresentRentalDetails ? formData.pres_resident_owned_by : ""),
               curr_rent_per_month: formData.same_address === "yes"
                 ? (hasPermanentRentalDetails ? formData.perm_rent_per_month : "")
                 : (hasPresentRentalDetails ? formData.pres_rent_per_month : ""),
               curr_residence_ownership_other_value: formData.same_address === "yes"
                 ? (hasPermanentOtherOwnership ? formData.perm_ownership_other_value : "")
                 : (hasPresentOtherOwnership ? formData.pres_ownership_other_value : "")
             }
          }
        }).unwrap();

        if (response?.data?.application_data) {
          syncWithApplicationData(response.data.application_data);
        }
        markStepComplete(currentStepIndex);
        nextStep();
      } catch (err: any) {
        console.error("Failed Individual Personal phase", err);
        const backendErrors = mapBackendFieldErrors(err);
        if (Object.keys(backendErrors).length > 0) {
          setErrors((prev) => ({ ...prev, ...backendErrors }));
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  /*      SUB-STEP 1: Personal / Address details */
  if (subStep === "personal") {
    return (
      <StepCard
        title="Personal Details"
        subtitle="Please provide your personal and address information"
        icon={<PersonIcon />}
      >
        <div className="space-y-4">
          <SectionHeader title="Personal Details" />

          {/* Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 md:gap-3">
            <FormSelect
              label="Title"
              name="title"
              required
              value={formData.title}
              onChange={(v) => set("title", v)}
              error={errors.title}
              options={titleOptions}
              onOpen={() => triggerMaster("title")}
            />
            <FormInput
              label="First Name"
              name="first_name"
              required
              autoComplete="off"
              readOnly={isFieldReadOnly("first_name")}
              value={formData.first_name}
              onChange={(v) => set("first_name", v)}
              error={errors.first_name}
              />
            <FormInput
              label="Middle Name"
              name="middle_name"
              readOnly={isFieldReadOnly("middle_name")}
              value={formData.middle_name}
              onChange={(v) => set("middle_name", v)}
              error={errors.middle_name}
            />
          </div>
          <FormInput
            label="Last Name"
            name="last_name"
            required
            readOnly={isFieldReadOnly("last_name")}
            value={formData.last_name}
            onChange={(v) => set("last_name", v)}
            error={errors.last_name}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 md:gap-3">
            <FormInput
              label="Mobile Number"
              name="mobile"
              type="tel"
              required
              autoComplete="off"
              // readOnly={isFieldReadOnly("mobile")}
              value={formData.mobile}
              prefix="+91"
              inputStyle={{ paddingLeft: "48px" }}
            />
            <FormInput
              label="Email ID"
              name="email"
              type="email"
              required
              readOnly={isFieldReadOnly("email")}
              value={formData.email}
              onChange={(v) => set("email", v)}
              error={errors.email}
            />
          </div>
          <FormInput
            label="PAN Number"
            name="pan"
            required
            readOnly
            value={formData.pan}
            error={errors.pan}
          />
          {formData.pan_issue_date && (
            <FormInput
              label="Date of PAN Issued"
              name="pan_issue_date"
              readOnly
              value={formData.pan_issue_date}
            />
          )}

          <SectionDivider />
          <SectionHeader title="Permanent Residential Address" />

          <FormInput
            label="Address Line 1"
            name="perm_addr_line1"
            required
            value={formData.perm_addr_line1}
            onChange={(v) => set("perm_addr_line1", v)}
            error={errors.perm_addr_line1}
          />
          <FormInput
            label="Address Line 2"
            name="perm_addr_line2"
            required
            value={formData.perm_addr_line2}
            onChange={(v) => set("perm_addr_line2", v)}
            error={errors.perm_addr_line2}
          />
          <FormInput
            label="Address Line 3"
            name="perm_addr_line3"
            value={formData.perm_addr_line3}
            onChange={(v) => set("perm_addr_line3", v)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 md:gap-3">
            <FormInput
              label="State"
              name="perm_state"
              required
              value={formData.perm_state}
              onChange={(v) => set("perm_state", v)}
              error={errors.perm_state}
            />
            <FormInput
              label="District"
              name="perm_district"
              required
              value={formData.perm_district || formData.perm_city}
              onChange={(v) => setFields({ perm_district: v, perm_city: v }, ["perm_district", "perm_city"])}
              error={errors.perm_district || errors.perm_city}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Pincode"
              name="perm_pincode"
              required
              value={formData.perm_pincode}
              onChange={(v) => set("perm_pincode", v)}
              error={errors.perm_pincode}
            />
            <FormSelect
              label="Ownership"
              name="perm_ownership"
              required
              value={formData.perm_ownership}
              onChange={(v) => setOwnership("perm_ownership", v)}
              error={errors.perm_ownership}
              options={ownershipOptions}
              onOpen={() => triggerMaster("perm_ownership")}
            />
          </div>
          {hasPermanentRentalDetails && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 md:gap-3">
              <FormInput
                label="Resident Owned By"
                name="perm_resident_owned_by"
                required
                value={formData.perm_resident_owned_by}
                onChange={(v) => set("perm_resident_owned_by", v)}
                error={errors.perm_resident_owned_by}
              />
              <FormInput
                label="Rent Per Month (INR)"
                name="perm_rent_per_month"
                type="number"
                required
                value={formData.perm_rent_per_month}
                onChange={(v) => set("perm_rent_per_month", v)}
                error={errors.perm_rent_per_month}
              />
            </div>
          )}
          {hasPermanentOtherOwnership && (
            <FormInput
              label="Residence Ownership Other Value"
              name="perm_ownership_other_value"
              required
              value={formData.perm_ownership_other_value}
              onChange={(v) => set("perm_ownership_other_value", v)}
              error={errors.perm_ownership_other_value}
            />
          )}
          <FormInput
            label="Country"
            name="perm_country"
            readOnly
            value={formData.perm_country || "India"}
          />

          <SectionDivider />

          {/* Present address */}
          <div className="flex items-center justify-between mb-1">
            <SectionHeader
              title="Present Residential Address"
              className="mb-0"
            />
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold ${!sameAddress ? "text-gray-800" : "text-gray-400"}`}
              >
                Different
              </span>
              <ToggleSwitch
                value={sameAddress}
                onChange={(v) => set("same_address", v ? "yes" : "no")}
                labelOff=""
                labelOn=""
              />
              <span
                className={`text-xs font-semibold ${sameAddress ? "text-gray-800" : "text-gray-400"}`}
              >
                Same
              </span>
            </div>
          </div>

          {sameAddress ? (
            <p className="text-xs text-gray-400 italic">
              Same as permanent address.
            </p>
          ) : (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
              <FormInput
                label="Address Line 1"
                name="pres_addr_line1"
                required
                value={formData.pres_addr_line1}
                onChange={(v) => set("pres_addr_line1", v)}
                error={errors.pres_addr_line1}
              />
              <FormInput
                label="Address Line 2"
                name="pres_addr_line2"
                required
                value={formData.pres_addr_line2}
                onChange={(v) => set("pres_addr_line2", v)}
                error={errors.pres_addr_line2}
              />
              <FormInput
                label="Address Line 3"
                name="pres_addr_line3"
                value={formData.pres_addr_line3}
                onChange={(v) => set("pres_addr_line3", v)}
              />
              <div className="grid grid-cols-2 gap-3">
              <FormInput
                  label="State"
                  name="pres_state"
                  required
                  value={formData.pres_state}
                  onChange={(v) => set("pres_state", v)}
                  error={errors.pres_state}
                />
                <FormInput
                  label="District"
                  name="pres_district"
                  required
                  value={formData.pres_district || formData.pres_city}
                  onChange={(v) => setFields({ pres_district: v, pres_city: v }, ["pres_district", "pres_city"])}
                  error={errors.pres_district || errors.pres_city}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Pincode"
                  name="pres_pincode"
                  required
                  value={formData.pres_pincode}
                  onChange={(v) => set("pres_pincode", v)}
                  error={errors.pres_pincode}
                />
                <FormSelect
                  label="Ownership"
                  name="pres_ownership"
                  required
                  value={formData.pres_ownership}
                  onChange={(v) => setOwnership("pres_ownership", v)}
                  error={errors.pres_ownership}
                  options={presentOwnershipOptions}
                  onOpen={() => triggerMaster("pres_ownership")}
                />
              </div>
              {hasPresentRentalDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 md:gap-3">
                  <FormInput
                    label="Resident Owned By"
                    name="pres_resident_owned_by"
                    required
                    value={formData.pres_resident_owned_by}
                    onChange={(v) => set("pres_resident_owned_by", v)}
                    error={errors.pres_resident_owned_by}
                  />
                  <FormInput
                    label="Rent Per Month (INR)"
                    name="pres_rent_per_month"
                    type="number"
                    required
                    value={formData.pres_rent_per_month}
                    onChange={(v) => set("pres_rent_per_month", v)}
                    error={errors.pres_rent_per_month}
                  />
                </div>
              )}
              {hasPresentOtherOwnership && (
                <FormInput
                  label="Residence Ownership Other Value"
                  name="pres_ownership_other_value"
                  required
                  value={formData.pres_ownership_other_value}
                  onChange={(v) => set("pres_ownership_other_value", v)}
                  error={errors.pres_ownership_other_value}
                />
              )}
              <FormInput
                label="Country"
                name="pres_country"
                readOnly
                value={formData.pres_country || "India"}
              />
            </div>
          )}

          <SectionDivider />
          <SectionHeader title="Demographics" />

          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Gender"
              name="gender"
              required
              value={formData.gender}
              onChange={(v) => set("gender", v)}
              error={errors.gender}
              options={genderOptions}
              onOpen={() => triggerMaster("gender")}
            />
            <FormSelect
              label="Marital Status"
              name="marital_status"
              required
              value={formData.marital_status}
              onChange={(v) => set("marital_status", v)}
              error={errors.marital_status}
              options={maritalOptions}
              onOpen={() => triggerMaster("marital_status")}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormInput
              label="Dependents"
              name="dependents"
              type="number"
              value={formData.dependents}
              onChange={(v) => set("dependents", v)}
            />
            <FormSelect
              label="Religion"
              name="religion"
              value={formData.religion}
              onChange={(v) => set("religion", v)}
              options={religionOptions}
              onOpen={() => triggerMaster("religion")}
            />
            <FormSelect
              label="Category"
              name="category"
              value={formData.category}
              onChange={(v) => set("category", v)}
              options={categoryOptions}
              onOpen={() => triggerMaster("category")}
            />
          </div>

          {/* DOB + auto age */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <FormInput
              label="Date of Birth"
              name="dob"
              type="date"
              required
              autoComplete="off"
              readOnly={isFieldReadOnly("dob")}
              value={formData.dob}
              onChange={(v) => set("dob", v)}
              error={errors.dob}
            />
            {age !== null && age > 0 && (
              <div className="flex items-center gap-2.5 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-xl font-black text-green-600">{age}</span>
                <span className="text-sm text-green-600 font-semibold">
                  years old
                </span>
                <span className="text-sm text-green-600 font-semibold">
                  {`(${age * 12} months old)`}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <SecondaryButton onClick={prevStep} className="flex-1">
              ← Back
            </SecondaryButton>
            <div className="flex-[2]">
              <PrimaryButton onClick={handleNext} isLoading={isLoading}>
                Next →
              </PrimaryButton>
            </div>
          </div>
        </div>
      </StepCard>
    );
  }
}

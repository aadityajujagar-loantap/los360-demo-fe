"use client";

import { useState } from "react";
import { useAppSelector, useAppDispatch } from "../../../../../_lib/redux/hooks";
import { 
  updateFormData as updateFormDataAction, 
  nextStep as nextStepAction, 
  markStepComplete as markStepCompleteAction 
} from "../../../../../_lib/redux/slices/journeySlice";
import { FieldFactory } from "../../../../../_components/fields/FieldFactory";
import { Step } from "../../../../../_types/journey";
import StepCard from "../../../../../_components/journey/StepCard";
import {
  SectionHeader,
  SectionDivider,
  PrimaryButton,
} from "../../../../../_components/journey/FormPrimitives";
import {
  getEmailValidationError,
  getIndianMobileValidationError,
  getOptionalEmailValidationError,
  getOptionalTenDigitPhoneValidationError,
} from "../../../../../_lib/validation/mobile";
import { scrollToFirstFieldError } from "../../../../../_hooks/useScrollToFieldError";

export default function UncommonStep({ step }: { step: Step }) {
  const dispatch = useAppDispatch();
  const {
    currentStepIndex,
    formData,
  } = useAppSelector((state) => state.journey);

  const updateFormData = (data: any) => dispatch(updateFormDataAction(data));
  const nextStep = () => dispatch(nextStepAction());
  const markStepComplete = (index: number) => dispatch(markStepCompleteAction(index));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFieldChange = (name: string, value: any) => {
    updateFormData({ [name]: value });
    if (errors[name]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[name];
        return n;
      });
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    const hasRequiredValue = (value: unknown) => {
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return Boolean(value);
    };
    [...step.fields, ...(step.extraFields || [])].forEach((f) => {
      const isMobileField = f.name === "mobile" || /mobile/i.test(f.label);
      const isEmailField = f.name.includes("email") || /email/i.test(f.label);
      const isPhoneField = f.name.includes("phone") || /phone/i.test(f.label);
      if (f.required && !hasRequiredValue(formData[f.name])) {
        e[f.name] = `${f.label} is required`;
      } else if (isMobileField && (f.required || formData[f.name])) {
        const mobileError = getIndianMobileValidationError(
          formData[f.name],
          `${f.label} is required`,
        );
        if (mobileError) e[f.name] = mobileError;
      } else if (isEmailField && (f.required || formData[f.name])) {
        const emailError = f.required
          ? getEmailValidationError(formData[f.name], `${f.label} is required`)
          : getOptionalEmailValidationError(formData[f.name]);
        if (emailError) e[f.name] = emailError;
      } else if (isPhoneField && (f.required || formData[f.name])) {
        const phoneError = getOptionalTenDigitPhoneValidationError(formData[f.name]);
        if (phoneError) e[f.name] = phoneError;
      }
    });
    setErrors(e);
    if (Object.keys(e).length > 0) {
      scrollToFirstFieldError();
    }
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      markStepComplete(currentStepIndex);
      nextStep();
    }
  };

  return (
    <StepCard
      title={step.label}
      subtitle="Please provide the additional details required for this step."
    >
      <div className="space-y-5">
        {/* Core fields */}
        {step.fields.length > 0 && (
          <>
            <SectionHeader title="Required Details" />
            {step.fields.map((field) => (
              <FieldFactory
                key={field.name}
                field={field}
                value={formData[field.name]}
                onChange={(v: any) => handleFieldChange(field.name, v)}
                error={errors[field.name]}
              />
            ))}
          </>
        )}

        {/* Organization-specific extra fields */}
        {step.extraFields && step.extraFields.length > 0 && (
          <>
            <SectionDivider />
            <SectionHeader
              title="Organization-Specific Details"
              subtitle="Additional information required by your lending organization"
            />
            {step.extraFields.map((field) => (
              <FieldFactory
                key={field.name}
                field={field}
                value={formData[field.name]}
                onChange={(v: any) => handleFieldChange(field.name, v)}
                error={errors[field.name]}
              />
            ))}
          </>
        )}

        <div className="pt-2">
          <PrimaryButton onClick={handleNext}>Continue →</PrimaryButton>
        </div>
      </div>
    </StepCard>
  );
}

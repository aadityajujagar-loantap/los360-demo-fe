"use client";

import AuthStep from "./AuthStep";
import IndividualDetailsStep from "./_steps/IndividualDetailsStep";
import IncomeStep from "./_steps/IncomeStep";
import LoanDetailsStep from "./_steps/LoanDetailsStep";
import EkycStep from "./_steps/EkycStep";
import EligibilityStep from "./_steps/EligibilityStep";
import AadharStep from "./_steps/AadharStep";

/**
 * Registry mapping journey config `component` keys to React components.
 * To add a new custom step UI:
 * 1. Create a component in _components/journey/_steps/
 * 2. Add an entry below.
 */
export const StepComponentRegistry: Record<string, React.ComponentType> = {
  authentication: AuthStep,
  individual_details: IndividualDetailsStep,
  income_details: IncomeStep,
  loan_details: LoanDetailsStep,
  ekyc: EkycStep,
  eligibility: EligibilityStep,
  aadhar_verification: AadharStep,
};

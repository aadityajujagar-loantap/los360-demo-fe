/**
 * Core Field types supported by the rendering factory.
 */
export type FieldType =
  | "text"
  | "select"
  | "radio"
  | "checkbox"
  | "file"
  | "date"
  | "otp"
  | "number";

/**
 * Configuration for an individual form input.
 */
export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  validation?: Record<string, unknown>;
  dynamicOptionsCallType?: string; // e.g. "category", "religion" for master-values API
}

export type FieldConfig = Field;

/**
 * A grouping of fields that represents one screen in the journey.
 */
export interface Step {
  id: string;
  label: string;
  fields: Field[];
  extraFields?: Field[];
  component?: string;
  stepKey?: string;
  subSteps?: Record<string, { stepKey: string; label: string }>;
  isExtra?: boolean;

  isHidden?: boolean;
  showNewUserToggle?: boolean;
  needsCaptcha?: boolean;
  needsOtp?: boolean;
}

export type StepDefinition = Step;

/**
 * Static definition of a journey.
 */
export interface JourneyDefinition {
  type: string;
  title: string;
  steps: Step[];
  extraSteps?: Step[];
}

/**
 * Runtime active state of the current journey.
 */
export interface JourneyConfig {
  orgSlug: string;
  name: string;
  backendTenantId: string;
  journeyType: string;
  title: string;
  type: string;
  maxCoApplicants?: number;
  steps: Step[];
}

export type JourneyRegistry = Record<string, Record<string, JourneyDefinition>>;

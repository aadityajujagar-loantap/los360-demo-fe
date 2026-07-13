import { FieldConfig, JourneyRegistry, Step } from "../_types/journey";

/**
 * Common fields used across multiple organizations.
 */
const COMMON_FIELDS: Record<string, FieldConfig> = {
  full_name: {
    name: "full_name",
    label: "Full Name",
    type: "text",
    required: true,
  },
  dob: {
    name: "dob",
    label: "Date of Birth",
    type: "date",
    required: true,
  },
  email: {
    name: "email",
    label: "Email Address",
    type: "text",
    required: true,
  },
  mobile: {
    name: "mobile",
    label: "Mobile Number",
    type: "number",
    required: true,
  },
  aadhar_number: {
    name: "aadhar_number",
    label: "Aadhaar Number",
    type: "text",
    required: true,
    placeholder: "0000 0000 0000",
  },
  pan: {
    name: "pan",
    label: "PAN Card Number",
    type: "text",
    required: true,
  },
  is_new_user: {
    name: "is_new_user",
    label: "Are you a new user?",
    type: "radio",
    required: true,
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
  },
  customer_id: {
    name: "customer_id",
    label: "Customer ID",
    type: "text",
    required: true,
  },
  is_category_belong: {
    name: "is_category_belong",
    label: "Do you belong to following category?",
    type: "radio",
    required: true,
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
    ],
  },
  title: {
    name: "title",
    label: "Title",
    type: "select",
    required: true,
    dynamicOptionsCallType: "title",
  },
  mname: { name: "mname", label: "Middle Name", type: "text" },
  gender: {
    name: "gender",
    label: "Gender",
    type: "select",
    required: true,
    dynamicOptionsCallType: "gender",
  },
  city_of_residence: {
    name: "city_of_residence",
    label: "City of Residence",
    type: "text",
    required: true,
  },
  consent_basic: {
    name: "consent_basic",
    label: "I agree to the terms and conditions",
    type: "checkbox",
    required: true,
  },
  consent_marketing: {
    name: "consent_marketing",
    label: "I agree to receive SMS, calls, and email communications",
    type: "checkbox",
    required: true,
  },
  no_pan_tick: {
    name: "no_pan_tick",
    label: "I do not have a PAN card",
    type: "checkbox",
  },
  loan_amount: {
    name: "loan_amount",
    label: "Amount Required",
    type: "number",
    required: true,
  },
  current_qualification: {
    name: "current_qualification",
    label: "Current Qualification",
    type: "select",
    required: true,
    dynamicOptionsCallType: "education",
  },
  repayment_method: {
    name: "repayment_method",
    label: "Repayment Method",
    type: "select",
    required: true,
    dynamicOptionsCallType: "repayment_method",
  },
  relationship: {
    name: "relationship",
    label: "Relationship",
    type: "select",
    required: true,
    dynamicOptionsCallType: "relationship_with_applicant",
  },
  relationship_with_applicant: {
    name: "relationship_with_applicant",
    label: "Relationship with Applicant",
    type: "select",
    required: true,
    dynamicOptionsCallType: "relationship_with_applicant",
  },
  profession: {
    name: "profession",
    label: "Profession",
    type: "select",
    required: true,
    dynamicOptionsCallType: "profession",
  },
  present_residence_ownership: {
    name: "present_residence_ownership",
    label: "Present Residence Ownership",
    type: "select",
    required: true,
    dynamicOptionsCallType: "present_residence_ownership",
  },
  residence_ownership: {
    name: "residence_ownership",
    label: "Residence Ownership",
    type: "select",
    required: true,
    dynamicOptionsCallType: "permanent_residence_ownership",
  },
  nature_of_organization: {
    name: "nature_of_organization",
    label: "Nature of Organization",
    type: "select",
    required: true,
    dynamicOptionsCallType: "nature_of_organization",
  },
  marital_status: {
    name: "marital_status",
    label: "Marital Status",
    type: "select",
    required: true,
    dynamicOptionsCallType: "marital_status",
  },
  education: {
    name: "education",
    label: "Highest Education",
    type: "select",
    required: true,
    dynamicOptionsCallType: "education",
  },
  occupation: {
    name: "occupation",
    label: "Occupation",
    type: "select",
    required: true,
    dynamicOptionsCallType: "occupation",
  },
  category: {
    name: "category",
    label: "Category",
    type: "select",
    required: true,
    dynamicOptionsCallType: "category",
  },
  first_name: {
    name: "first_name",
    label: "First Name",
    type: "text",
    required: true,
  },
  last_name: {
    name: "last_name",
    label: "Last Name",
    type: "text",
    required: true,
  },
  perm_addr_line1: {
    name: "perm_addr_line1",
    label: "Address Line 1",
    type: "text",
    required: true,
  },
  perm_city: {
    name: "perm_city",
    label: "City",
    type: "text",
    required: true,
  },
  perm_pincode: {
    name: "perm_pincode",
    label: "Pincode",
    type: "text",
    required: true,
  },
  perm_state: {
    name: "perm_state",
    label: "State",
    type: "select",
    required: true,
  },
  perm_district: {
    name: "perm_district",
    label: "District",
    type: "select",
    required: true,
  },
  employer_name: {
    name: "employer_name",
    label: "Employer Name",
    type: "text",
    required: true,
  },
  work_exp: {
    name: "work_exp",
    label: "Total Work Experience",
    type: "number",
    required: true,
  },
  org_address: {
    name: "org_address",
    label: "Organization Address",
    type: "text",
    required: true,
  },
  religion: {
    name: "religion",
    label: "Religion",
    type: "select",
    required: true,
    dynamicOptionsCallType: "religion",
  },
  id_proof: {
    name: "id_proof",
    label: "Identity Proof",
    type: "file",
    required: true,
    options: [
      { label: "PAN Card", value: "pan" },
      { label: "Aadhaar Card", value: "aadhar" },
      { label: "Passport", value: "passport" },
      { label: "Voter ID", value: "voter_id" },
      { label: "Driving Licence", value: "dl" },
    ],
  },
  address_proof: {
    name: "address_proof",
    label: "Address Proof",
    type: "file",
    required: true,
    options: [
      { label: "Aadhaar Card", value: "aadhar" },
      { label: "Passport", value: "passport" },
      { label: "Voter ID", value: "voter_id" },
      { label: "Utility Bill (< 3 months)", value: "utility_bill" },
      { label: "Bank Statement (< 3 months)", value: "bank_stmt" },
      { label: "Driving Licence", value: "dl" },
    ],
  },
  income_proof: {
    name: "income_proof",
    label: "Income Proof",
    type: "file",
    required: true,
    options: [
      { label: "Latest ITR", value: "itr" },
      { label: "Form 16", value: "form16" },
    ],
  },
  purpose_of_loan: {
    name: "purpose_of_loan",
    label: "Purpose of Loan",
    type: "select",
    required: true,
    dynamicOptionsCallType: "purpose_of_loan",
  },
};

/**
 * 6 Master step definitions for the Cosmos Personal Loan journey.
 * Progress bar shows steps 1–6, no sub-steps visible.
 */
const COSMOS_PERSONAL_STEPS: Step[] = [
  {
    id: "authentication",
    label: "Branch Details",
    component: "authentication",
    fields: [COMMON_FIELDS.is_new_user],
    showNewUserToggle: true,
    needsCaptcha: true,
    needsOtp: true,
  },
  {
    id: "pan-verification",
    label: "PAN Verification",
    component: "aadhar_verification",
    fields: [
      // ── Multitenancy control ────────────────────────────────────────────
      // Uncomment aadhar_number to enable the Aadhaar input + OTP substeps
      // before PAN (for orgs that require eKYC via Aadhaar).
      // When commented out, AadharStep skips directly to PAN verification.
      // COMMON_FIELDS.aadhar_number,
      COMMON_FIELDS.pan,
    ],
  },
  {
    id: "individual-details",
    label: "Personal Details",
    component: "individual_details",
    fields: [
      COMMON_FIELDS.title,
      COMMON_FIELDS.first_name,
      COMMON_FIELDS.mname,
      COMMON_FIELDS.last_name,
      COMMON_FIELDS.dob,
      COMMON_FIELDS.gender,
      COMMON_FIELDS.marital_status,
      COMMON_FIELDS.email,
      COMMON_FIELDS.mobile,
      COMMON_FIELDS.category,
      COMMON_FIELDS.religion,
      COMMON_FIELDS.perm_addr_line1,
      COMMON_FIELDS.perm_city,
      COMMON_FIELDS.perm_pincode,
      COMMON_FIELDS.perm_state,
      COMMON_FIELDS.perm_district,
      COMMON_FIELDS.residence_ownership,
    ],
  },
  {
    id: "income-details",
    label: "Income Details",
    component: "income_details",
    fields: [
      COMMON_FIELDS.education,
      COMMON_FIELDS.occupation,
      COMMON_FIELDS.employer_name,
      COMMON_FIELDS.work_exp,
      COMMON_FIELDS.org_address,
      COMMON_FIELDS.profession,
      COMMON_FIELDS.nature_of_organization,
      COMMON_FIELDS.relationship,
    ],
  },
  {
    id: "loan-details",
    label: "Loan Details",
    component: "loan_details",
    fields: [
      COMMON_FIELDS.loan_amount,
      COMMON_FIELDS.repayment_method,
      COMMON_FIELDS.purpose_of_loan,
    ],
  },
  {
    id: "ekyc",
    label: "Offer",
    component: "ekyc",
    fields: [COMMON_FIELDS.pan],
  },
  {
    id: "eligibility",
    label: "Documents",
    component: "eligibility",
    fields: [
      COMMON_FIELDS.id_proof,
      COMMON_FIELDS.address_proof,
      COMMON_FIELDS.income_proof,
    ],
  },
];

/**
 * Unified Step definitions for all journeys. [Temporary]
 */
const UNIFIED_STEPS: Step[] = COSMOS_PERSONAL_STEPS;

/**
 * Multi-Tenant Journey Registry.
 */
export const journeys: JourneyRegistry = {
  cosmos: {
    "personal-loan": {
      type: "personal",
      title: "Cosmos Personal Loan",
      steps: UNIFIED_STEPS,
      extraSteps: [],
    },
    "vehicle-loan": {
      type: "vehicle",
      title: "Cosmos Vehicle Loan",
      steps: UNIFIED_STEPS,
      extraSteps: [],
    },
    "property-mortgage-loan": {
      type: "property-mortgage",
      title: "Cosmos Property Mortgage Loan (LAP)",
      steps: UNIFIED_STEPS,
      extraSteps: [],
    },
    "education-loan": {
      type: "education",
      title: "Cosmos Education Loan",
      steps: UNIFIED_STEPS,
      extraSteps: [],
    },
    "home-loan": {
      type: "home",
      title: "Cosmos Home Loan",
      steps: UNIFIED_STEPS,
      extraSteps: [],
    },
  },
};

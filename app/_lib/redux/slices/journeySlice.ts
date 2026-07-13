import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { JourneyConfig } from '../../../_types/journey';
import { getLoanTypeFromJourney } from '../../loanType';
import { normalizeBackendDocument, RestoredDocument } from '../../documentMapping';
import {
  JourneyIdentity,
  getJourneyIdentityMismatch,
} from "../../journeyIdentity";

/**
 * Global state for the active loan journey.
 * Tracks form data, progress, and step navigation.
 */
interface JourneyState {
  config: JourneyConfig | null;
  currentStepIndex: number;
  formData: Record<string, any>;
  completedStepIndices: number[];
  isOtpSent: boolean;
  currentSubStepKey: string | null;
  /** Set during browser-close re-auth: the step to jump to after re-authentication. */
  targetStepIndex: number | null;
}

type RestorePosition = {
  currentStepIndex: number;
  currentSubStepKey: string | null;
};

type RestoreFromApiPayload = {
  data: any;
  jumpToStep?: boolean;
  expectedIdentity?: JourneyIdentity;
  hasReachedEligibilityOffer?: boolean;
};

const initialState: JourneyState = {
  config: null,
  currentStepIndex: 0,
  formData: {
    is_new_user: "yes",
    same_address: "yes",
  },
  completedStepIndices: [],
  isOtpSent: false,
  currentSubStepKey: null,
  targetStepIndex: null,
};

const BACKEND_SECTION_TO_FRONTEND_POSITION: Record<string, RestorePosition> = {
  request_otp: { currentStepIndex: 0, currentSubStepKey: "LOGIN_INITIATE" },
  validate_otp: { currentStepIndex: 0, currentSubStepKey: "OTP_VERIFICATION" },
  branch_selection: { currentStepIndex: 0, currentSubStepKey: "BRANCH_SELECTION" },
  pan_verification: { currentStepIndex: 1, currentSubStepKey: "pan_verification" },
  personal_detail: { currentStepIndex: 2, currentSubStepKey: "personal_detail" },
  orgnization_details: { currentStepIndex: 3, currentSubStepKey: "orgnization_details" },
  income_details: { currentStepIndex: 3, currentSubStepKey: "income_details" },
  coapp_information: { currentStepIndex: 3, currentSubStepKey: "coapp_information" },
  loan_requirement_details: { currentStepIndex: 4, currentSubStepKey: "loan_requirement_details" },
  loan_offer_details: { currentStepIndex: 5, currentSubStepKey: "loan_offer_details" },
  loan_document: { currentStepIndex: 6, currentSubStepKey: "loan_document" },
  loan_application_submitted: { currentStepIndex: 6, currentSubStepKey: "loan_application_submitted" },
  SUBMITTED: { currentStepIndex: 6, currentSubStepKey: "loan_application_submitted" },
};

const BACKEND_STEP_TO_FRONTEND_POSITION: Record<string, RestorePosition> = {
  LOGIN_INITIATE: { currentStepIndex: 0, currentSubStepKey: "LOGIN_INITIATE" },
  OTP_VERIFICATION: { currentStepIndex: 0, currentSubStepKey: "OTP_VERIFICATION" },
  BRANCH_SELECTION: { currentStepIndex: 0, currentSubStepKey: "BRANCH_SELECTION" },
  PERSONAL_DETAILS: { currentStepIndex: 2, currentSubStepKey: "personal_detail" },
  OCCUPATION_DETAILS: { currentStepIndex: 3, currentSubStepKey: "orgnization_details" },
  INCOME_DETAILS: { currentStepIndex: 3, currentSubStepKey: "income_details" },
  COAPP_DETAILS: { currentStepIndex: 3, currentSubStepKey: "coapp_information" },
  LOAN_DETAILS: { currentStepIndex: 4, currentSubStepKey: "loan_requirement_details" },
  LOAN_OFFER: { currentStepIndex: 5, currentSubStepKey: "loan_offer_details" },
  DOCUMENT_UPLOAD: { currentStepIndex: 6, currentSubStepKey: "loan_document" },
  LOAN_APPLICATION: { currentStepIndex: 6, currentSubStepKey: "loan_application_submitted" },
  SUBMITTED: { currentStepIndex: 6, currentSubStepKey: "loan_application_submitted" },
};

function resolveRestorePosition(currentStep?: string | null, sectionId?: string | null): RestorePosition {
  // current_step is the authoritative backend field for "where the user currently is".
  // section_id reflects the last submitted action (e.g. "pan_verification" after PAN is done),
  // NOT the step to resume at. Always prefer current_step.
  if (currentStep && BACKEND_STEP_TO_FRONTEND_POSITION[currentStep]) {
    return BACKEND_STEP_TO_FRONTEND_POSITION[currentStep];
  }

  if (sectionId && BACKEND_SECTION_TO_FRONTEND_POSITION[sectionId]) {
    return BACKEND_SECTION_TO_FRONTEND_POSITION[sectionId];
  }

  return {
    currentStepIndex: 0,
    currentSubStepKey: currentStep ?? sectionId ?? null,
  };
}

function firstPositiveRoiValue(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = String(value ?? "").replace(/,/g, "").trim();
    if (!text || text.toLowerCase() === "floating") continue;

    const parsed = Number(text);
    if (Number.isFinite(parsed) && parsed > 0) return text;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const journeySlice = createSlice({
  name: 'journey',
  initialState,
  reducers: {
    setConfig: (state, action: PayloadAction<JourneyConfig>) => {
      const loanType = getLoanTypeFromJourney({
        journeyType: action.payload.journeyType,
        configType: action.payload.type,
      });
      // Avoid resetting if we're already on this journey (e.g. on re-renders)
      if (state.config?.orgSlug === action.payload.orgSlug && 
          state.config?.journeyType === action.payload.journeyType &&
          state.config?.steps?.length === action.payload.steps?.length) {
        state.config = action.payload; // Update config but keep state
        state.formData.loan_type = loanType;
        return;
      }
      state.config = action.payload;
      state.currentStepIndex = 0;
      state.completedStepIndices = [];
      state.formData = {
        is_new_user: "yes",
        same_address: "yes",
        loan_type: loanType,
      };
      state.isOtpSent = false;
      state.currentSubStepKey = null;
      state.targetStepIndex = null;
    },
    setOtpSent: (state, action: PayloadAction<boolean>) => {
      state.isOtpSent = action.payload;
    },
    updateFormData: (state, action: PayloadAction<Record<string, any>>) => {
      state.formData = { ...state.formData, ...action.payload };
    },
    syncWithApplicationData: (state, action: PayloadAction<string>) => {
      try {
        const decoded = atob(action.payload);
        const data = JSON.parse(decoded);
        if (!Array.isArray(data)) return;
      } catch (e) {
        console.error("Failed to sync journey state from application_data", e);
      }
    },
    restoreFromApiData: (state, action: PayloadAction<RestoreFromApiPayload | any>) => {
      if (!state.config) return;
      const payload = action.payload;
      const isWrappedPayload =
        payload &&
        typeof payload === "object" &&
        ("data" in payload ||
          "jumpToStep" in payload ||
          "expectedIdentity" in payload ||
          "hasReachedEligibilityOffer" in payload);
      const data = isWrappedPayload ? payload.data : payload;
      const jumpToStep = Boolean(isWrappedPayload && payload.jumpToStep);
      const expectedIdentity = isWrappedPayload ? payload.expectedIdentity : undefined;
      const hasReachedEligibilityOffer = Boolean(
        isWrappedPayload && payload.hasReachedEligibilityOffer,
      );
      const application = data?.application || data; // Backend might return application top-level or nested
      if (!application || (typeof application !== "object")) return;
      const eligibleOffer = isRecord(application.eligible_offer)
        ? application.eligible_offer
        : isRecord(data?.eligible_offer)
          ? data.eligible_offer
          : undefined;
      if (
        expectedIdentity &&
        getJourneyIdentityMismatch(data, expectedIdentity, {
          requireCompleteActual: true,
        })
      ) {
        return;
      }

      // Field Mapping Engine for precise re-population
      const mapField = (src: any, map: Record<string, string>) => {
        const dest: any = { ...src };
        Object.entries(map).forEach(([backendKey, frontendKey]) => {
          if (src[backendKey] !== undefined && src[backendKey] !== null) {
            dest[frontendKey] = src[backendKey];
          }
        });
        return dest;
      };

      const toDateInputValue = (value: unknown) => {
        if (typeof value !== "string" || !value) return "";
        if (/^\d{8}$/.test(value)) {
          const y = value.substring(0, 4);
          const m = value.substring(4, 6);
          const d = value.substring(6, 8);
          return `${y}-${m}-${d}`;
        }
        return value;
      };

      const mappedApplication = mapField(application, {
        "email_id": "email",
        "pan_number": "pan",
        "pan_no": "pan",
        "no_of_dependents": "dependents",
        "marital_status": "marital_status",
        "religion": "religion",
        "category": "category",
        
        // Address Maps
        "permanent_address_line1": "perm_addr_line1",
        "permanent_address_line2": "perm_addr_line2",
        "permanent_address_line3": "perm_addr_line3",
        "perm_addr_1": "perm_addr_line1",
        "perm_addr_2": "perm_addr_line2",
        "perm_addr_3": "perm_addr_line3",
        "permanent_residence_ownership": "perm_ownership",
        "perm_residence_ownership": "perm_ownership",
        "permanent_residence_ownership_other_value": "perm_ownership_other_value",
        "perm_residence_ownership_other_value": "perm_ownership_other_value",
        "permanent_pincode": "perm_pincode",
        "perm_pincode": "perm_pincode",
        "pincode": "perm_pincode",
        "permanent_state": "perm_state",
        "permanent_city": "perm_city",
        "permanent_district": "perm_district",
        
        "curr_addr_1": "pres_addr_line1",
        "curr_address_2": "pres_addr_line2",
        "curr_addr_2": "pres_addr_line2",
        "curr_address_3": "pres_addr_line3",
        "curr_addr_3": "pres_addr_line3",
        "curr_city": "pres_city",
        "curr_state": "pres_state",
        "current_residence_ownership": "pres_ownership",
        "curr_residence_ownership": "pres_ownership",
        "current_resident_owned_by": "pres_resident_owned_by",
        "curr_resident_owned_by": "pres_resident_owned_by",
        "curr_rent_per_month": "pres_rent_per_month",
        "current_residence_ownership_other_value": "pres_ownership_other_value",
        "curr_residence_ownership_other_value": "pres_ownership_other_value",
        
        // Employment & Income
        "educational_qualification": "education",
        "nature_of_org": "org_nature",
        "total_work_exp": "work_exp",
        "remaining_service_period": "service_remaining",
        "work_phone": "office_phone",
        
        "avg_monthly_income": "monthly_income",
        "loan_period_requested": "repayment_period",
        "existing_monthly_obligations": "existing_obligations",
        "loan_amount_requested": "loan_amount",
        "loan_purpose": "purpose_of_loan",

        // Specific Mappings
        "fatherName": "middle_name",
      });

      // Handle gender properly
      if (application.gender) {
        if (application.gender === "M") mappedApplication.gender = "MALE";
        else if (application.gender === "F") mappedApplication.gender = "FEMALE";
        else mappedApplication.gender = "OTHER";
      }

      // Handle State & District (Prioritize "permanent_" fields from API)
      const formatDropdownValue = (val: any) => {
        if (!val || typeof val !== "string") return val;
        return val.trim(); // No longer replacing spaces with underscores since we use FormInput
      };

      if (application.permanent_state) {
        mappedApplication.perm_state = application.permanent_state;
      } else if (application.state) {
        mappedApplication.perm_state = application.state;
      }

      if (application.permanent_city) {
        const city = formatDropdownValue(application.permanent_city);
        mappedApplication.perm_city = city;
        mappedApplication.perm_district = city;
      } else if (application.district) {
        const dist = formatDropdownValue(application.district);
        mappedApplication.perm_district = dist;
        mappedApplication.perm_city = dist;
      }

      // Handle shifted pincode mapping seen in some backend payloads
      if (application.permanent_state && /^\d+$/.test(application.permanent_state)) {
         mappedApplication.perm_pincode = application.permanent_state;
         // Removed: mappedApplication.perm_state = application.permanent_country; 
      }

      // Handle Date of Birth format (Backend sends YYYYMMDD, we need YYYY-MM-DD)
      if (application.date_of_birth) {
        mappedApplication.dob = toDateInputValue(application.date_of_birth);
      }

      // Handle Loan Offer data
      const hasFlatOffer =
        application.eligible !== undefined ||
        application.sanction_amount !== undefined ||
        application.eligible_loan_amount !== undefined ||
        application.eligible_roi !== undefined ||
        application.eligible_emi !== undefined ||
        application.eligible_tenure !== undefined;

      if (hasFlatOffer || eligibleOffer) {
        const restoredRoi = firstPositiveRoiValue(
          eligibleOffer?.roi,
          eligibleOffer?.eligible_roi,
          application.eligible_roi,
          data?.eligible_roi,
          application.roi,
          data?.roi,
        );
        const restoredEligible = application.eligible ?? eligibleOffer?.eligible;
        mappedApplication.eligible_offer = {
          ...(eligibleOffer || {}),
          eligible:
            restoredEligible === "1" ||
            restoredEligible === "true" ||
            restoredEligible === true,
          sanction_amount: application.sanction_amount ?? eligibleOffer?.sanction_amount,
          eligible_loan_amount:
            application.eligible_loan_amount ?? eligibleOffer?.eligible_loan_amount,
          roi: restoredRoi,
          eligible_roi: restoredRoi,
          emi: application.eligible_emi ?? eligibleOffer?.emi ?? eligibleOffer?.eligible_emi,
          eligible_emi:
            application.eligible_emi ?? eligibleOffer?.eligible_emi ?? eligibleOffer?.emi,
          tenure: application.eligible_tenure ?? eligibleOffer?.tenure ?? eligibleOffer?.eligible_tenure,
          eligible_tenure:
            application.eligible_tenure ?? eligibleOffer?.eligible_tenure ?? eligibleOffer?.tenure,
          rejection_reasons: application.rejection_reasons 
            ? (typeof application.rejection_reasons === "string" ? JSON.parse(application.rejection_reasons) : application.rejection_reasons) 
            : eligibleOffer?.rejection_reasons || []
        };
      }

      // Handle Documents
      if (Array.isArray(data.documents)) {
        data.documents.forEach((doc: any) => {
          const normalizedDoc = normalizeBackendDocument(doc);
          const type = normalizedDoc.docType;
          const subType = normalizedDoc.docSubType;
          const fileName = normalizedDoc.fileName;
          
          if (subType === "IDENTITY_PROOF") {
            mappedApplication.id_proof = fileName;
            mappedApplication.id_proof_type = type.replace("_CARD", "").toLowerCase();
          } else if (subType === "ADDRESS_PROOF") {
            mappedApplication.address_proof = fileName;
            mappedApplication.address_proof_type = type.toLowerCase();
          } else if (subType === "INCOME_PROOF") {
             if (type === "BANK_STATEMENT") mappedApplication.bank_stmt_combined = fileName;
             else if (type === "SALARY_SLIP") mappedApplication.salary_slip_combined = fileName;
             else {
                mappedApplication.income_proof = fileName;
                mappedApplication.income_proof_type = type.toLowerCase();
             }
          } else if (subType === "ASSET_PROOF") {
             if (type === "VEHICLE_QUOTATION") mappedApplication.vehicle_quotation = fileName;
             else if (type === "SALES_DEED") mappedApplication.sales_deed = fileName;
             else if (type === "TAX_RECEIPT") mappedApplication.tax_receipt = fileName;
             else if (type === "AGREEMENT_SALE") mappedApplication.agreement_sale = fileName;
             else if (type === "PROPERTY_CARD") mappedApplication.property_card = fileName;
          } else if (subType === "EDUCATION_PROOF") {
             if (type === "ADMISSION_LETTER") mappedApplication.admission_letter = fileName;
             else if (type === "MARKSHEETS") mappedApplication.marksheets = fileName;
          } else {
            // Generic fallback for other documents
            if (type) {
              mappedApplication[type.toLowerCase()] = fileName;
            }
          }
        });
      }

      // Lowercase dropdown values to match master_values responses where applicable
      // Demographic values like SINGLE, HINDU, GENERAL are usually kept in original case to match Master Keys
      const toLowerFields = [
        "occupation", "org_nature", "education", "business_nature", "profession", "purpose_of_loan"
      ];
      toLowerFields.forEach(f => {
         if (mappedApplication[f] && typeof mappedApplication[f] === "string") {
            mappedApplication[f] = mappedApplication[f].toLowerCase();
         }
      });

      // Handle co-applicants mapping
      if (Array.isArray(application.coapplicants) && application.coapplicants.length > 0) {
         mappedApplication.has_co_applicant = "yes";
         mappedApplication.coapplicants = application.coapplicants.map((co: any) => {
            const mappedCo = mapField(co, {
               "email_id": "email",
               "pan_number": "pan",
               "pan_no": "pan",
               "date_of_birth": "dob",
               "no_of_dependents": "dependents",
               "marital_status": "marital_status",
               "religion": "religion",
               "category": "category",
               "permanent_address_line1": "perm_addr_line1",
               "permanent_address_line2": "perm_addr_line2",
               "permanent_address_line3": "perm_addr_line3",
               "perm_addr_1": "perm_addr_line1",
               "perm_addr_2": "perm_addr_line2",
               "perm_addr_3": "perm_addr_line3",
               "permanent_residence_ownership": "perm_ownership",
               "perm_residence_ownership": "perm_ownership",
               "permanent_pincode": "perm_pincode",
               "perm_pincode": "perm_pincode",
               "pincode": "perm_pincode",
               "curr_addr_1": "pres_addr_line1",
               "curr_address_2": "pres_addr_line2",
               "curr_addr_2": "pres_addr_line2",
               "curr_address_3": "pres_addr_line3",
               "curr_addr_3": "pres_addr_line3",
               "current_residence_ownership": "pres_ownership",
               "curr_residence_ownership": "pres_ownership",
               "educational_qualification": "education",
               "nature_of_org": "org_nature",
               "total_work_exp": "work_exp",
               "remaining_service_period": "service_remaining",
               "work_phone": "office_phone",
               "avg_monthly_income": "avg_monthly_income",
               "existing_monthly_obligations": "existing_monthly_obligations"
            });
            
            if (co.gender) {
               if (co.gender === "M") mappedCo.gender = "male";
               else if (co.gender === "F") mappedCo.gender = "female";
               else mappedCo.gender = "other";
            }

            if (co.date_of_birth || co.dob) {
               mappedCo.dob = toDateInputValue(co.date_of_birth || co.dob);
            }
            
            if (co.permanent_state && /^\d+$/.test(co.permanent_state)) {
               mappedCo.perm_pincode = co.permanent_state;
               mappedCo.perm_state = co.permanent_country; 
            }

            toLowerFields.forEach(f => {
               if (mappedCo[f] && typeof mappedCo[f] === "string") {
                  mappedCo[f] = mappedCo[f].toLowerCase();
               }
            });
            
            return mappedCo;
         });
      }

      state.formData = {
        ...state.formData,
        ...mappedApplication,
        application_id: data.application_id || application.application_id || state.formData.application_id,
        otp_verified: application.mobile_number_verified === "1" ? true : state.formData.otp_verified,
      };

      // Restore Documents from API into formData
      // This allows EligibilityStep to "see" that documents already exist on the server
      const documents = Array.isArray(data.documents) ? data.documents : (Array.isArray(application.documents) ? application.documents : []);
      if (documents.length > 0) {
        const restoredDocuments: RestoredDocument[] = documents.map((doc: any) =>
          normalizeBackendDocument(doc),
        );
        state.formData.uploaded_documents = restoredDocuments;

        restoredDocuments.forEach((doc) => {
          const type = doc.docType;
          const subType = doc.docSubType;
          const fileName = doc.fileName;
          state.formData[`${doc.fieldKey}_path`] = doc.filePath;

          if (subType === "IDENTITY_PROOF") {
            state.formData.id_proof = fileName;
            // Infer type (e.g., PAN_CARD -> PAN)
            const baseType = type.replace("_CARD", "");
            state.formData.id_proof_type = baseType.toLowerCase();
          } else if (subType === "ADDRESS_PROOF") {
            state.formData.address_proof = fileName;
            state.formData.address_proof_type = type.toLowerCase();
          } else if (subType === "INCOME_PROOF") {
            if (type === "BANK_STATEMENT") {
              state.formData.bank_stmt_combined = fileName;
            } else if (type === "SALARY_SLIP") {
              state.formData.salary_slip_combined = fileName;
            } else if (type === "ITR" || type === "FORM16" || type === "FORM_16") {
              state.formData.income_proof = fileName;
              state.formData.income_proof_type = type.toLowerCase().replace("_", "");
            } else {
              state.formData.income_proof = fileName;
              state.formData.income_proof_type = type.toLowerCase();
            }
          } else if (subType === "ASSET_PROOF") {
            const key = type.toLowerCase();
            state.formData[key] = fileName;
            // Also map to common keys if they match
            if (["vehicle_quotation", "sales_deed", "tax_receipt", "agreement_sale", "property_card"].includes(key)) {
                state.formData[key] = fileName;
            }
          } else if (subType === "EDUCATION_PROOF") {
            const key = type.toLowerCase();
            state.formData[key] = fileName;
          } else {
            // Fallback: use lowercased doc_type as key
            state.formData[type.toLowerCase()] = fileName;
          }
        });
      }

      const currentStepKey = application.current_step || data.current_step;
      const currentSectionId = application.section_id || data.section_id || null;
      const restorePosition = resolveRestorePosition(currentStepKey, currentSectionId);
      const mobileVerified = application.mobile_number_verified === "1" || application.mobile_number_verified === true;
      const eligibleAmount = Number(
        String(
          state.formData.eligible_offer?.eligible_loan_amount ??
            application.eligible_loan_amount ??
            "",
        ).replace(/,/g, ""),
      );
      const isEligible =
        state.formData.eligible_offer?.eligible === true ||
        application.eligible === "1" ||
        application.eligible === "true" ||
        application.eligible === true ||
        eligibleAmount > 0;
      const shouldRestoreToOffer =
        isEligible ||
        hasReachedEligibilityOffer ||
        state.formData.has_reached_eligibility_offer === true;

      if (shouldRestoreToOffer) {
        state.formData.has_reached_eligibility_offer = true;
      }

      state.currentStepIndex = restorePosition.currentStepIndex;
      state.currentSubStepKey = restorePosition.currentSubStepKey;
      if (jumpToStep) {
        state.targetStepIndex = null;
      }

      // If this is a new browser session (jumpToStep=false), force re-auth at step 0
      // but remember the target so AuthStep can jump there after successful auth.
      if (!jumpToStep && restorePosition.currentStepIndex > 0) {
        state.targetStepIndex = shouldRestoreToOffer ? 5 : restorePosition.currentStepIndex;
        state.currentStepIndex = 0;
        state.currentSubStepKey = "LOGIN_INITIATE";
        // Mark all prior steps as completed for progress bar accuracy once they re-auth
        state.completedStepIndices = Array.from(
          { length: shouldRestoreToOffer ? 5 : restorePosition.currentStepIndex },
          (_, i) => i,
        );
      }

      if (mobileVerified) {
        state.formData.otp_verified = true;
        state.isOtpSent = true;
      }

      // Guard 1: Submitted/completed application → mark is_submitted so EligibilityStep
      // renders the success screen, and advance to the final step.
      const isCompleted =
        currentStepKey === "SUBMITTED" ||
        currentStepKey === "LOAN_APPLICATION" ||
        application.status === "submitted" ||
        application.status === "completed";

      if (isCompleted) {
        state.formData.is_submitted = true;
        // Always land on the final step so the success screen is shown, not the upload form.
        state.currentStepIndex = 6;
        state.currentSubStepKey = "loan_application_submitted";
        state.targetStepIndex = null;
        // Do NOT restore to doc-upload; return early so Guard 2 doesn't overwrite this.
        return;
      }

      // Guard 2: Once an eligible offer exists, reloads should stay on the
      // offer screen until the user explicitly accepts it.
      if (shouldRestoreToOffer) {
        if (jumpToStep) {
          state.currentStepIndex = 5;
          state.currentSubStepKey = "loan_offer_details";
        } else {
          state.targetStepIndex = 5;
        }
        state.completedStepIndices = Array.from({ length: 5 }, (_, i) => i);
      }
    },
    resetJourney: (state) => {
      state.formData = {};
      state.currentStepIndex = 0;
      state.completedStepIndices = [];
      state.isOtpSent = false;
      state.currentSubStepKey = null;
      state.targetStepIndex = null;
    },
    // We should also persist on other mutations
    nextStep: (state) => {
      // If a re-auth target is pending (set after browser-close), jump straight to it
      if (state.targetStepIndex !== null) {
        state.currentStepIndex = state.targetStepIndex;
        state.targetStepIndex = null;
      } else if (state.config && state.currentStepIndex < state.config.steps.length - 1) {
        state.currentStepIndex += 1;
      }
    },
    prevStep: (state) => {
      if (state.currentStepIndex > 0) {
        state.currentStepIndex -= 1;
      }
    },
    markStepComplete: (state, action: PayloadAction<number>) => {
      if (!state.completedStepIndices.includes(action.payload)) {
        state.completedStepIndices.push(action.payload);
      }
    },
    restoreJourneyState: (state, action: PayloadAction<any>) => {
        const {
          formData,
          currentStepIndex,
          currentSubStepKey,
          completedStepIndices,
          isOtpSent,
        } = action.payload;
        if (formData) state.formData = { ...state.formData, ...formData };
        if (typeof currentStepIndex === "number") state.currentStepIndex = currentStepIndex;
        if (currentSubStepKey !== undefined) state.currentSubStepKey = currentSubStepKey;
        if (Array.isArray(completedStepIndices)) state.completedStepIndices = completedStepIndices;
        if (typeof isOtpSent === "boolean") state.isOtpSent = isOtpSent;
    },
    goToStep: (state, action: PayloadAction<string>) => {
      const index = state.config?.steps.findIndex((s) => s.id === action.payload);
      if (index !== undefined && index !== -1) {
        state.currentStepIndex = index;
      }
    },
  },
});

export const {
  setConfig,
  setOtpSent,
  nextStep,
  prevStep,
  goToStep,
  markStepComplete,
  updateFormData,
  resetJourney,
  restoreJourneyState,
  syncWithApplicationData,
  restoreFromApiData,
} = journeySlice.actions;

export default journeySlice.reducer;

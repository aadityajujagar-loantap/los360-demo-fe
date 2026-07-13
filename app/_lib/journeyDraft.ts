import { getJourneyStorageKey, LoanType } from "./loanType";

export type JourneyDraftState = {
  applicationId?: string;
  formData?: Record<string, unknown>;
  currentStepIndex?: number;
  currentSubStepKey?: string | null;
  completedStepIndices?: number[];
  isOtpSent?: boolean;
  updatedAt?: string;
};

const VOLATILE_FORM_FIELDS = new Set([
  "captcha",
  "captcha_key",
  "otp",
  "aadhar_otp",
]);

export const getJourneyDraftKey = (loanType: LoanType) =>
  `${getJourneyStorageKey(loanType)}_draft`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const sanitizeJourneyDraftFormData = (
  formData?: Record<string, unknown>,
) => {
  if (!formData) return {};

  return Object.fromEntries(
    Object.entries(formData).filter(([key]) => !VOLATILE_FORM_FIELDS.has(key)),
  );
};

export const readJourneyDraft = (
  loanType: LoanType,
  expectedApplicationId?: string,
): JourneyDraftState | null => {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(getJourneyDraftKey(loanType));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as JourneyDraftState;
    if (!isRecord(parsed)) return null;

    if (expectedApplicationId) {
      const draftApplicationId =
        parsed.applicationId ||
        (isRecord(parsed.formData) ? String(parsed.formData.application_id || "") : "");
      if (draftApplicationId && draftApplicationId !== expectedApplicationId) {
        return null;
      }
    } else if (parsed.applicationId) {
      return null;
    }

    return {
      ...parsed,
      formData: sanitizeJourneyDraftFormData(parsed.formData),
    };
  } catch {
    return null;
  }
};

export const writeJourneyDraft = (
  loanType: LoanType,
  draft: JourneyDraftState,
) => {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    getJourneyDraftKey(loanType),
    JSON.stringify({
      ...draft,
      formData: sanitizeJourneyDraftFormData(draft.formData),
      updatedAt: new Date().toISOString(),
    }),
  );
};

export const clearJourneyDraft = (loanType: LoanType) => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getJourneyDraftKey(loanType));
};

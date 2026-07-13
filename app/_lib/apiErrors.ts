const DEFAULT_FIELD_MAP: Record<string, string> = {
  email_id: "email",
  work_phone: "office_phone",
  phone: "mobile",
};

const LOAN_TYPE_LABELS: Record<string, string> = {
  PERSONAL_LOAN: "Personal Loan",
  HOME_LOAN: "Home Loan",
  VEHICLE_LOAN: "Vehicle Loan",
  PROPERTY_MORTGAGE_LOAN: "Property Mortgage Loan",
  EDUCATION_LOAN: "Education Loan",
};

const normalizeErrorSource = (errorOrData: any) => {
  if (!errorOrData) return {};
  if (errorOrData.data?.data) return errorOrData.data.data;
  if (errorOrData.data) return errorOrData.data;
  return errorOrData;
};

export const getBackendErrors = (errorOrData: any) => {
  const source = normalizeErrorSource(errorOrData);
  return source?.errors || errorOrData?.data?.errors || {};
};

export const mapBackendFieldErrors = (
  errorOrData: any,
  fieldMap: Record<string, string> = {},
) => {
  const errors = getBackendErrors(errorOrData);
  const mapped: Record<string, string> = {};

  Object.entries(errors).forEach(([key, value]) => {
    if (key === "exception") return;
    const targetKey = fieldMap[key] || DEFAULT_FIELD_MAP[key] || key;
    mapped[targetKey] = Array.isArray(value)
      ? value.join(" ")
      : String(value ?? "");
  });

  return mapped;
};

const firstBackendFieldError = (errors: Record<string, any>) => {
  for (const [key, value] of Object.entries(errors)) {
    if (key === "exception") continue;
    if (Array.isArray(value) && value.length > 0) return String(value[0]);
    if (value) return String(value);
  }
  return "";
};

const stringifyError = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const getLoanTypeLabel = (loanType?: string) =>
  LOAN_TYPE_LABELS[loanType || ""] ||
  String(loanType || "loan")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const isAlreadyAppliedBackendError = (errorOrData: any, requestBody?: any) => {
  const source = normalizeErrorSource(errorOrData);
  const haystack = stringifyError(source).toLowerCase();
  return (
    requestBody?.step_key === "LOGIN_INITIATE" &&
    (haystack.includes("andwhere") ||
      (haystack.includes("already") && haystack.includes("appl")))
  );
};

export const getApiErrorMessage = (
  errorOrData: any,
  requestBody?: any,
  fallback = "An unexpected error occurred.",
) => {
  if (isAlreadyAppliedBackendError(errorOrData, requestBody)) {
    return `You have already applied for this ${getLoanTypeLabel(requestBody?.loan_type)}.`;
  }

  const source = normalizeErrorSource(errorOrData);
  const errors = getBackendErrors(errorOrData);
  return (
    firstBackendFieldError(errors) ||
    source?.message ||
    errorOrData?.message ||
    errorOrData?.error ||
    fallback
  );
};

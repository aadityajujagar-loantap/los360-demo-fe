export const INDIAN_MOBILE_ERROR =
  "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9";
export const EMAIL_ERROR = "Enter a valid email address";
export const TEN_DIGIT_PHONE_ERROR = "Enter a valid 10-digit phone number";

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sanitizeMobileNumber = (value: unknown) =>
  String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 10);

export const isValidIndianMobile = (value: unknown) =>
  /^[6-9]\d{9}$/.test(String(value ?? ""));

export const getIndianMobileValidationError = (
  value: unknown,
  requiredMessage = "Mobile number is required",
) => {
  const mobile = String(value ?? "");
  if (!mobile) return requiredMessage;
  if (!isValidIndianMobile(mobile)) return INDIAN_MOBILE_ERROR;
  return "";
};

export const isValidEmail = (value: unknown) =>
  EMAIL_REGEX.test(String(value ?? ""));

export const getEmailValidationError = (
  value: unknown,
  requiredMessage = "Email address is required",
) => {
  const email = String(value ?? "").trim();
  if (!email) return requiredMessage;
  if (!isValidEmail(email)) return EMAIL_ERROR;
  return "";
};

export const getOptionalEmailValidationError = (
  value: unknown,
  message = EMAIL_ERROR,
) => {
  const email = String(value ?? "").trim();
  if (!email) return "";
  if (!isValidEmail(email)) return message;
  return "";
};

export const getOptionalTenDigitPhoneValidationError = (
  value: unknown,
  message = TEN_DIGIT_PHONE_ERROR,
) => {
  const phone = String(value ?? "");
  if (!phone) return "";
  if (!/^\d{10}$/.test(phone)) return message;
  return "";
};

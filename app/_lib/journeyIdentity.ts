import { sanitizeMobileNumber } from "./validation/mobile";

export type JourneyIdentity = {
  mobile: string;
  email: string;
};

type IdentityMismatchOptions = {
  requireCompleteActual?: boolean;
};

const MOBILE_KEYS = [
  "mobile",
  "mobile_number",
  "mobile_no",
  "mobileNumber",
  "phone",
  "phone_number",
  "contact_number",
  "applicant_mobile",
  "registered_mobile",
  "customer_mobile",
];

const EMAIL_KEYS = [
  "email",
  "email_id",
  "emailId",
  "work_email",
  "applicant_email",
  "registered_email",
  "customer_email",
];

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const normalizeJourneyMobile = (value: unknown) =>
  sanitizeMobileNumber(String(value ?? "")).slice(-10);

export const normalizeJourneyEmail = (value: unknown) =>
  String(value ?? "").trim().toLowerCase();

export const createJourneyIdentity = ({
  mobile,
  email,
}: {
  mobile: unknown;
  email: unknown;
}): JourneyIdentity => ({
  mobile: normalizeJourneyMobile(mobile),
  email: normalizeJourneyEmail(email),
});

const readValue = (source: unknown, keys: string[]) => {
  const record = asRecord(source);
  if (!record) return "";

  const keyLookup = new Map(
    Object.keys(record).map((key) => [key.toLowerCase(), key]),
  );

  for (const key of keys) {
    const actualKey = keyLookup.get(key.toLowerCase());
    const value = actualKey ? record[actualKey] : undefined;
    if (typeof value === "string" || typeof value === "number") {
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
  }

  return "";
};

const identitySources = (source: unknown) => {
  const root = asRecord(source);
  const data = asRecord(root?.data);
  return [
    asRecord(data?.application),
    data,
    asRecord(root?.application),
    asRecord(root?.applicant),
    asRecord(root?.borrower),
    root,
  ].filter(Boolean) as Record<string, unknown>[];
};

export const extractJourneyIdentity = (source: unknown): JourneyIdentity => {
  let mobile = "";
  let email = "";

  for (const item of identitySources(source)) {
    if (!mobile) mobile = readValue(item, MOBILE_KEYS);
    if (!email) email = readValue(item, EMAIL_KEYS);
    if (mobile && email) break;
  }

  return createJourneyIdentity({ mobile, email });
};

export const getJourneyIdentityMismatch = (
  source: unknown,
  expected: JourneyIdentity,
  options: IdentityMismatchOptions = {},
) => {
  const expectedIdentity = createJourneyIdentity(expected);
  const actualIdentity = extractJourneyIdentity(source);
  const hasExpected = Boolean(expectedIdentity.mobile && expectedIdentity.email);
  const hasActual = Boolean(actualIdentity.mobile && actualIdentity.email);

  if (!hasExpected) return null;
  if (
    (actualIdentity.mobile && actualIdentity.mobile !== expectedIdentity.mobile) ||
    (actualIdentity.email && actualIdentity.email !== expectedIdentity.email)
  ) {
    return { expected: expectedIdentity, actual: actualIdentity };
  }
  if (!hasActual) {
    return options.requireCompleteActual
      ? { expected: expectedIdentity, actual: actualIdentity }
      : null;
  }

  return null;
};

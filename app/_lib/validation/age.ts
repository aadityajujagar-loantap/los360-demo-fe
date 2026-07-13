export const MIN_APPLICANT_AGE = 18;
export const MAX_APPLICANT_AGE_EXCLUSIVE = 80;

export function calculateAge(dob?: string | null, asOf = new Date()) {
  if (!dob) return null;

  const date = new Date(dob);
  if (Number.isNaN(date.getTime())) return null;

  let age = asOf.getFullYear() - date.getFullYear();
  const hasBirthdayPassed =
    asOf.getMonth() > date.getMonth() ||
    (asOf.getMonth() === date.getMonth() && asOf.getDate() >= date.getDate());

  if (!hasBirthdayPassed) age -= 1;

  return age;
}

export function getAgeValidationError(
  dob?: string | null,
  label = "Applicant",
) {
  if (!dob) return "Required";

  const age = calculateAge(dob);
  if (age === null) return "Enter a valid date of birth";
  if (age < MIN_APPLICANT_AGE || age >= MAX_APPLICANT_AGE_EXCLUSIVE) {
    return `${label} age must be 18 years or older and below 80 years`;
  }

  return "";
}

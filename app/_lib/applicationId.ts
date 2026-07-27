const pad2 = (value: number) => String(value).padStart(2, "0");

export const formatApplicationId = (submittedAt = new Date()) => {
  const day = pad2(submittedAt.getDate());
  const month = pad2(submittedAt.getMonth() + 1);
  const year = submittedAt.getFullYear();
  const hour = pad2(submittedAt.getHours());
  const minute = pad2(submittedAt.getMinutes());

  return `APP${day}${month}${year}${hour}${minute}`;
};

export const formatDisplayedApplicationId = (value: unknown) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  if (/^app/i.test(raw)) {
    return `APP${raw.slice(3)}`;
  }

  const legacyCosmosMatch = raw.match(/^COSMOS(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\d*/i);
  if (legacyCosmosMatch) {
    const [, day, month, year, hour, minute] = legacyCosmosMatch;
    return `APP${day}${month}20${year}${hour}${minute}`;
  }

  if (/^\d+$/.test(raw)) {
    return `APP${raw}`;
  }

  return raw;
};

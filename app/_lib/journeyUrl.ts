export const JOURNEY_URL_SUFFIX = "-new";

export const getJourneyTypeFromRouteParam = (
  routeJourneyType: string | string[] | null | undefined,
) => {
  const routeValue = Array.isArray(routeJourneyType)
    ? (routeJourneyType[0] ?? "")
    : (routeJourneyType ?? "");

  if (!routeValue.endsWith(JOURNEY_URL_SUFFIX)) return null;

  const journeyType = routeValue.slice(0, -JOURNEY_URL_SUFFIX.length);
  return journeyType || null;
};

export const buildJourneyHref = (orgSlug: string, journeyType: string) =>
  `/${orgSlug}/apply/${journeyType}${JOURNEY_URL_SUFFIX}`;

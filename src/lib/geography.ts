/**
 * Counterpart-facing geography — F-06 (minimum necessary disclosure).
 *
 * Before mutual connection a member sees only a generalised area, never the
 * counterpart's exact city. After connection, additional precision is
 * disclosed only where the relationship experience genuinely requires it or
 * the member deliberately shares it — connection alone does not authorise
 * more precision than the surface needs.
 *
 * F-05: precise coordinates are not collected, stored, or displayed.
 */

/** Metro groupings: a small city is presented as its surrounding metro area. */
const METRO: Record<string, string> = {
  // Bay Area
  "san francisco": "San Francisco Bay Area",
  oakland: "San Francisco Bay Area",
  berkeley: "San Francisco Bay Area",
  "palo alto": "San Francisco Bay Area",
  "san jose": "San Francisco Bay Area",
  "mountain view": "San Francisco Bay Area",
  "san mateo": "San Francisco Bay Area",
  // Los Angeles
  "los angeles": "Greater Los Angeles",
  pasadena: "Greater Los Angeles",
  "santa monica": "Greater Los Angeles",
  burbank: "Greater Los Angeles",
  "long beach": "Greater Los Angeles",
  glendale: "Greater Los Angeles",
  // New York
  "new york": "New York metro area",
  brooklyn: "New York metro area",
  queens: "New York metro area",
  "jersey city": "New York metro area",
  hoboken: "New York metro area",
  // Other common metros
  cambridge: "Greater Boston",
  somerville: "Greater Boston",
  boston: "Greater Boston",
  bellevue: "Greater Seattle",
  seattle: "Greater Seattle",
  austin: "Austin area",
  chicago: "Chicago area",
  denver: "Denver area",
  miami: "South Florida",
  "fort lauderdale": "South Florida",
};

/**
 * Generalised, counterpart-safe area string. Returns null when nothing can be
 * said without pointing at a place — silence is preferred to precision.
 */
export function generalizeArea(
  city: string | null | undefined,
  region?: string | null,
): string | null {
  const key = (city ?? "").trim().toLowerCase();
  if (key && METRO[key]) return METRO[key];
  const r = (region ?? "").trim();
  if (r) return `${r} area`;
  if (key) return `${(city as string).trim()} area`;
  return null;
}

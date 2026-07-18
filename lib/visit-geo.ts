/** ISO country / territory labels for visit analytics (fallback = code). */
const COUNTRY_NAMES: Record<string, string> = {
  AF: "Afghanistan",
  AL: "Albania",
  DZ: "Algeria",
  AO: "Angola",
  AR: "Argentina",
  AU: "Australia",
  AT: "Austria",
  BD: "Bangladesh",
  BE: "Belgium",
  BJ: "Benin",
  BW: "Botswana",
  BR: "Brazil",
  BF: "Burkina Faso",
  BI: "Burundi",
  CM: "Cameroon",
  CA: "Canada",
  TD: "Chad",
  CL: "Chile",
  CN: "China",
  CO: "Colombia",
  CG: "Congo",
  CD: "DR Congo",
  CI: "Côte d'Ivoire",
  HR: "Croatia",
  CU: "Cuba",
  CY: "Cyprus",
  CZ: "Czechia",
  DK: "Denmark",
  DJ: "Djibouti",
  EG: "Egypt",
  ET: "Ethiopia",
  FI: "Finland",
  FR: "France",
  GA: "Gabon",
  GM: "Gambia",
  DE: "Germany",
  GH: "Ghana",
  GR: "Greece",
  GN: "Guinea",
  HK: "Hong Kong",
  HU: "Hungary",
  IN: "India",
  ID: "Indonesia",
  IE: "Ireland",
  IL: "Israel",
  IT: "Italy",
  JP: "Japan",
  KE: "Kenya",
  KW: "Kuwait",
  LS: "Lesotho",
  LR: "Liberia",
  LY: "Libya",
  MG: "Madagascar",
  MW: "Malawi",
  MY: "Malaysia",
  ML: "Mali",
  MR: "Mauritania",
  MU: "Mauritius",
  MX: "Mexico",
  MA: "Morocco",
  MZ: "Mozambique",
  NA: "Namibia",
  NP: "Nepal",
  NL: "Netherlands",
  NZ: "New Zealand",
  NE: "Niger",
  NG: "Nigeria",
  NO: "Norway",
  OM: "Oman",
  PK: "Pakistan",
  PH: "Philippines",
  PL: "Poland",
  PT: "Portugal",
  QA: "Qatar",
  RO: "Romania",
  RU: "Russia",
  RW: "Rwanda",
  SA: "Saudi Arabia",
  SN: "Senegal",
  SC: "Seychelles",
  SL: "Sierra Leone",
  SG: "Singapore",
  SO: "Somalia",
  ZA: "South Africa",
  KR: "South Korea",
  SS: "South Sudan",
  ES: "Spain",
  SD: "Sudan",
  SE: "Sweden",
  CH: "Switzerland",
  TZ: "Tanzania",
  TH: "Thailand",
  TG: "Togo",
  TN: "Tunisia",
  TR: "Turkey",
  UG: "Uganda",
  AE: "United Arab Emirates",
  GB: "United Kingdom",
  US: "United States",
  ZM: "Zambia",
  ZW: "Zimbabwe",
  XX: "Unknown",
  T1: "Tor / anonymized",
};

export function countryDisplayName(code: string): string {
  const c = code.trim().toUpperCase() || "XX";
  return COUNTRY_NAMES[c] ?? c;
}

export type VisitGeo = {
  countryCode: string;
  /** City or region when edge provides it. */
  location: string;
};

/** Read country / city from CDN edge headers (Vercel, Cloudflare). */
export function visitGeoFromHeaders(headers: Headers): VisitGeo {
  const countryRaw =
    headers.get("x-vercel-ip-country") ||
    headers.get("cf-ipcountry") ||
    headers.get("x-country-code") ||
    headers.get("cloudfront-viewer-country") ||
    "";
  let countryCode = countryRaw.trim().toUpperCase();
  if (!countryCode || countryCode.length !== 2) countryCode = "XX";

  const city =
    headers.get("x-vercel-ip-city") ||
    headers.get("cf-ipcity") ||
    headers.get("x-city") ||
    "";
  const region =
    headers.get("x-vercel-ip-country-region") ||
    headers.get("cf-region") ||
    "";
  let location = decodeUriComponentSafe(city.trim()) || decodeUriComponentSafe(region.trim()) || "";
  if (location.length > 80) location = location.slice(0, 80);

  return { countryCode, location };
}

function decodeUriComponentSafe(value: string): string {
  if (!value) return "";
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

export function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

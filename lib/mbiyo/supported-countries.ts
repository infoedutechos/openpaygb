/**
 * Countries/networks supported by MbiyoPay merchant payin.
 * @see https://dashboard.mbiyo.africa/docs/reference/merchant/payin
 */

export type MbiyoSupportedCountry = {
  code: string;
  dial: string;
  label: string;
  currency: string;
  networks: { value: string; label: string }[];
};

export const MBIYO_SUPPORTED_COUNTRIES: MbiyoSupportedCountry[] = [
  {
    code: "SN",
    dial: "221",
    label: "Senegal",
    currency: "XOF",
    networks: [
      { value: "orange", label: "Orange" },
      { value: "free", label: "Free" },
    ],
  },
  {
    code: "CI",
    dial: "225",
    label: "Côte d'Ivoire",
    currency: "XOF",
    networks: [
      { value: "orange", label: "Orange" },
      { value: "mtn", label: "MTN" },
      { value: "wave", label: "Wave" },
      { value: "moov", label: "Moov" },
    ],
  },
  {
    code: "GH",
    dial: "233",
    label: "Ghana",
    currency: "GHS",
    networks: [
      { value: "mtn", label: "MTN" },
      { value: "vodafone", label: "Vodafone" },
      { value: "tigo", label: "Tigo" },
    ],
  },
  {
    code: "KE",
    dial: "254",
    label: "Kenya",
    currency: "KES",
    networks: [
      { value: "safaricom", label: "Safaricom (M-Pesa)" },
      { value: "airtel", label: "Airtel" },
    ],
  },
  {
    code: "CM",
    dial: "237",
    label: "Cameroon",
    currency: "XAF",
    networks: [
      { value: "orange", label: "Orange" },
      { value: "mtn", label: "MTN" },
    ],
  },
  {
    code: "BF",
    dial: "226",
    label: "Burkina Faso",
    currency: "XOF",
    networks: [
      { value: "orange", label: "Orange" },
      { value: "moov", label: "Moov" },
      { value: "coris", label: "Coris" },
    ],
  },
  {
    code: "BJ",
    dial: "229",
    label: "Benin",
    currency: "XOF",
    networks: [
      { value: "mtn", label: "MTN" },
      { value: "moov", label: "Moov" },
      { value: "celtiis", label: "Celtiis" },
    ],
  },
  {
    code: "ML",
    dial: "223",
    label: "Mali",
    currency: "XOF",
    networks: [
      { value: "orange", label: "Orange" },
      { value: "moov", label: "Moov" },
    ],
  },
  {
    code: "TG",
    dial: "228",
    label: "Togo",
    currency: "XOF",
    networks: [
      { value: "moov", label: "Moov" },
      { value: "togocom", label: "Togocom" },
    ],
  },
  {
    code: "GN",
    dial: "224",
    label: "Guinea",
    currency: "GNF",
    networks: [
      { value: "orange", label: "Orange" },
      { value: "mtn", label: "MTN" },
    ],
  },
  {
    code: "GM",
    dial: "220",
    label: "Gambia",
    currency: "GMD",
    networks: [
      { value: "afrimoney", label: "Afrimoney" },
      { value: "qmoney", label: "QMoney" },
      { value: "wave", label: "Wave" },
      { value: "aps", label: "APS" },
    ],
  },
  {
    code: "CG",
    dial: "242",
    label: "Congo (Brazzaville)",
    currency: "XAF",
    networks: [{ value: "mtn", label: "MTN" }],
  },
  {
    code: "CD",
    dial: "243",
    label: "Congo (DRC)",
    currency: "CDF",
    networks: [
      { value: "vodacom", label: "Vodacom" },
      { value: "airtel", label: "Airtel" },
      { value: "orange", label: "Orange" },
      { value: "africell", label: "Africell" },
    ],
  },
];

export function findMbiyoCountry(code: string): MbiyoSupportedCountry | undefined {
  return MBIYO_SUPPORTED_COUNTRIES.find((c) => c.code === code.toUpperCase());
}

export function isMbiyoCountrySupported(code: string): boolean {
  return Boolean(findMbiyoCountry(code));
}

export function mbiyoCurrencyForCountry(code: string): string {
  return findMbiyoCountry(code)?.currency ?? "XOF";
}

export function mbiyoNetworksForCountry(code: string): { value: string; label: string }[] {
  return findMbiyoCountry(code)?.networks ?? [{ value: "mtn", label: "MTN" }];
}

export function mbiyoSupportedCountryCodes(): string[] {
  return MBIYO_SUPPORTED_COUNTRIES.map((c) => c.code);
}

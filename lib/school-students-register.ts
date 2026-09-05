/** Shared Excel/CSV columns for the holistic school student register. */

export const SCHOOL_STUDENT_REGISTER_HEADERS = [
  "Name",
  "AdmissionNo",
  "Sex",
  "Phone",
  "Email",
  "Address",
  "TelegramId",
  "Class",
  "Stream",
  "ProgrammeCode",
  "Year",
  "Term",
  "Session",
] as const;

/** Import-only column (never exported). */
export const SCHOOL_STUDENT_REGISTER_IMPORT_ONLY = ["PortalPassword"] as const;

export const SCHOOL_STUDENT_REGISTER_TEMPLATE_HEADERS = [
  ...SCHOOL_STUDENT_REGISTER_HEADERS,
  ...SCHOOL_STUDENT_REGISTER_IMPORT_ONLY,
] as const;

export const SCHOOL_STUDENT_REGISTER_SAMPLE_ROW: string[] = [
  "Jane Auma",
  "SCH-2026-0001",
  "female",
  "0772000000",
  "jane@example.com",
  "Kampala",
  "",
  "P.1",
  "MAIN",
  "",
  "1",
  "1",
  "",
  "",
];

export type SchoolStudentRegisterRow = {
  name: string;
  admissionNo: string;
  sex: string;
  phone: string;
  email: string;
  address: string;
  telegramId: string;
  classCode: string;
  streamCode: string;
  programmeCode: string;
  year: number;
  term: number;
  sessionLabel: string;
  portalPassword?: string;
};

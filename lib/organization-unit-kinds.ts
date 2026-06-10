export const ORGANIZATION_UNIT_KINDS = [
  "main_campus",
  "branch",
  "odel_unit",
  "study_campus_center",
  "affiliate",
] as const;

export type OrganizationUnitKind = (typeof ORGANIZATION_UNIT_KINDS)[number];

export const ORGANIZATION_UNIT_KIND_LABELS: Record<OrganizationUnitKind, string> = {
  main_campus: "Main Campus",
  branch: "Branch",
  odel_unit: "ODEL Unit",
  study_campus_center: "Study Campus / Center",
  affiliate: "Affiliate",
};

export function organizationUnitKindLabel(kind: string): string {
  return ORGANIZATION_UNIT_KIND_LABELS[kind as OrganizationUnitKind] ?? kind;
}

export function isChildUnitKind(kind: OrganizationUnitKind): boolean {
  return kind !== "main_campus";
}

"use client";

import { SmisModuleShell } from "@/components/admin/school/SmisModuleShell";

export default function SchoolAuditPage() {
  return (
    <SmisModuleShell
      title="Audit log"
      description="Manual audit notes for bill changes, waivers, and cash adjustments until immutable server logs ship."
      storageKey="odelhub-smis-audit"
      columns={["When", "Actor", "Action", "Student / ref", "Detail"]}
    />
  );
}

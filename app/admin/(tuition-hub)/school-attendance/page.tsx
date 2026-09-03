"use client";

import { SmisModuleShell } from "@/components/admin/school/SmisModuleShell";

export default function SchoolAttendancePage() {
  return (
    <SmisModuleShell
      title="Attendance"
      description="Mark daily class attendance. Ties to class/stream from school structure."
      storageKey="odelhub-smis-attendance"
      columns={["Date", "Class", "Student", "Status (Present/Absent/Late)"]}
    />
  );
}

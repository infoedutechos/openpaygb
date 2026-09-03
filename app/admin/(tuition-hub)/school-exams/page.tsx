"use client";

import { SmisModuleShell } from "@/components/admin/school/SmisModuleShell";

export default function SchoolExamsPage() {
  return (
    <SmisModuleShell
      title="Examinations"
      description="Record exam results by class and subject. Import from Results App remains available elsewhere."
      storageKey="odelhub-smis-exams"
      columns={["Exam", "Class", "Student", "Subject", "Score"]}
    />
  );
}

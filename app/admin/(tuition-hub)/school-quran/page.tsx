"use client";

import { SmisModuleShell } from "@/components/admin/school/SmisModuleShell";

export default function SchoolQuranPage() {
  return (
    <SmisModuleShell
      title="Qur'an memorisation progress"
      description="Track hifz / revision progress for Uwais and similar centres."
      storageKey="odelhub-smis-quran"
      columns={["Student", "Surah / Juz", "Pages / Ayat", "Teacher note"]}
    />
  );
}

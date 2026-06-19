"use client";

import { SchoolStructureManager } from "@/components/admin/SchoolStructureManager";

export default function AdminSchoolStructurePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">School structure</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Manage academic year, classes, and streams for your primary or secondary school. Streams automatically create
          checkout programmes — set term fees under Programs.
        </p>
      </div>
      <SchoolStructureManager />
    </div>
  );
}

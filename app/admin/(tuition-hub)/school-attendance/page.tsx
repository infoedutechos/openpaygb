"use client";

import { SchoolAttendanceRoster } from "@/components/admin/school/SchoolAttendanceRoster";

export default function SchoolAttendancePage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold text-white">Attendance</h1>
      <p className="text-sm text-slate-400">Mark daily class attendance by roster.</p>
      <SchoolAttendanceRoster />
    </div>
  );
}

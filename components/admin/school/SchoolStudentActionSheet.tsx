"use client";

import { useState } from "react";
import { ModalHeader } from "@/components/nav/ModalHeader";

type Props = {
  studentId: string;
  studentName: string;
  open: boolean;
  onClose: () => void;
  onAssignBill: () => void;
  onPayBill: () => void;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
};

export function SchoolStudentActionSheet({
  studentName,
  open,
  onClose,
  onAssignBill,
  onPayBill,
  onEdit,
  onDelete,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!open) return null;

  if (confirmDelete) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
        <div className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-[#0a101f] p-4">
          <ModalHeader
            onBack={() => setConfirmDelete(false)}
            title="Delete student?"
            subtitle={`Are you sure you want to delete ${studentName}? This cannot be undone.`}
          />
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                void (async () => {
                  setDeleting(true);
                  try {
                    await onDelete();
                  } finally {
                    setDeleting(false);
                    setConfirmDelete(false);
                  }
                })();
              }}
              className="rounded-lg bg-rose-700 px-4 py-3 text-left text-sm font-semibold text-white disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300"
            >
              No, keep student
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a101f] p-4">
        <ModalHeader onBack={onClose} title={studentName} subtitle="Choose an action" />
        <div className="mt-3 flex flex-col gap-2">
          <button type="button" onClick={onAssignBill} className="rounded-lg bg-violet-600 px-4 py-3 text-left text-sm font-semibold text-white">
            Assign bill
          </button>
          <button type="button" onClick={onPayBill} className="rounded-lg bg-emerald-700 px-4 py-3 text-left text-sm font-semibold text-white">
            Record payment
          </button>
          <button type="button" onClick={onEdit} className="rounded-lg bg-violet-800/60 px-4 py-3 text-left text-sm text-white">
            Edit
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg bg-rose-900/40 px-4 py-3 text-left text-sm text-rose-200"
          >
            Delete
          </button>
          <button type="button" onClick={onClose} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-400">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

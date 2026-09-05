"use client";

type Props = {
  studentId: string;
  studentName: string;
  open: boolean;
  onClose: () => void;
  onAssignBill: () => void;
  onPayBill: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a101f] p-4">
        <p className="font-semibold text-white">{studentName}</p>
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
          <button type="button" onClick={onDelete} className="rounded-lg bg-rose-900/40 px-4 py-3 text-left text-sm text-rose-200">
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

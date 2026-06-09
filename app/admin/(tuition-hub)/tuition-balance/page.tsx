import { AdminTuitionBalancesView } from "@/components/admin/AdminTuitionBalancesView";

export const metadata = {
  title: "Tuition balance — Admin",
  description: "Paid vs remaining tuition by student, year, semester, and installments.",
};

export default function AdminTuitionBalancePage() {
  return <AdminTuitionBalancesView />;
}

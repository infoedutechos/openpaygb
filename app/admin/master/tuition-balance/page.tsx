import { AdminTuitionBalancesView } from "@/components/admin/AdminTuitionBalancesView";

export const metadata = {
  title: "Tuition balance — Master",
  description: "Platform-wide paid vs remaining tuition balances.",
};

export default function MasterTuitionBalancePage() {
  return <AdminTuitionBalancesView masterLayout studentDetailBase="/admin/students" />;
}

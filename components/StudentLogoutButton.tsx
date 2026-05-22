"use client";

import { useRouter } from "next/navigation";
import { choiceActionCard } from "@/components/choice-cards";

export function StudentLogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/student-logout", { method: "POST", credentials: "include" });
    router.replace("/student/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={() => void logout()} className={choiceActionCard}>
      Sign out
    </button>
  );
}

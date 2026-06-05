"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { AuthMeJson } from "@/lib/auth-me";
import { PUBLIC_SCHOOL_LOGIN_PATH } from "@/lib/admin-auth-entry";
import { useAuthMe } from "@/hooks/useAuthMe";

const DEFAULT_SIGN_IN_HINT =
  "Sign in with your tuition hub admin account (email and password) to continue.";

export function useTuitionAdminGate() {
  const router = useRouter();
  const { data: authMe, loading } = useAuthMe();

  const ensureTuitionSession = useCallback(
    (opts?: { message?: string }):
      | { ok: true; auth: AuthMeJson }
      | { ok: false; error: string; redirecting: boolean } => {
      if (loading) {
        return { ok: false, error: "", redirecting: false };
      }
      if (!authMe) {
        router.replace(PUBLIC_SCHOOL_LOGIN_PATH);
        return { ok: false, error: "", redirecting: true };
      }
      if (!authMe.tuitionSession) {
        if (!authMe.adminShellAccess) {
          router.replace(PUBLIC_SCHOOL_LOGIN_PATH);
          return { ok: false, error: "", redirecting: true };
        }
        return {
          ok: false,
          error: opts?.message ?? DEFAULT_SIGN_IN_HINT,
          redirecting: false,
        };
      }
      return { ok: true, auth: authMe };
    },
    [authMe, loading, router],
  );

  return {
    authMe,
    loading,
    isMaster: authMe?.admin?.role === "master",
    tuitionSession: Boolean(authMe?.tuitionSession),
    manualConfirmAllowed: authMe?.paymentOps?.manualConfirmAllowed !== false,
    ensureTuitionSession,
  };
}

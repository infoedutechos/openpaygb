import { redirect } from "next/navigation";
import { SCHOOL_ADMIN_LOGIN_PATH } from "@/lib/admin-auth-entry";

type SearchParams = Record<string, string | string[] | undefined>;

function appendSearchParams(base: string, searchParams: SearchParams): string {
  const extra = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (key === "school") continue;
    if (typeof value === "string") extra.set(key, value);
    else if (Array.isArray(value)) {
      for (const v of value) extra.append(key, v);
    }
  }
  const q = extra.toString();
  return q ? `${base}&${q}` : base;
}

/** Friendly URL for school staff — same form as `/admin/login?school=1`. */
export default async function SchoolLoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  redirect(appendSearchParams(SCHOOL_ADMIN_LOGIN_PATH, sp));
}

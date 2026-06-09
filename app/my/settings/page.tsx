import { redirect } from "next/navigation";

/** Password settings moved to Profile. */
export default function MySettingsRedirectPage() {
  redirect("/my/profile#password");
}

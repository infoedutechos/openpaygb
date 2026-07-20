import { describe, expect, it } from "vitest";
import { ADMIN_CARD_PROGRAMME, isNonTuitionCardProgramme } from "@/lib/admin-openpay-holder";

describe("admin openpay holder", () => {
  it("flags admin and guest programmes as non-tuition", () => {
    expect(ADMIN_CARD_PROGRAMME).toBe("ADMIN_CARD");
    expect(isNonTuitionCardProgramme("ADMIN_CARD")).toBe(true);
    expect(isNonTuitionCardProgramme("GUEST")).toBe(true);
    expect(isNonTuitionCardProgramme("BSC-CS")).toBe(false);
  });

  it("reads orgSlug or organizationSlug from request URL", async () => {
    const { organizationSlugFromRequest } = await import("@/lib/admin-openpay-holder");
    expect(
      organizationSlugFromRequest(new Request("https://x.test/api?orgSlug=Acme-School")),
    ).toBe("acme-school");
    expect(
      organizationSlugFromRequest(new Request("https://x.test/api?organizationSlug=Other")),
    ).toBe("other");
    expect(organizationSlugFromRequest(new Request("https://x.test/api"))).toBeNull();
  });
});

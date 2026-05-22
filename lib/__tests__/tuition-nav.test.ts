import { describe, it, expect } from "vitest";
import { payProgrammesHref, payTenantBasePath } from "@/lib/tuition-nav";

describe("tuition-nav", () => {
  it("payTenantBasePath defaults for non-pay routes", () => {
    expect(payTenantBasePath("/")).toBe("/pay/default");
    expect(payTenantBasePath("/student/login")).toBe("/pay/default");
    expect(payTenantBasePath(null)).toBe("/pay/default");
  });

  it("payTenantBasePath preserves slug under /pay/[orgSlug]", () => {
    expect(payTenantBasePath("/pay/default")).toBe("/pay/default");
    expect(payTenantBasePath("/pay/acme-school")).toBe("/pay/acme-school");
    expect(payTenantBasePath("/pay/acme/extra")).toBe("/pay/acme");
  });

  it("payProgrammesHref adds programmes query", () => {
    expect(payProgrammesHref("/pay/default")).toBe("/pay/default?programmes=1");
    expect(payProgrammesHref("/pay/org-one")).toBe("/pay/org-one?programmes=1");
  });
});

import { describe, expect, it } from "vitest";
import {
  parseFromAddress,
  resolveTransactionalEmailProvider,
} from "@/lib/transactional-email";

describe("parseFromAddress", () => {
  it("parses name and email", () => {
    expect(parseFromAddress("ODEL HUB <noreply@odelhub.test>")).toEqual({
      name: "ODEL HUB",
      email: "noreply@odelhub.test",
    });
  });

  it("defaults name for plain email", () => {
    expect(parseFromAddress("noreply@odelhub.test")).toEqual({
      name: "ODEL HUB",
      email: "noreply@odelhub.test",
    });
  });
});

describe("resolveTransactionalEmailProvider", () => {
  it("prefers brevo in auto mode when both keys exist", () => {
    expect(
      resolveTransactionalEmailProvider({
        emailProvider: "auto",
        brevoApiKey: "x",
        resendApiKey: "y",
      }),
    ).toBe("brevo");
  });

  it("uses resend when only resend key is set", () => {
    expect(
      resolveTransactionalEmailProvider({
        emailProvider: "auto",
        resendApiKey: "y",
      }),
    ).toBe("resend");
  });

  it("honours explicit provider", () => {
    expect(
      resolveTransactionalEmailProvider({
        emailProvider: "resend",
        brevoApiKey: "x",
        resendApiKey: "y",
      }),
    ).toBe("resend");
  });
});

import { describe, expect, it } from "vitest";
import { deserializeRecord } from "@/lib/backup/deserialize";
import { countCollections, parseTuitionBackupSnapshot } from "@/lib/backup/parse-snapshot";
import { serializeRecord } from "@/lib/backup/serialize";

const SAMPLE = {
  meta: {
    exportedAt: "2026-05-18T12:00:00.000Z",
    app: "ODELHUB Pay",
    version: 2,
    scope: "tuition",
    note: "test",
    counts: {},
  },
  data: {
    organizations: [
      {
        id: "665000000000000000000001",
        name: "Test School",
        slug: "test-school",
        destinationWallet: "UQtest",
        tenantStatus: "active",
        registrationContactEmail: "",
        registrationNote: "",
        checkoutPlatformFeeUgx: -1,
        fxOverrideKind: "inherit",
        fxOverrideBufferPct: 0,
        createdAt: "2026-05-18T12:00:00.000Z",
        updatedAt: "2026-05-18T12:00:00.000Z",
      },
    ],
    programmes: [
      {
        id: "665000000000000000000002",
        organizationId: "665000000000000000000001",
        code: "BSC-TEST",
        name: "BSc Test",
        track: "regular",
        createdAt: "2026-05-18T12:00:00.000Z",
        updatedAt: "2026-05-18T12:00:00.000Z",
      },
    ],
    programmeFees: [],
    students: [],
    payments: [],
    fxRates: [],
    siteUiSettings: [],
    adminUsers: [],
    processedWebhooks: [],
    studentSignupTokens: [],
    partnerApiKeys: [],
    partnerWebhookEndpoints: [],
    mobileMoneyProviders: [],
    partnerWebhookDeliveries: [],
  },
};

describe("backup parse", () => {
  it("accepts valid tuition snapshot", () => {
    const r = parseTuitionBackupSnapshot(SAMPLE);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.snapshot.collections.organizations).toHaveLength(1);
      expect(countCollections(r.snapshot.collections).organizations).toBe(1);
    }
  });

  it("rejects wrong scope", () => {
    const r = parseTuitionBackupSnapshot({ ...SAMPLE, meta: { ...SAMPLE.meta, scope: "game" } });
    expect(r.ok).toBe(false);
  });
});

describe("serialize round-trip", () => {
  it("restores dates and bytes", () => {
    const d = new Date("2026-05-18T12:00:00.000Z");
    const buf = Buffer.from("abc");
    const serialized = serializeRecord({ at: d, icon: buf }) as { at: string; icon: { __type: string; base64: string } };
    const back = deserializeRecord(serialized) as { at: Date; icon: Buffer };
    expect(back.at.toISOString()).toBe(d.toISOString());
    expect(back.icon.toString()).toBe("abc");
  });
});

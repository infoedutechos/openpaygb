import { describe, expect, it } from "vitest";
import { tuneMongoDatabaseUrl } from "@/lib/mongodb-connection-url";

describe("tuneMongoDatabaseUrl", () => {
  it("adds pool and timeout defaults to mongodb+srv URLs", () => {
    const out = tuneMongoDatabaseUrl("mongodb+srv://user:pass@cluster.example.net/odelhub");
    const url = new URL(out);
    expect(url.searchParams.get("maxPoolSize")).toBe("20");
    expect(url.searchParams.get("serverSelectionTimeoutMS")).toBe("8000");
    expect(url.searchParams.get("retryWrites")).toBe("true");
  });

  it("does not override explicit driver params", () => {
    const out = tuneMongoDatabaseUrl(
      "mongodb+srv://user:pass@cluster.example.net/db?maxPoolSize=99",
    );
    expect(new URL(out).searchParams.get("maxPoolSize")).toBe("99");
  });
});

import { describe, expect, it } from "vitest";
import {
  PROJECT_DOWNLOAD_CATALOGUE,
  PROJECT_DOWNLOAD_PART_IDS,
  isProjectDownloadPart,
  listCatalogueGridParts,
  partsForCategoryZip,
} from "@/lib/master-download-catalogue";

describe("master-download-catalogue", () => {
  it("organises the whole project into five categories", () => {
    expect(PROJECT_DOWNLOAD_CATALOGUE.map((c) => c.id)).toEqual([
      "bundle",
      "documentation",
      "data",
      "credentials",
      "source",
    ]);
  });

  it("includes demo-logins in credentials and the full part list", () => {
    expect(PROJECT_DOWNLOAD_PART_IDS).toContain("demo-logins");
    const credentials = PROJECT_DOWNLOAD_CATALOGUE.find((c) => c.id === "credentials");
    expect(credentials?.parts).toContain("demo-logins");
    expect(credentials?.parts).toContain("env");
    expect(credentials?.parts).toContain("master-admins");
  });

  it("exposes category ZIP parts that expand to atomic downloads", () => {
    expect(partsForCategoryZip("cat-documentation")).toEqual([
      "project-description",
      "user-guides",
      "documentation",
    ]);
    expect(partsForCategoryZip("cat-credentials")).toContain("demo-logins");
    expect(isProjectDownloadPart("cat-data")).toBe(true);
    expect(isProjectDownloadPart("nope")).toBe(false);
  });

  it("lists every grid part without duplicates", () => {
    const grid = listCatalogueGridParts();
    const ids = grid.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("full");
    expect(ids).toContain("demo-logins");
    expect(ids).toContain("documentation");
  });
});

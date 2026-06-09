import { describe, expect, it } from "vitest";
import {
  PROJECT_DESCRIPTION_REL,
  USER_GUIDE_FILES,
  listAllDocumentationMarkdown,
} from "@/lib/project-documentation";

describe("project-documentation", () => {
  it("lists markdown files under docs/", () => {
    const files = listAllDocumentationMarkdown();
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain(PROJECT_DESCRIPTION_REL);
  });

  it("includes all canonical user guide files", () => {
    const files = listAllDocumentationMarkdown();
    for (const rel of USER_GUIDE_FILES) {
      expect(files).toContain(rel);
    }
  });
});

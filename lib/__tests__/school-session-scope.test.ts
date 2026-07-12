import { describe, expect, it } from "vitest";
import {
  currentAcademicYearLabel,
  schoolClassSessionWhere,
  schoolSessionWhere,
} from "@/lib/school-session-scope";

describe("school-session-scope", () => {
  it("returns empty filter when sessionId is missing", () => {
    expect(schoolSessionWhere(null)).toEqual({});
    expect(schoolSessionWhere(undefined)).toEqual({});
    expect(schoolClassSessionWhere("")).toEqual({});
  });

  it("includes active session and legacy null rows", () => {
    const sessionId = "sess-abc";
    expect(schoolSessionWhere(sessionId)).toEqual({
      OR: [{ schoolSessionId: sessionId }, { schoolSessionId: null }],
    });
    expect(schoolClassSessionWhere(sessionId)).toEqual({
      OR: [{ schoolSessionId: sessionId }, { schoolSessionId: null }],
    });
  });

  it("formats academic year label from calendar", () => {
    const label = currentAcademicYearLabel();
    expect(label).toMatch(/^\d{4}\/\d{4}$/);
  });
});

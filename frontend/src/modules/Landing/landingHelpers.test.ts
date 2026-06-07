import { describe, expect, it } from "vitest";

import { formatEventCaseDate } from "./utils/landingHelpers";

describe("landingHelpers", () => {
  it("formats event case dates in Korean local time", () => {
    expect(formatEventCaseDate("2026-05-16T00:00:00+09:00")).toBe(
      "2026.05.16 (토)",
    );
  });

  it("returns invalid date strings as-is", () => {
    expect(formatEventCaseDate("not-a-date")).toBe("not-a-date");
  });
});

import { describe, expect, it } from "vitest";

import {
  ATTENDEE_RANGE_OPTIONS,
  formatAttendeeRangeCount,
  isAttendeeRangeValue,
} from "./attendeeRange";

describe("attendeeRange", () => {
  it("uses the same range values as the manager application form", () => {
    expect(ATTENDEE_RANGE_OPTIONS.map((option) => option.value)).toEqual([
      "50",
      "100",
      "200",
      "201",
    ]);
  });

  it("formats stored range sentinel values as attendee ranges", () => {
    expect(formatAttendeeRangeCount(50)).toBe("50명 이하");
    expect(formatAttendeeRangeCount(100)).toBe("51-100명");
    expect(formatAttendeeRangeCount(200)).toBe("101-200명");
    expect(formatAttendeeRangeCount(201)).toBe("201명 이상");
  });

  it("keeps unset and legacy exact numbers readable", () => {
    expect(formatAttendeeRangeCount(undefined)).toBe("미설정");
    expect(formatAttendeeRangeCount(123)).toBe("123명");
    expect(isAttendeeRangeValue("100")).toBe(true);
    expect(isAttendeeRangeValue("123")).toBe(false);
  });
});

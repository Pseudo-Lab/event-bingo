import { describe, expect, it } from "vitest";
import { getEventDateParts, getEventTimeRangeLabel } from "./adminEventDate";

describe("getEventDateParts", () => {
  it("formats the event date using the Seoul timezone", () => {
    expect(getEventDateParts("2026-03-11T15:00:00.000Z")).toEqual({
      yearLabel: "2026년",
      monthLabel: "3월",
      day: "12",
      weekday: "Thu",
    });
  });

  it("returns fallback values for invalid input", () => {
    expect(getEventDateParts("not-a-date")).toEqual({
      yearLabel: "",
      monthLabel: "",
      day: "--",
      weekday: "",
    });
  });
});

describe("getEventTimeRangeLabel", () => {
  it("formats the event time range with a fixed 24-hour Seoul time", () => {
    expect(
      getEventTimeRangeLabel(
        "2026-06-05T06:00:00.000Z",
        "2026-06-05T09:00:00.000Z",
      ),
    ).toBe("15:00 - 18:00");
  });

  it("returns the original start value when the range is invalid", () => {
    expect(getEventTimeRangeLabel("not-a-date", "also-invalid")).toBe(
      "not-a-date",
    );
  });
});

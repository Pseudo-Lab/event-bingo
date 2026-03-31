import { describe, expect, it } from "vitest";
import { getEventDateParts } from "./adminEventDate";

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

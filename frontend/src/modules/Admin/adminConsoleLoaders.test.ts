import { describe, expect, it } from "vitest";

import {
  normalizeAdminEventId,
  shouldFetchAdminEventDetail,
  shouldLoadAdminApplications,
  shouldLoadAdminEvents,
  shouldLoadAdminMembers,
} from "./adminConsoleLoaders";

describe("adminConsoleLoaders", () => {
  it("loads only the console data needed for each section", () => {
    expect(shouldLoadAdminEvents("dashboard")).toBe(true);
    expect(shouldLoadAdminEvents("event-settings")).toBe(true);
    expect(shouldLoadAdminEvents("policies")).toBe(false);

    expect(shouldLoadAdminMembers("dashboard", "admin")).toBe(true);
    expect(shouldLoadAdminMembers("members", "admin")).toBe(true);
    expect(shouldLoadAdminMembers("event-settings", "admin")).toBe(false);
    expect(shouldLoadAdminMembers("dashboard", "event_manager")).toBe(false);

    expect(shouldLoadAdminApplications("dashboard", "admin")).toBe(true);
    expect(shouldLoadAdminApplications("applications", "admin")).toBe(true);
    expect(shouldLoadAdminApplications("members", "admin")).toBe(false);
    expect(shouldLoadAdminApplications("dashboard", "event_manager")).toBe(false);
  });

  it("normalizes event ids before deciding whether detail fetch is needed", () => {
    expect(normalizeAdminEventId("17")).toBe(17);
    expect(normalizeAdminEventId("0")).toBeNull();
    expect(normalizeAdminEventId("abc")).toBeNull();

    expect(shouldFetchAdminEventDetail(null, "17")).toBe(true);
    expect(shouldFetchAdminEventDetail(17, "17")).toBe(false);
    expect(shouldFetchAdminEventDetail(17, "18")).toBe(true);
    expect(shouldFetchAdminEventDetail(17, "not-a-number")).toBe(false);
  });
});

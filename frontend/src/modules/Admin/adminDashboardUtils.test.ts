import { describe, expect, it } from "vitest";

import type { AdminEvent } from "./adminTypes";
import {
  buildAdminDashboardSummary,
  filterAdminDashboardEventsByStatus,
  sortAdminDashboardEventsByRecency,
} from "./adminDashboardUtils";

const makeEvent = (overrides: Partial<AdminEvent>): AdminEvent => ({
  id: 1,
  slug: "sample-event",
  name: "샘플 행사",
  createdById: 1,
  createdByEmail: "owner@example.com",
  createdByName: "운영자",
  eventDate: "2026-03-01T09:00:00+09:00",
  startAt: "2026-03-01T09:00:00+09:00",
  endAt: "2026-03-01T12:00:00+09:00",
  location: "서울",
  eventTeam: "DevFactory",
  adminEmail: "owner@example.com",
  boardSize: 3,
  bingoMissionCount: 2,
  restrictBeforeStart: true,
  keywords: ["AI", "네트워킹", "커뮤니티"],
  participantCount: 0,
  progressCurrent: 0,
  progressTotal: 0,
  status: "scheduled",
  canEdit: true,
  canDelete: true,
  ...overrides,
});

describe("adminDashboardUtils", () => {
  it("summarizes all visible events for dashboard metrics", () => {
    const summary = buildAdminDashboardSummary([
      makeEvent({
        id: 1,
        status: "in_progress",
        participantCount: 24,
        progressCurrent: 12,
        progressTotal: 24,
      }),
      makeEvent({
        id: 2,
        status: "scheduled",
        participantCount: 6,
        progressCurrent: 0,
        progressTotal: 6,
      }),
      makeEvent({
        id: 3,
        status: "ended",
        participantCount: 10,
        progressCurrent: 3,
        progressTotal: 10,
      }),
    ]);

    expect(summary).toEqual({
      totalEventCount: 3,
      statusCounts: {
        ended: 1,
        in_progress: 1,
        scheduled: 1,
      },
      totalParticipantCount: 40,
      totalBingoCompletionCount: 15,
      totalProgressTarget: 40,
      completionRate: 38,
    });
  });

  it("keeps empty dashboard metrics at zero", () => {
    expect(buildAdminDashboardSummary([])).toEqual({
      totalEventCount: 0,
      statusCounts: {
        ended: 0,
        in_progress: 0,
        scheduled: 0,
      },
      totalParticipantCount: 0,
      totalBingoCompletionCount: 0,
      totalProgressTarget: 0,
      completionRate: 0,
    });
  });

  it("filters events by dashboard status", () => {
    const events = [
      makeEvent({ id: 1, status: "in_progress" }),
      makeEvent({ id: 2, status: "scheduled" }),
      makeEvent({ id: 3, status: "ended" }),
    ];

    expect(filterAdminDashboardEventsByStatus(events, "all")).toHaveLength(3);
    expect(filterAdminDashboardEventsByStatus(events, "ended")).toEqual([
      events[2],
    ]);
  });

  it("sorts recent dashboard events without mutating the source list", () => {
    const events = [
      makeEvent({
        id: 1,
        name: "베타 행사",
        startAt: "2026-03-02T09:00:00+09:00",
      }),
      makeEvent({
        id: 2,
        name: "알파 행사",
        startAt: "2026-03-02T09:00:00+09:00",
      }),
      makeEvent({
        id: 3,
        name: "최신 행사",
        startAt: "2026-04-01T09:00:00+09:00",
      }),
    ];

    expect(
      sortAdminDashboardEventsByRecency(events).map((event) => event.id),
    ).toEqual([3, 1, 2]);
    expect(events.map((event) => event.id)).toEqual([1, 2, 3]);
  });
});

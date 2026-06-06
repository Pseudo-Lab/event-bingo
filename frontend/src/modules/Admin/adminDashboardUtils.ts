import type { AdminEvent, AdminEventStatus } from "./adminTypes";

export type AdminDashboardStatusFilter = "all" | AdminEventStatus;

export const ADMIN_DASHBOARD_STATUS_FILTERS: Array<{
  key: AdminDashboardStatusFilter;
  label: string;
}> = [
  { key: "all", label: "전체" },
  { key: "in_progress", label: "진행 중" },
  { key: "scheduled", label: "예정" },
  { key: "ended", label: "종료" },
];

export type AdminDashboardSummary = {
  totalEventCount: number;
  statusCounts: Record<AdminEventStatus, number>;
  totalParticipantCount: number;
  totalBingoCompletionCount: number;
  totalProgressTarget: number;
  completionRate: number;
};

export const buildAdminDashboardSummary = (
  events: AdminEvent[],
): AdminDashboardSummary => {
  const statusCounts: Record<AdminEventStatus, number> = {
    ended: 0,
    in_progress: 0,
    scheduled: 0,
  };

  let totalParticipantCount = 0;
  let totalBingoCompletionCount = 0;
  let totalProgressTarget = 0;

  events.forEach((eventItem) => {
    statusCounts[eventItem.status] += 1;
    totalParticipantCount += eventItem.participantCount;
    totalBingoCompletionCount += eventItem.progressCurrent;
    totalProgressTarget += eventItem.progressTotal;
  });

  return {
    totalEventCount: events.length,
    statusCounts,
    totalParticipantCount,
    totalBingoCompletionCount,
    totalProgressTarget,
    completionRate:
      totalProgressTarget > 0
        ? Math.round((totalBingoCompletionCount / totalProgressTarget) * 100)
        : 0,
  };
};

export const filterAdminDashboardEventsByStatus = (
  events: AdminEvent[],
  statusFilter: AdminDashboardStatusFilter,
) => {
  if (statusFilter === "all") {
    return events;
  }

  return events.filter((eventItem) => eventItem.status === statusFilter);
};

export const sortAdminDashboardEventsByRecency = (events: AdminEvent[]) => {
  return [...events].sort((left, right) => {
    const leftTime = new Date(left.startAt).getTime();
    const rightTime = new Date(right.startAt).getTime();

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return left.name.localeCompare(right.name, "ko-KR");
  });
};

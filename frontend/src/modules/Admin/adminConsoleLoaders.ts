import type { AdminRole } from "./adminTypes";

export type AdminConsoleSection =
  | "dashboard"
  | "members"
  | "applications"
  | "event-settings"
  | "policies";

export const shouldLoadAdminEvents = (section: AdminConsoleSection) =>
  section === "dashboard" || section === "event-settings";

export const shouldLoadAdminMembers = (
  section: AdminConsoleSection,
  role: AdminRole
) => role === "admin" && (section === "dashboard" || section === "members");

export const shouldLoadAdminApplications = (
  section: AdminConsoleSection,
  role: AdminRole
) => role === "admin" && (section === "dashboard" || section === "applications");

export const normalizeAdminEventId = (value?: string | number | null) => {
  const nextEventId = Number(value);
  if (!Number.isInteger(nextEventId) || nextEventId <= 0) {
    return null;
  }

  return nextEventId;
};

export const shouldFetchAdminEventDetail = (
  currentEventId: number | null | undefined,
  nextEventId: string | number | null | undefined
) => {
  const normalizedEventId = normalizeAdminEventId(nextEventId);
  if (normalizedEventId === null) {
    return false;
  }

  return currentEventId !== normalizedEventId;
};

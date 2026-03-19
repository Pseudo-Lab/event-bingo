export type AdminRole = "admin" | "event_manager";
export type AdminPublishState = "draft" | "published" | "archived";
export type AdminApplicationStatus = "pending" | "approved" | "rejected";

export type AdminMember = {
  id: number;
  email: string;
  name: string;
  phone: string;
  createdAt: string;
  role: AdminRole;
};

export type StoredAdminMember = AdminMember & {
  password: string;
};

export type AdminSession = {
  id: number;
  email: string;
  name: string;
  role: AdminRole;
  accessToken: string;
};

export type AdminEventStatus = "ended" | "in_progress" | "scheduled";

export type AdminEventParticipant = {
  id: number;
  name: string;
  userCode: string;
  progressPercent: number;
  keywords: string[];
};

export type AdminEventBingoRow = {
  lineLabel: string;
  count: number;
  rate: number;
  isComplete: boolean;
};

export type AdminEventKeywordRow = {
  rank: number;
  keyword: string;
  count: number;
};

export type AdminEventAnalytics = {
  reviewParticipants: number;
  averageReviewScore: number;
  participationRate: number;
  totalKeywordSelections: number;
  operatingMinutes: number;
  bingoRows: AdminEventBingoRow[];
  keywordRows: AdminEventKeywordRow[];
};

export type AdminEventManagerRequest = {
  id: number;
  name: string;
  email: string;
  organization?: string;
  eventName: string;
  eventPurpose: string;
  expectedEventDate?: string;
  expectedAttendeeCount?: number;
  notes?: string;
  status: AdminApplicationStatus;
  reviewNote?: string;
  reviewedAt?: string;
  reviewedByName?: string;
  createdAt: string;
};

export type AdminEvent = {
  id: number;
  slug: string;
  name: string;
  createdById: number;
  createdByEmail: string;
  createdByName: string;
  eventDate: string;
  startAt: string;
  endAt: string;
  location: string;
  eventTeam: string;
  adminEmail: string;
  boardSize: 3 | 5;
  bingoMissionCount: number;
  keywords: string[];
  participantCount: number;
  progressCurrent: number;
  progressTotal: number;
  status: AdminEventStatus;
  publishState: AdminPublishState;
  isPublished: boolean;
  canEdit: boolean;
  publicPath?: string;
  participants?: AdminEventParticipant[];
  analytics?: AdminEventAnalytics;
};

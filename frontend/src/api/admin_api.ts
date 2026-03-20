import type {
  AdminApplicationStatus,
  AdminEvent,
  AdminEventAnalytics,
  AdminEventParticipant,
  AdminEventManagerRequest,
  AdminEventManagerRequestReviewResult,
  AdminInvitationPreview,
  AdminMember,
  AdminPolicyTemplate,
  AdminPublishState,
  AdminSession,
} from "../modules/Admin/adminTypes";
import { getApiBaseUrl } from "../lib/apiBase";

type ApiResponseBase = {
  ok: boolean;
  message: string;
};

type AdminRoleLiteral = "admin" | "event_manager";
type EventStatusLiteral = "scheduled" | "in_progress" | "ended";

type AdminSessionPayload = {
  id: number;
  email: string;
  name: string;
  role: AdminRoleLiteral;
};

type AdminLoginResponse = ApiResponseBase & {
  access_token?: string | null;
  admin?: AdminSessionPayload | null;
};

type AdminMemberPayload = {
  id: number;
  email: string;
  name: string;
  phone: string;
  created_at: string;
  role: AdminRoleLiteral;
};

type AdminMemberListResponse = ApiResponseBase & {
  members?: AdminMemberPayload[] | null;
};

type AdminMemberResponse = ApiResponseBase & {
  member?: AdminMemberPayload | null;
};

type AdminEventManagerRequestStatusLiteral = "pending" | "approved" | "rejected";

type AdminEventManagerRequestPayload = {
  id: number;
  name: string;
  email: string;
  organization?: string | null;
  event_name: string;
  event_purpose: string;
  expected_event_date?: string | null;
  expected_attendee_count?: number | null;
  notes?: string | null;
  status: AdminEventManagerRequestStatusLiteral;
  review_note?: string | null;
  reviewed_at?: string | null;
  reviewed_by_name?: string | null;
  created_at: string;
};

type AdminEventManagerRequestListResponse = ApiResponseBase & {
  requests?: AdminEventManagerRequestPayload[] | null;
  pending_count?: number | null;
};

type AdminEventManagerRequestResponse = ApiResponseBase & {
  request?: AdminEventManagerRequestPayload | null;
  invited_admin?: AdminMemberPayload | null;
  invite_link?: string | null;
  invite_email_sent?: boolean | null;
  invite_expires_at?: string | null;
};

type AdminInvitationPreviewPayload = {
  email: string;
  name: string;
  expires_at: string;
};

type AdminInvitationPreviewResponse = ApiResponseBase & {
  invitation?: AdminInvitationPreviewPayload | null;
};

type AdminInvitationCompleteResponse = ApiResponseBase & {
  member?: AdminMemberPayload | null;
};

type AdminPolicyTemplatePayload = {
  key: string;
  content: string;
  updated_at: string;
  updated_by_name?: string | null;
};

type AdminPolicyTemplateResponse = ApiResponseBase & {
  template?: AdminPolicyTemplatePayload | null;
};

type AdminEventParticipantPayload = {
  id: number;
  name: string;
  user_code: string;
  progress_percent: number;
  keywords: string[];
};

type AdminEventBingoRowPayload = {
  line_label: string;
  count: number;
  rate: number;
  is_complete: boolean;
};

type AdminEventKeywordRowPayload = {
  rank: number;
  keyword: string;
  count: number;
};

type AdminEventAnalyticsPayload = {
  review_participants: number;
  average_review_score: number;
  participation_rate: number;
  total_keyword_selections: number;
  operating_minutes: number;
  bingo_rows: AdminEventBingoRowPayload[];
  keyword_rows: AdminEventKeywordRowPayload[];
};

type AdminEventPayload = {
  id: number;
  slug: string;
  name: string;
  created_by_id: number;
  created_by_email: string;
  created_by_name: string;
  location: string;
  event_team: string;
  start_at: string;
  end_at: string;
  admin_email: string;
  board_size: 3 | 5;
  bingo_mission_count: number;
  keywords: string[];
  participant_count: number;
  progress_current: number;
  progress_total: number;
  status: EventStatusLiteral;
  publish_state: AdminPublishState;
  can_edit: boolean;
  public_path?: string;
  participants?: AdminEventParticipantPayload[];
  analytics?: AdminEventAnalyticsPayload;
};

type AdminEventListResponse = ApiResponseBase & {
  events?: AdminEventPayload[] | null;
};

type AdminEventResponse = ApiResponseBase & {
  event?: AdminEventPayload | null;
};

type AdminEventResetResponse = ApiResponseBase & {
  stats?: {
    deleted_attendees: number;
    deleted_teams: number;
    deleted_users: number;
    deleted_boards: number;
    deleted_interactions: number;
    skipped_shared_users: number;
  } | null;
};

export type AdminEventUpsertInput = {
  slug: string;
  name: string;
  location: string;
  eventTeam: string;
  startAt: string;
  endAt: string;
  adminEmail: string;
  boardSize: 3 | 5;
  bingoMissionCount: number;
  keywords: string[];
  publishState: AdminPublishState;
};

export type AdminEventManagerRequestReviewInput = {
  status: AdminApplicationStatus;
  reviewNote?: string;
};

const API_URL = getApiBaseUrl();

const createApiUrl = (path: string) => {
  const baseUrl =
    API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost");
  return new URL(path, baseUrl).toString();
};

const withHeaders = (init: RequestInit = {}, accessToken?: string) => {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return {
    ...init,
    headers,
  };
};

const readErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { detail?: string; message?: string };
    if (typeof payload.detail === "string" && payload.detail.length > 0) {
      return payload.detail;
    }
    if (typeof payload.message === "string" && payload.message.length > 0) {
      return payload.message;
    }
  } catch {
    // ignore
  }

  return `API request failed (${response.status})`;
};

const requestJson = async <T>(
  path: string,
  init: RequestInit = {},
  accessToken?: string
): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(createApiUrl(path), withHeaders(init, accessToken));
  } catch {
    throw new Error("API 서버에 연결하지 못했습니다. 백엔드 실행 상태와 주소를 확인해 주세요.");
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json() as Promise<T>;
};

const mapAdminSession = (
  payload: AdminSessionPayload | null | undefined,
  accessToken: string
): AdminSession => {
  if (!payload) {
    throw new Error("관리자 세션 정보가 올바르지 않습니다.");
  }

  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    accessToken,
  };
};

const mapAdminMember = (payload: AdminMemberPayload): AdminMember => {
  return {
    id: payload.id,
    email: payload.email,
    name: payload.name,
    phone: payload.phone,
    createdAt: payload.created_at,
    role: payload.role,
  };
};

const mapAdminInvitationPreview = (
  payload: AdminInvitationPreviewPayload | null | undefined
): AdminInvitationPreview => {
  if (!payload) {
    throw new Error("초대 정보를 받지 못했습니다.");
  }

  return {
    email: payload.email,
    name: payload.name,
    expiresAt: payload.expires_at,
  };
};

const mapAdminPolicyTemplate = (
  payload: AdminPolicyTemplatePayload | null | undefined
): AdminPolicyTemplate => {
  if (!payload) {
    throw new Error("정책 템플릿 정보를 받지 못했습니다.");
  }

  return {
    key: payload.key,
    content: payload.content,
    updatedAt: payload.updated_at,
    updatedByName: payload.updated_by_name ?? undefined,
  };
};

const mapAdminEventManagerRequest = (
  payload: AdminEventManagerRequestPayload
): AdminEventManagerRequest => {
  return {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    organization: payload.organization ?? undefined,
    eventName: payload.event_name,
    eventPurpose: payload.event_purpose,
    expectedEventDate: payload.expected_event_date ?? undefined,
    expectedAttendeeCount: payload.expected_attendee_count ?? undefined,
    notes: payload.notes ?? undefined,
    status: payload.status,
    reviewNote: payload.review_note ?? undefined,
    reviewedAt: payload.reviewed_at ?? undefined,
    reviewedByName: payload.reviewed_by_name ?? undefined,
    createdAt: payload.created_at,
  };
};

const mapParticipants = (
  payloads: AdminEventParticipantPayload[] | undefined
): AdminEventParticipant[] => {
  return (payloads ?? []).map((participant) => ({
    id: participant.id,
    name: participant.name,
    userCode: participant.user_code,
    progressPercent: participant.progress_percent,
    keywords: participant.keywords,
  }));
};

const mapAnalytics = (
  payload: AdminEventAnalyticsPayload | undefined
): AdminEventAnalytics | undefined => {
  if (!payload) {
    return undefined;
  }

  return {
    reviewParticipants: payload.review_participants,
    averageReviewScore: payload.average_review_score,
    participationRate: payload.participation_rate,
    totalKeywordSelections: payload.total_keyword_selections,
    operatingMinutes: payload.operating_minutes,
    bingoRows: payload.bingo_rows.map((row) => ({
      lineLabel: row.line_label,
      count: row.count,
      rate: row.rate,
      isComplete: row.is_complete,
    })),
    keywordRows: payload.keyword_rows.map((row) => ({
      rank: row.rank,
      keyword: row.keyword,
      count: row.count,
    })),
  };
};

const mapAdminEvent = (payload: AdminEventPayload): AdminEvent => {
  return {
    id: payload.id,
    slug: payload.slug,
    name: payload.name,
    createdById: payload.created_by_id,
    createdByEmail: payload.created_by_email,
    createdByName: payload.created_by_name,
    eventDate: payload.start_at,
    startAt: payload.start_at,
    endAt: payload.end_at,
    location: payload.location,
    eventTeam: payload.event_team,
    adminEmail: payload.admin_email,
    boardSize: payload.board_size,
    bingoMissionCount: payload.bingo_mission_count,
    keywords: payload.keywords ?? [],
    participantCount: payload.participant_count,
    progressCurrent: payload.progress_current,
    progressTotal: payload.progress_total,
    status: payload.status,
    publishState: payload.publish_state,
    isPublished: payload.publish_state === "published",
    canEdit: payload.can_edit,
    publicPath: payload.public_path,
    participants: mapParticipants(payload.participants),
    analytics: mapAnalytics(payload.analytics),
  };
};

export const validateAdminSlugInput = (value: string) => {
  const normalizedValue = value.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(normalizedValue)) {
    return "slug는 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다.";
  }
  if (normalizedValue.length < 3 || normalizedValue.length > 50) {
    return "slug는 3자 이상 50자 이하로 입력해 주세요.";
  }
  if (["admin", "login", "bingo", "api", "assets"].includes(normalizedValue)) {
    return "예약된 slug는 사용할 수 없습니다.";
  }
  return "";
};

export const loginAdmin = async (email: string, password: string) => {
  const payload = await requestJson<AdminLoginResponse>("/api/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });

  if (!payload.access_token) {
    throw new Error("관리자 로그인 토큰을 받지 못했습니다.");
  }

  return mapAdminSession(payload.admin, payload.access_token);
};

export const getAdminMe = async (accessToken: string) => {
  const payload = await requestJson<AdminLoginResponse>("/api/admin/auth/me", {}, accessToken);
  return mapAdminSession(payload.admin, accessToken);
};

export const getAdminMembers = async (accessToken: string) => {
  const payload = await requestJson<AdminMemberListResponse>("/api/admin/members", {}, accessToken);
  return (payload.members ?? []).map(mapAdminMember);
};

export const createAdminMember = async (
  accessToken: string,
  input: {
    email: string;
    password: string;
    name: string;
    role: AdminRoleLiteral;
  }
) => {
  const payload = await requestJson<AdminMemberResponse>(
    "/api/admin/members",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        name: input.name.trim(),
        role: input.role,
      }),
    },
    accessToken
  );

  if (!payload.member) {
    throw new Error("새 관리자 정보를 받지 못했습니다.");
  }

  return mapAdminMember(payload.member);
};

export const deleteAdminMember = async (accessToken: string, memberId: number) => {
  await requestJson<ApiResponseBase>(
    `/api/admin/members/${memberId}`,
    {
      method: "DELETE",
    },
    accessToken
  );
};

export const getAdminEventManagerRequests = async (accessToken: string) => {
  const payload = await requestJson<AdminEventManagerRequestListResponse>(
    "/api/admin/event-manager-requests",
    {},
    accessToken
  );

  return {
    requests: (payload.requests ?? []).map(mapAdminEventManagerRequest),
    pendingCount: payload.pending_count ?? 0,
  };
};

export const reviewAdminEventManagerRequest = async (
  accessToken: string,
  requestId: number,
  input: AdminEventManagerRequestReviewInput
) : Promise<AdminEventManagerRequestReviewResult> => {
  const payload = await requestJson<AdminEventManagerRequestResponse>(
    `/api/admin/event-manager-requests/${requestId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: input.status,
        review_note: input.reviewNote?.trim() || undefined,
      }),
    },
    accessToken
  );

  if (!payload.request) {
    throw new Error("변경된 신청 정보를 받지 못했습니다.");
  }

  return {
    request: mapAdminEventManagerRequest(payload.request),
    invitedAdmin: payload.invited_admin ? mapAdminMember(payload.invited_admin) : undefined,
    inviteLink: payload.invite_link ?? undefined,
    inviteEmailSent: payload.invite_email_sent ?? false,
    inviteExpiresAt: payload.invite_expires_at ?? undefined,
    message: payload.message,
  };
};

export const getAdminInvitationPreview = async (token: string) => {
  const payload = await requestJson<AdminInvitationPreviewResponse>(
    `/api/admin/invitations/${encodeURIComponent(token)}`
  );
  return mapAdminInvitationPreview(payload.invitation);
};

export const completeAdminInvitation = async (token: string, password: string) => {
  const payload = await requestJson<AdminInvitationCompleteResponse>(
    `/api/admin/invitations/${encodeURIComponent(token)}/complete`,
    {
      method: "POST",
      body: JSON.stringify({ password }),
    }
  );

  if (!payload.member) {
    throw new Error("초대 완료 결과를 받지 못했습니다.");
  }

  return {
    member: mapAdminMember(payload.member),
    message: payload.message,
  };
};

export const getAdminPolicyTemplate = async (accessToken: string) => {
  const payload = await requestJson<AdminPolicyTemplateResponse>(
    "/api/admin/policy-template",
    {
      cache: "no-store",
    },
    accessToken
  );

  return mapAdminPolicyTemplate(payload.template);
};

export const updateAdminPolicyTemplate = async (
  accessToken: string,
  input: { content: string }
) => {
  const payload = await requestJson<AdminPolicyTemplateResponse>(
    "/api/admin/policy-template",
    {
      method: "PUT",
      body: JSON.stringify({
        content: input.content,
      }),
    },
    accessToken
  );

  return mapAdminPolicyTemplate(payload.template);
};

export const getAdminEvents = async (accessToken: string) => {
  const payload = await requestJson<AdminEventListResponse>("/api/admin/events", {}, accessToken);
  return (payload.events ?? []).map(mapAdminEvent);
};

export const getAdminEventDetail = async (accessToken: string, eventId: number | string) => {
  const payload = await requestJson<AdminEventResponse>(
    `/api/admin/events/${eventId}`,
    {},
    accessToken
  );

  if (!payload.event) {
    throw new Error("이벤트 상세 정보를 받지 못했습니다.");
  }

  return mapAdminEvent(payload.event);
};

export const createAdminEvent = async (accessToken: string, input: AdminEventUpsertInput) => {
  const payload = await requestJson<AdminEventResponse>(
    "/api/admin/events",
    {
      method: "POST",
      body: JSON.stringify({
        slug: input.slug,
        name: input.name,
        location: input.location,
        event_team: input.eventTeam,
        start_at: input.startAt,
        end_at: input.endAt,
        admin_email: input.adminEmail,
        board_size: input.boardSize,
        bingo_mission_count: input.bingoMissionCount,
        keywords: input.keywords,
        publish_state: input.publishState,
      }),
    },
    accessToken
  );

  if (!payload.event) {
    throw new Error("생성된 이벤트 정보를 받지 못했습니다.");
  }

  return mapAdminEvent(payload.event);
};

export const updateAdminEvent = async (
  accessToken: string,
  eventId: number,
  input: AdminEventUpsertInput
) => {
  const payload = await requestJson<AdminEventResponse>(
    `/api/admin/events/${eventId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        slug: input.slug,
        name: input.name,
        location: input.location,
        event_team: input.eventTeam,
        start_at: input.startAt,
        end_at: input.endAt,
        admin_email: input.adminEmail,
        board_size: input.boardSize,
        bingo_mission_count: input.bingoMissionCount,
        keywords: input.keywords,
        publish_state: input.publishState,
      }),
    },
    accessToken
  );

  if (!payload.event) {
    throw new Error("수정된 이벤트 정보를 받지 못했습니다.");
  }

  return mapAdminEvent(payload.event);
};

export const resetAdminEventData = async (accessToken: string, eventId: number) => {
  return requestJson<AdminEventResetResponse>(
    `/api/admin/events/${eventId}/reset-data`,
    {
      method: "POST",
    },
    accessToken
  );
};

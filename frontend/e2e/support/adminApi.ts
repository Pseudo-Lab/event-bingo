import type { Page, Route } from "@playwright/test";

type JsonBody = Record<string, unknown> | unknown[] | string | number | boolean | null;

export type AdminSessionSeed = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "event_manager";
  accessToken: string;
};

type AdminEventPayloadOptions = {
  id: number;
  slug: string;
  name: string;
  boardSize?: 3 | 5;
  bingoMissionCount?: number;
  keywords?: string[];
  publishState?: "draft" | "published" | "archived";
  startAt?: string;
  endAt?: string;
  location?: string;
  eventTeam?: string;
  adminEmail?: string;
  participantCount?: number;
  progressCurrent?: number;
  progressTotal?: number;
  status?: "scheduled" | "in_progress" | "ended";
  canEdit?: boolean;
};

const fulfillJson = async (route: Route, body: JsonBody, status = 200) => {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
};

export const seedAdminSession = async (page: Page, session: AdminSessionSeed) => {
  await page.addInitScript((seededSession) => {
    window.sessionStorage.setItem(
      "event-bingo.admin-session.v1",
      JSON.stringify(seededSession)
    );
  }, session);
};

export const buildAdminEventPayload = ({
  id,
  slug,
  name,
  boardSize = 5,
  bingoMissionCount = boardSize,
  keywords = Array.from({ length: boardSize * boardSize }, (_, index) => `키워드 ${index + 1}`),
  publishState = "draft",
  startAt = "2026-05-17T15:00:00+09:00",
  endAt = "2026-05-17T18:00:00+09:00",
  location = "서울 성수 XYZ홀",
  eventTeam = "PseudoLab",
  adminEmail = "admin@example.com",
  participantCount = 0,
  progressCurrent = 0,
  progressTotal = 0,
  status = "scheduled",
  canEdit = true,
}: AdminEventPayloadOptions) => {
  return {
    id,
    slug,
    name,
    created_by_id: 1,
    created_by_email: adminEmail,
    created_by_name: "관리자",
    location,
    event_team: eventTeam,
    start_at: startAt,
    end_at: endAt,
    admin_email: adminEmail,
    board_size: boardSize,
    bingo_mission_count: bingoMissionCount,
    keywords,
    participant_count: participantCount,
    progress_current: progressCurrent,
    progress_total: progressTotal,
    status,
    publish_state: publishState,
    can_edit: canEdit,
    public_path: `/${slug}`,
    participants: [],
    analytics: {
      review_participants: 0,
      average_review_score: 0,
      participation_rate: 0,
      total_keyword_selections: 0,
      operating_minutes: 180,
      bingo_rows: [],
      keyword_rows: [],
    },
  };
};

export const mockAdminBootstrapRoutes = async ({
  page,
  session,
  events,
}: {
  page: Page;
  session: AdminSessionSeed;
  events: ReturnType<typeof buildAdminEventPayload>[];
}) => {
  await page.route("**/api/admin/auth/me", async (route) => {
    await fulfillJson(route, {
      ok: true,
      message: "현재 관리자 정보를 불러왔습니다.",
      admin: {
        id: session.id,
        email: session.email,
        name: session.name,
        role: session.role,
      },
    });
  });

  await page.route("**/api/admin/members", async (route) => {
    await fulfillJson(route, {
      ok: true,
      message: "관리자 목록을 불러왔습니다.",
      members: [
        {
          id: session.id,
          email: session.email,
          name: session.name,
          phone: "010-0000-0000",
          created_at: "2026-03-28T10:00:00+09:00",
          role: session.role,
        },
      ],
    });
  });

  await page.route("**/api/admin/event-manager-requests", async (route) => {
    await fulfillJson(route, {
      ok: true,
      message: "신청 목록을 불러왔습니다.",
      requests: [],
      pending_count: 0,
    });
  });

  await page.route("**/api/admin/events", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    await fulfillJson(route, {
      ok: true,
      message: "이벤트 목록을 불러왔습니다.",
      events,
    });
  });
};

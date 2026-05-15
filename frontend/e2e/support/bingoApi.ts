import type { Page, Route } from "@playwright/test";

type JsonBody = Record<string, unknown> | unknown[] | string | number | boolean | null;
type SessionSeed = {
  userId: number;
  userName: string;
  loginId: string;
};
type InteractionRecordOptions = {
  interactionId?: number;
  wordIdList?: string;
  sendUserId: number;
  receiveUserId: number;
  sendUserName?: string;
  receiveUserName?: string;
  updatedWords?: string[];
  bingoCount?: number;
  createdAt?: string;
};

const fulfillJson = async (route: Route, body: JsonBody, status = 200) => {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
};

export const mockPrivacyTemplate = async (page: Page) => {
  await page.route("**/api/events/privacy-template", async (route) => {
    await fulfillJson(route, {
      ok: true,
      message: "공개 플랫폼 개인정보처리방침을 불러왔습니다.",
      template: {
        content: "# DevFactory 플랫폼 개인정보처리방침\n\n**가짜연구소 DevFactory** 플랫폼 방침입니다.",
        updated_at: "2026-03-21T00:00:00+09:00",
      },
    });
  });

  await page.route("**/api/events/*/privacy-notice-template", async (route) => {
    const slug = route.request().url().split("/api/events/")[1]?.split("/")[0] ?? "event";
    await fulfillJson(route, {
      ok: true,
      message: "행사 참가자 개인정보 처리 안내를 불러왔습니다.",
      template: {
        event_slug: slug,
        event_name: "Bingo Networking Event",
        event_team: "PseudoLab",
        contact_email: "event-team@example.com",
        content:
          "# 행사 참가자 개인정보 처리 안내\n\n**PseudoLab** 행사 참가자 안내입니다.\n\n■ 1. 문의처\n- event-team@example.com\n\n1. 개인정보 문의",
        updated_at: "2026-03-21T00:00:00+09:00",
      },
    });
  });
};

export const mockPublicEventProfile = async (
  page: Page,
  eventSlug = "bingo-networking",
  options: {
    startAt?: string;
    endAt?: string;
  } = {}
) => {
  const startAt = options.startAt ?? new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const endAt = options.endAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await page.route(`**/api/events/${eventSlug}`, async (route) => {
    await fulfillJson(route, {
      ok: true,
      message: "공개 이벤트 설정을 불러왔습니다.",
      event: {
        id: 101,
        slug: eventSlug,
        name: "Bingo Networking Event",
        location: "서울 컨벤션 센터",
        event_team: "PseudoLab",
        start_at: startAt,
        end_at: endAt,
        board_size: 5,
        bingo_mission_count: 3,
        keywords: Array.from({ length: 25 }, (_, index) => `키워드 ${index + 1}`),
      },
    });
  });
};

export const mockPublicEventCatalog = async (
  page: Page,
  events: Array<{
    id: number;
    slug: string;
    name: string;
    startAt: string;
    boardSize: 3 | 5;
    bingoMissionCount: number;
    status: "scheduled" | "in_progress" | "ended";
  }>
) => {
  await page.route("**/api/events", async (route) => {
    if (route.request().method() !== "GET") {
      await route.fallback();
      return;
    }

    await fulfillJson(route, {
      ok: true,
      message: "공개 이벤트 목록을 불러왔습니다.",
      events: events.map((eventItem) => ({
        id: eventItem.id,
        slug: eventItem.slug,
        name: eventItem.name,
        start_at: eventItem.startAt,
        board_size: eventItem.boardSize,
        bingo_mission_count: eventItem.bingoMissionCount,
        status: eventItem.status,
      })),
    });
  });
};

export const mockParticipantSearch = async (
  page: Page,
  participants: Array<{ user_id: number; display_name: string }>,
  eventSlug = "bingo-networking"
) => {
  await page.route("**/api/auth/bingo/search?**", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("event_slug") !== eventSlug) {
      await route.fallback();
      return;
    }

    await fulfillJson(route, {
      ok: true,
      message: "ok",
      participants,
    });
  });
};

export const seedBingoSession = async (
  page: Page,
  { userId, userName, loginId }: SessionSeed
) => {
  await page.addInitScript(
    ({ seededUserId, seededUserName, seededLoginId }) => {
      window.sessionStorage.setItem("myID", String(seededUserId));
      window.sessionStorage.setItem("myUserName", seededUserName);
      window.sessionStorage.setItem("myLoginId", seededLoginId);
    },
    {
      seededUserId: userId,
      seededUserName: userName,
      seededLoginId: loginId,
    }
  );
};

export const buildInteractionRecord = ({
  interactionId = 101,
  wordIdList,
  sendUserId,
  receiveUserId,
  sendUserName = `참가자 ${sendUserId}`,
  receiveUserName = `참가자 ${receiveUserId}`,
  updatedWords = [],
  bingoCount = 0,
  createdAt = "2026-03-19T12:00:00+09:00",
}: InteractionRecordOptions) => {
  const serializedWords = wordIdList ?? JSON.stringify(updatedWords);

  return {
    interaction_id: interactionId,
    word_id_list: serializedWords,
    send_user_id: sendUserId,
    receive_user_id: receiveUserId,
    send_user_name: sendUserName,
    receive_user_name: receiveUserName,
    updated_words: updatedWords,
    bingo_count: bingoCount,
    created_at: createdAt,
  };
};

export const buildInteractionCreateResponse = (
  options: InteractionRecordOptions & { message?: string }
) => {
  const { message = "빙고 키워드 전송에 성공하였습니다.", ...interaction } = options;

  return {
    ok: true,
    message,
    ...buildInteractionRecord(interaction),
  };
};

export const buildBoardData = ({
  selectedValues = [],
  activeValues = [],
}: {
  selectedValues?: string[];
  activeValues?: string[];
}) => {
  const selectedValueSet = new Set(selectedValues);
  const activeValueSet = new Set(activeValues);

  return Object.fromEntries(
    Array.from({ length: 25 }, (_, index) => {
      const value = `키워드 ${index + 1}`;
      return [
        String(index),
        {
          value,
          selected: selectedValueSet.has(value) ? 1 : 0,
          status: activeValueSet.has(value) ? 1 : 0,
        },
      ];
    })
  );
};

export const mockEmptyBoardBootstrap = async (page: Page, userId: number) => {
  await page.route(`**/api/bingo/boards/${userId}**`, async (route) => {
    await fulfillJson(route, {
      ok: true,
      message: "ok",
      user_id: userId,
      board_data: null,
    });
  });

  await page.route(`**/api/bingo/interactions/${userId}/all**`, async (route) => {
    await fulfillJson(route, {
      ok: true,
      message: "ok",
      interactions: [],
    });
  });
};

export const mockBoardBootstrap = async ({
  page,
  userId,
  displayName = "테스터",
  selectedValues,
  activeValues = [],
  interactions = [],
}: {
  page: Page;
  userId: number;
  displayName?: string;
  selectedValues: string[];
  activeValues?: string[];
  interactions?: JsonBody[];
}) => {
  await page.route(`**/api/bingo/boards/${userId}**`, async (route) => {
    await fulfillJson(route, {
      ok: true,
      message: "ok",
      user_id: userId,
      display_name: displayName,
      board_data: buildBoardData({
        selectedValues,
        activeValues,
      }),
      bingo_count: 0,
      user_interaction_count: interactions.length,
    });
  });

  await page.route(`**/api/bingo/interactions/${userId}/all**`, async (route) => {
    await fulfillJson(route, {
      ok: true,
      message: "ok",
      interactions,
    });
  });
};

import { expect, test } from "@playwright/test";

import {
  buildAdminEventPayload,
  mockAdminBootstrapRoutes,
  seedAdminSession,
  type AdminSessionSeed,
} from "./support/adminApi";

const session: AdminSessionSeed = {
  id: 1,
  email: "admin@example.com",
  name: "관리자",
  role: "admin",
  accessToken: "admin-token",
};

const existingEvent = buildAdminEventPayload({
  id: 101,
  slug: "existing-event",
  name: "기존 행사",
  adminEmail: session.email,
});

test("opens event modal and imports keywords from an existing event", async ({ page }) => {
  let currentEvents = [existingEvent];
  let createRequestBody: Record<string, unknown> | null = null;

  await seedAdminSession(page, session);
  await mockAdminBootstrapRoutes({
    page,
    session,
    events: currentEvents,
  });

  await page.route("**/api/admin/events", async (route) => {
    const method = route.request().method();

    if (method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          message: "이벤트 목록을 불러왔습니다.",
          events: currentEvents,
        }),
      });
      return;
    }

    if (method === "POST") {
      createRequestBody = route.request().postDataJSON() as Record<string, unknown>;
      const createdEvent = buildAdminEventPayload({
        id: 202,
        slug: "new-token-2026",
        name: String(createRequestBody.name),
        boardSize: Number(createRequestBody.board_size) === 3 ? 3 : 5,
        bingoMissionCount: Number(createRequestBody.bingo_mission_count),
        keywords: ((createRequestBody.keywords as string[]) ?? []).slice(),
        startAt: String(createRequestBody.start_at),
        endAt: String(createRequestBody.end_at),
        location: String(createRequestBody.location),
        eventTeam: String(createRequestBody.event_team),
        adminEmail: String(createRequestBody.admin_email),
      });
      currentEvents = [createdEvent, ...currentEvents];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          message: "이벤트를 생성했습니다.",
          event: createdEvent,
        }),
      });
      return;
    }

    await route.abort();
  });

  await page.route("**/api/admin/events/202", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        message: "이벤트 상세를 불러왔습니다.",
        event: currentEvents[0],
      }),
    });
  });

  await page.goto("/admin/events");

  await expect(page.getByRole("button", { name: "새 행사 등록" })).toBeVisible();
  await page.getByRole("button", { name: "새 행사 등록" }).click();

  await page.getByLabel("행사 이름").fill("Festival Networking 2026");
  await page.getByLabel("Event team").fill("행사 운영팀");
  await page.getByLabel("행사 위치").fill("서울 성수 XYZ홀");
  await page.getByLabel("날짜").fill("2026-05-17");

  await page.getByRole("button", { name: "기존 행사에서 가져오기" }).click();
  await page.getByRole("button", { name: "키워드 가져오기" }).click();

  await expect(page.getByText('"기존 행사" 행사 키워드를 가져왔습니다.')).toBeVisible();
  await expect(page.getByRole("button", { name: "키워드 1", exact: true })).toBeVisible();

  const createResponse = page.waitForResponse((response) => {
    return response.request().method() === "POST" && response.url().includes("/api/admin/events");
  });

  await page.getByRole("button", { name: "확인" }).click();
  await createResponse;

  expect(createRequestBody).not.toBeNull();
  expect(createRequestBody?.slug).toBeUndefined();
  expect(createRequestBody?.keywords).toHaveLength(25);
  await expect(page).toHaveURL(/\/admin\/events\/202$/);
});

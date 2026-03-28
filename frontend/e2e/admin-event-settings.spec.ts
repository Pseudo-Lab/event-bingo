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

test("keeps typed hyphens in slug input and auto-fills missing event keywords on save", async ({
  page,
}) => {
  let currentEvents = [existingEvent];
  let createdEventPayload = buildAdminEventPayload({
    id: 202,
    slug: "festival-networking-2026",
    name: "Festival Networking 2026",
    boardSize: 3,
    bingoMissionCount: 3,
    keywords: [
      "브랜딩",
      "스폰서",
      "키워드 3",
      "키워드 4",
      "키워드 5",
      "키워드 6",
      "키워드 7",
      "키워드 8",
      "키워드 9",
    ],
    adminEmail: session.email,
  });
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
      const keywords = (createRequestBody.keywords as string[]) ?? [];

      expect(createRequestBody.slug).toBe("festival-networking-2026");
      expect(keywords).toEqual([
        "브랜딩",
        "스폰서",
        "키워드 3",
        "키워드 4",
        "키워드 5",
        "키워드 6",
        "키워드 7",
        "키워드 8",
        "키워드 9",
      ]);

      createdEventPayload = buildAdminEventPayload({
        id: 202,
        slug: String(createRequestBody.slug),
        name: String(createRequestBody.name),
        boardSize: 3,
        bingoMissionCount: Number(createRequestBody.bingo_mission_count),
        keywords,
        publishState: "draft",
        startAt: String(createRequestBody.start_at),
        endAt: String(createRequestBody.end_at),
        location: String(createRequestBody.location),
        eventTeam: String(createRequestBody.event_team),
        adminEmail: String(createRequestBody.admin_email),
      });
      currentEvents = [createdEventPayload, ...currentEvents];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          message: "이벤트를 생성했습니다.",
          event: createdEventPayload,
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
        event: createdEventPayload,
      }),
    });
  });

  await page.goto("/admin/events");

  await expect(page.getByRole("button", { name: "새 행사 등록" })).toBeVisible();
  await page.getByRole("button", { name: "새 행사 등록" }).click();

  await page.getByLabel("행사 이름").fill("Festival Networking 2026");
  await page.getByLabel("Event team").fill("PseudoLab");
  await page.getByLabel("행사 위치").fill("서울 성수 XYZ홀");
  await page.getByLabel("날짜").fill("2026-05-17");

  const slugInput = page.getByLabel("slug");
  await slugInput.fill("");
  await slugInput.type("festival-");
  await expect(slugInput).toHaveValue("festival-");
  await slugInput.type("networking-2026");
  await expect(slugInput).toHaveValue("festival-networking-2026");

  await page.getByRole("button", { name: "3X3" }).click();

  const keywordInput = page.getByLabel("행사 키워드 입력");
  await keywordInput.fill("브랜딩");
  await keywordInput.press("Enter");
  await keywordInput.fill("스폰서");
  await keywordInput.press("Enter");

  const autofillPreview = page.getByText("Auto-Filled Preview").locator("..");
  await expect(autofillPreview).toBeVisible();
  await expect(autofillPreview.getByText("키워드 3", { exact: true })).toBeVisible();
  await expect(autofillPreview.getByText("키워드 9", { exact: true })).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain('부족한 7개는 "키워드 3"부터 자동으로 채워 저장할까요?');
    await dialog.accept();
  });

  await page.getByRole("button", { name: "확인" }).click();

  await expect(page).toHaveURL(/\/admin\/events\/202$/);
  expect(createRequestBody).not.toBeNull();
});

test("regenerates slug from a Korean event name", async ({ page }) => {
  await seedAdminSession(page, session);
  await mockAdminBootstrapRoutes({
    page,
    session,
    events: [existingEvent],
  });

  await page.goto("/admin/events");
  await page.getByRole("button", { name: "새 행사 등록" }).click();

  await page.getByLabel("행사 이름").fill("가짜 연구소 2026");
  await page.getByRole("button", { name: "행사명 기준으로 다시 생성" }).click();

  await expect(page.getByLabel("slug")).toHaveValue("gajja-yeonguso-2026");
  await expect(page.getByText("행사명 기준 영문 slug 추천을 적용했습니다: /gajja-yeonguso-2026")).toBeVisible();
  await expect(page.getByText("공개 URL: /gajja-yeonguso-2026")).toBeVisible();
});

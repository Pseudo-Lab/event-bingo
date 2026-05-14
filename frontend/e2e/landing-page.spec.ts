import { expect, test } from "@playwright/test";
import { mockPublicEventCatalog } from "./support/bingoApi";

test("landing page keeps the experience and admin entry points prominent", async ({ page }) => {
  await mockPublicEventCatalog(page, [
    {
      id: 1,
      slug: "summer-meetup",
      name: "Summer Meetup",
      startAt: "2026-06-10T19:00:00+09:00",
      boardSize: 5,
      bingoMissionCount: 3,
      status: "scheduled",
    },
    {
      id: 2,
      slug: "product-sprint-day",
      name: "Product Sprint Day",
      startAt: "2026-06-18T14:00:00+09:00",
      boardSize: 3,
      bingoMissionCount: 2,
      status: "in_progress",
    },
  ]);

  let applicationRequestBody: Record<string, unknown> | null = null;
  await page.route("**/api/events/manager-requests", async (route) => {
    applicationRequestBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        message: "이벤트 관리자 신청을 접수했습니다.",
        request: {
          id: 1,
          status: "pending",
          created_at: "2026-06-01T00:00:00+09:00",
        },
      }),
    });
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "행사 네트워킹을 더 쉽고 재밌게" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "행사 네트워킹이 필요하신가요?" })).toBeVisible();
  await expect(page.getByText("행사 사례").first()).toBeVisible();
  await expect(page.getByLabel("이름")).toBeVisible();
  await expect(page.getByLabel("Google 로그인에 사용할 이메일")).toBeVisible();
  await expect(page.getByLabel("예상 행사 날짜 (선택)")).toBeVisible();
  await expect(page.getByLabel("예상 참가자 수")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "입력한 이메일로 Google 로그인이 가능한 것을 확인했습니다." })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "사용 신청하기" })).toHaveCount(1);
  await expect(
    page.getByText("신청 접수와 등록 완료 안내는 입력한 이메일로 발송됩니다.", { exact: false })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /데모 체험하기/ }).first()).toBeVisible();
  await expect(page.getByText("2025 Product DNA Open Forum").first()).toBeVisible();
  await expect(page.getByText("Korea Business Experimentation Symposium 2025").first()).toBeVisible();
  await expect(page.getByText("PseudoCon 2025").first()).toBeVisible();
  await expect(page.getByText("8th PseudoCon").first()).toBeVisible();

  await page.getByLabel("이름").fill("홍길동");
  await page.getByLabel("Google 로그인에 사용할 이메일").fill("organizer@example.com");
  await page.getByLabel("행사명").fill("Summer Meetup 운영");
  await page.getByLabel("예상 행사 날짜 (선택)").fill("2026-06-10");
  await page.getByLabel("예상 참가자 수").selectOption("200");
  await page.getByRole("button", { name: "사용 신청하기" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "신청을 접수했습니다. 접수 확인 메일을 발송했습니다. 스팸 보관함도 확인해 주세요."
  );
  expect(applicationRequestBody).toMatchObject({
    name: "홍길동",
    email: "organizer@example.com",
    event_name: "Summer Meetup 운영",
    expected_event_date: "2026-06-10T09:00:00+09:00",
    expected_attendee_count: 200,
  });
});

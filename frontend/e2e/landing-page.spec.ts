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

  await expect(page.getByRole("heading", { name: "개발자 네트워킹을 더 쉽고 재밌게" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "행사 운영 권한이 필요하신가요?" })).toBeVisible();
  await expect(page.getByText("이벤트 사례").first()).toBeVisible();
  await expect(page.getByLabel("이름")).toBeVisible();
  await expect(page.getByLabel("Google 로그인에 사용할 이메일")).toBeVisible();
  await expect(
    page.getByText("Gmail이 아니어도 Google 계정에 연결된 이메일이면 사용할 수 있습니다.")
  ).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "입력한 이메일로 Google 로그인이 가능한 것을 확인했습니다." })).toBeVisible();
  await expect(page.getByRole("button", { name: "관리자 권한 신청" })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "데모 체험" }).first()).toBeVisible();
  await expect(page.getByText("Summer Meetup").first()).toBeVisible();
  await expect(page.getByText("Product Sprint Day").first()).toBeVisible();

  await page.getByLabel("이름").fill("김행사");
  await page.getByLabel("Google 로그인에 사용할 이메일").fill("organizer@example.com");
  await page.getByLabel("행사명").fill("Summer Meetup 운영");
  await page.getByRole("button", { name: "관리자 권한 신청" }).click();
  await expect(page.getByRole("alert")).toHaveText("입력한 이메일로 Google 로그인이 가능한지 확인해 주세요.");

  await page.getByRole("checkbox", { name: "입력한 이메일로 Google 로그인이 가능한 것을 확인했습니다." }).check();
  await page.getByRole("button", { name: "관리자 권한 신청" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "신청을 접수했습니다. 운영팀 검토 후 승인되면 입력한 이메일로 관리자 접속 방법을 안내드립니다."
  );
  expect(applicationRequestBody).toMatchObject({
    name: "김행사",
    email: "organizer@example.com",
    event_name: "Summer Meetup 운영",
  });
});

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

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "체험해보기" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "행사 운영 권한이 필요하신가요?" })).toBeVisible();
  await expect(
    page.getByText("이벤트 목록")
  ).toBeVisible();
  await expect(page.getByLabel("이름")).toBeVisible();
  await expect(page.getByRole("button", { name: "관리자 권한 신청 보내기" })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "체험해보기" }).first()).toBeVisible();
  await expect(page.getByText("Summer Meetup")).toBeVisible();
  await expect(page.getByText("Product Sprint Day")).toBeVisible();
});

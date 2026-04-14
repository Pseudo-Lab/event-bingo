import { expect, test } from "@playwright/test";
import { mockConsentTemplate, mockPublicEventProfile } from "./support/bingoApi";

test("event home renders and opens the consent dialog", async ({ page }) => {
  await mockConsentTemplate(page);
  await mockPublicEventProfile(page);

  await page.goto("/event/bingo-networking");

  await expect(page.getByRole("heading", { name: "Bingo Networking Event" })).toBeVisible();
  await expect(page.getByText("개인정보 처리 동의(필수)")).toBeVisible();
  await expect(page.getByRole("button", { name: "내용 보기" })).toBeVisible();

  await page.getByRole("button", { name: "내용 보기" }).click();

  await expect(
    page.getByRole("heading", { name: "[필수] 개인정보 수집 및 이용 동의서" })
  ).toBeVisible();
});

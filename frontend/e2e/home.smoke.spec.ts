import { expect, test } from "@playwright/test";
import { mockPrivacyTemplate, mockPublicEventProfile } from "./support/bingoApi";

test("event home renders and opens the privacy notice dialog", async ({ page }) => {
  await mockPrivacyTemplate(page);
  await mockPublicEventProfile(page);

  await page.goto("/event/bingo-networking");

  await expect(page.getByRole("heading", { name: "Bingo Networking Event" })).toBeVisible();
  await expect(page.getByText("로그인 전 확인")).toBeVisible();
  await expect(page.getByRole("button", { name: "행사 참가자 안내" })).toBeVisible();

  await page.getByRole("button", { name: "행사 참가자 안내" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "행사 참가자 개인정보 처리 안내" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "플랫폼 처리방침" })).toBeVisible();
});

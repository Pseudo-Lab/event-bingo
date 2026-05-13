import { expect, test } from "@playwright/test";
import { mockPrivacyTemplate, mockPublicEventProfile } from "./support/bingoApi";

test("public legal pages render readable policy text", async ({ page }) => {
  await page.goto("/privacy");

  await expect(page.getByRole("heading", { name: "플랫폼 개인정보처리방침" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "1. 개인정보 처리 주체 및 적용 범위" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /1\. 1\./ })).toHaveCount(0);
  await expect(page.getByText("계정 생성·수정 시각")).toBeVisible();
  await expect(page.getByText("최근 접속 시각")).toHaveCount(0);

  await page.goto("/terms");

  await expect(page.getByRole("heading", { name: "서비스 이용약관" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "1. 운영 주체와 약관의 목적" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /1\. 1\./ })).toHaveCount(0);
});

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
  await expect(dialog.getByRole("heading", { name: "1. 문의처" })).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "1. 1. 문의처" })).toHaveCount(0);
  await expect(dialog.locator(".consent-markdown__list--unordered")).toHaveCSS(
    "list-style-type",
    "disc"
  );
  await expect(dialog.locator(".consent-markdown__list--ordered")).toHaveCSS(
    "list-style-type",
    "decimal"
  );
});

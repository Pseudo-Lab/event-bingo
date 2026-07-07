import { expect, test } from "@playwright/test";
import { mockPrivacyTemplate, mockPublicEventProfile } from "./support/bingoApi";

test("public legal pages render readable policy text", async ({ page }) => {
  await page.goto("/privacy");

  await expect(
    page.getByRole("heading", { name: "Bingo Networking 개인정보처리방침" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "1. 개인정보 처리 주체 및 적용 범위" })
  ).toBeVisible();
  await expect(
    page.getByText("서비스 운영팀은 Google 사용자 데이터를 광고, 판매, 신용평가", {
      exact: false,
    })
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
  const loginForm = page.getByLabel("login form");

  await expect(loginForm.getByText("로그인 전 확인")).toBeVisible();
  await expect(
    loginForm.getByText("Google로 계속하면 Google 계정의 이름, 이메일 주소", {
      exact: false,
    })
  ).toBeVisible();
  const termsCheckbox = page.getByRole("checkbox", {
    name: /서비스 이용약관.*동의합니다/,
  });
  const privacyCheckbox = page.getByRole("checkbox", {
    name: /개인정보처리방침.*행사별 개인정보 안내.*확인했습니다/,
  });
  const googleButtonHost = page
    .locator(".login-google-panel__button-slot [aria-disabled]")
    .first();

  await expect(termsCheckbox).not.toBeChecked();
  await expect(privacyCheckbox).not.toBeChecked();
  await expect(googleButtonHost).toHaveAttribute("aria-disabled", "true");

  await termsCheckbox.check();
  await expect(googleButtonHost).toHaveAttribute("aria-disabled", "true");

  await privacyCheckbox.check();
  await expect(googleButtonHost).toHaveAttribute("aria-disabled", "false");
  await expect(page.getByRole("link", { name: "서비스 이용약관" })).toHaveAttribute(
    "href",
    "/terms"
  );
  await expect(
    page.getByRole("link", { name: "행사 참가자 개인정보 처리 안내" })
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "개인정보처리방침" })
  ).toHaveAttribute("href", "/privacy");

  await page.getByRole("button", { name: "행사별 개인정보 안내" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "행사 참가자 개인정보 처리 안내" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "전체 안내 보기" })).toBeVisible();
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

test("event home follows the selected English language setting", async ({ page }) => {
  await mockPrivacyTemplate(page);
  await mockPublicEventProfile(page, "bingo-networking", {
    startAt: "2026-07-08T10:00:00+09:00",
  });

  await page.goto("/event/bingo-networking");
  await page.getByRole("button", { name: "English" }).click();

  const loginForm = page.getByLabel("login form");
  const eventSummary = page.getByLabel("event summary");

  await expect(page.getByText("A new way to network through bingo")).toBeVisible();
  await expect(eventSummary.getByText("Bingo Networking", { exact: true })).toBeVisible();
  await expect(eventSummary.getByText("July 8, 2026 at 10:00")).toBeVisible();
  await expect(loginForm.getByText("Before Login")).toBeVisible();
  await expect(
    loginForm.getByText("Continuing with Google creates your event participant account", {
      exact: false,
    })
  ).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /I agree to the Terms of Service/ })).toBeVisible();
  await expect(
    page.getByRole("checkbox", {
      name: /I have reviewed the Privacy Policy and event privacy notice/,
    })
  ).toBeVisible();
  await expect(page.getByText("Review the required items before continuing with Google.")).toBeVisible();

  await page.reload();

  await expect(loginForm.getByText("Before Login")).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { mockConsentTemplate, mockPublicEventProfile } from "./support/bingoApi";

test("home page renders and opens the consent dialog", async ({ page }) => {
  await mockConsentTemplate(page);
  await mockPublicEventProfile(page);
  await page.goto("/bingo-networking");

  await expect(page.getByRole("heading", { name: "Bingo Networking", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "처음 참가예요" })).toBeVisible();
  await expect(page.getByRole("button", { name: "내용 보기" })).toBeVisible();

  await page.getByRole("button", { name: "내용 보기" }).click();

  await expect(
    page.getByRole("heading", { name: "[필수] 개인정보 수집 및 이용 동의서" })
  ).toBeVisible();
  await expect(
    page.getByText("로그인 전에 아래 내용을 읽고 동의 여부를 선택해 주세요.")
  ).toBeVisible();
});

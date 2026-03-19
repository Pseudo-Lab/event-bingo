import { expect, test } from "@playwright/test";
import { mockConsentTemplate } from "./support/bingoApi";

test("home page renders and opens the consent dialog", async ({ page }) => {
  await mockConsentTemplate(page);
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Bingo Networking" })).toBeVisible();
  await expect(page.getByRole("button", { name: "처음 참가예요" })).toBeVisible();
  await expect(page.getByRole("button", { name: "내용 보기" })).toBeVisible();

  await page.getByRole("button", { name: "내용 보기" }).click();

  await expect(
    page.getByRole("heading", { name: "[필수] 개인정보 수집 및 이용 동의서" })
  ).toBeVisible();
  await expect(
    page.getByText("동의 후에만 빙고 서비스 로그인이 가능합니다.")
  ).toBeVisible();
});

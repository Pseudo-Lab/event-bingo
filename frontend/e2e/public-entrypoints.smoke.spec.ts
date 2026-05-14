import { expect, test } from "@playwright/test";

test("demo experience starts without login and records a sample encounter", async ({
  page,
}) => {
  await page.goto("/experience");

  await expect(
    page.getByRole("heading", {
      name: "로그인 없이 빙고 흐름을 빠르게 체험해 보세요",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "AI", exact: true }).click();
  await page.getByRole("button", { name: "디자인", exact: true }).click();
  await page.getByRole("button", { name: "프로덕트", exact: true }).click();
  await page.getByRole("button", { name: "데모 빙고 시작" }).click();

  await expect(
    page.getByRole("heading", { name: "보드가 채워지는 흐름을 관찰해 보세요" }),
  ).toBeVisible();
  await expect(page.getByText("아직 만남 기록이 없습니다.")).toBeVisible();

  await page.getByRole("button", { name: "랜덤 유저 만나기" }).click();

  await expect(page.getByText("아직 만남 기록이 없습니다.")).toHaveCount(0);
  await expect(
    page
      .locator("div")
      .filter({ has: page.getByText("만난 사람", { exact: true }) })
      .filter({ has: page.getByText("1명", { exact: true }) })
      .first(),
  ).toBeVisible();
  await expect(page.getByText("방금 만난 참가자")).toBeVisible();
  await expect(page.getByText("만남 기록")).toBeVisible();
});

test("admin login entrypoint renders Google login guidance", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(
    page.getByRole("heading", { name: "Google 계정으로 관리자 로그인" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Google 계정으로 로그인" }),
  ).toBeVisible();
});

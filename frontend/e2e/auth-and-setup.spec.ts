import { expect, test } from "@playwright/test";
import { mockConsentTemplate, mockEmptyBoardBootstrap } from "./support/bingoApi";

test("registers a user and completes initial keyword setup", async ({ page }) => {
  const createdBoardPayloads: Array<Record<string, unknown>> = [];

  await mockConsentTemplate(page);
  await mockEmptyBoardBootstrap(page, 7);

  await page.route("**/api/auth/bingo/register", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        message: "ok",
        user_id: 7,
        user_name: "테스터",
        login_id: "ABCD12",
      }),
    });
  });

  await page.route("**/api/bingo/boards", async (route) => {
    createdBoardPayloads.push(route.request().postDataJSON() as Record<string, unknown>);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        message: "ok",
        user_id: 7,
      }),
    });
  });

  await page.goto("/");

  await page.getByRole("button", { name: "내용 보기" }).click();
  await page.getByRole("button", { name: "동의하고 계속" }).click();

  await page.getByLabel("이름").fill("테스터");
  await page.getByLabel("비밀번호").fill("1234");
  await page.getByRole("button", { name: "계정 만들기" }).click();

  await expect(page.getByRole("heading", { name: "계정이 준비됐어요" })).toBeVisible();
  await expect(page.locator(".login-code-dialog__code")).toHaveText("ABCD12");

  await page.getByRole("button", { name: "빙고 시작하기" }).click();

  await expect(page.getByRole("heading", { name: "관심사 선택" })).toBeVisible();
  await page.getByRole("button", { name: /^키워드 1$/ }).click();
  await page.getByRole("button", { name: /^키워드 2$/ }).click();
  await page.getByRole("button", { name: /^키워드 3$/ }).click();
  await page.getByRole("button", { name: "빙고 시작하기" }).click();

  await expect(page.getByLabel("상대방 ID 입력")).toBeVisible();
  await expect(page.getByText("키워드가 설정되었습니다!")).toBeVisible();

  expect(createdBoardPayloads).toHaveLength(1);
  const [payload] = createdBoardPayloads;
  const boardData = payload.board_data as Record<
    string,
    { value: string; selected: number; status: number }
  >;
  const selectedCount = Object.values(boardData).filter(
    (cell) => cell.selected === 1
  ).length;
  expect(selectedCount).toBe(3);
});

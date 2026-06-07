import { expect, test } from "@playwright/test";
import {
  mockEmptyBoardBootstrap,
  mockPublicEventProfile,
  seedBingoSession,
} from "./support/bingoApi";

test("opens name setup first and completes initial keyword setup", async ({ page }) => {
  const createdBoardPayloads: Array<Record<string, unknown>> = [];

  await mockPublicEventProfile(page);
  await seedBingoSession(page, {
    userId: 7,
    userName: "구글 닉네임",
    loginId: "ABCD12",
  });
  await mockEmptyBoardBootstrap(page, 7);

  await page.route("**/api/bingo/boards", async (route) => {
    createdBoardPayloads.push(route.request().postDataJSON() as Record<string, unknown>);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        message: "ok",
        user_id: 7,
        display_name: "테스터",
      }),
    });
  });

  await page.goto("/event/bingo-networking/bingo");

  await expect(page.getByRole("heading", { name: "이름 설정" })).toBeVisible();
  await page.getByPlaceholder("이름을 입력하세요").fill("테스터");
  await page.getByRole("button", { name: "다음" }).click();

  await expect(page.getByRole("heading", { name: "관심사 선택" })).toBeVisible();
  await page.getByRole("button", { name: /^키워드 1$/ }).click();
  await page.getByRole("button", { name: /^키워드 2$/ }).click();
  await page.getByRole("button", { name: /^키워드 3$/ }).click();
  await page.getByRole("button", { name: "빙고 시작하기" }).click();

  await expect(page.getByLabel("상대방 이름 검색")).toBeVisible();
  await expect(page.getByText("키워드가 설정되었습니다!")).toBeVisible();

  expect(createdBoardPayloads).toHaveLength(1);
  const [payload] = createdBoardPayloads;
  expect(payload.display_name).toBe("테스터");
  const boardData = payload.board_data as Record<
    string,
    { value: string; selected: number; status: number }
  >;
  const selectedCount = Object.values(boardData).filter(
    (cell) => cell.selected === 1
  ).length;
  expect(selectedCount).toBe(3);
});

test("opens name setup after waiting on the countdown screen", async ({ page }) => {
  const startAt = new Date(Date.now() + 2500).toISOString();
  const endAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await mockPublicEventProfile(page, "bingo-networking", {
    startAt,
    endAt,
    restrictBeforeStart: true,
  });
  await seedBingoSession(page, {
    userId: 7,
    userName: "구글 닉네임",
    loginId: "ABCD12",
  });
  await mockEmptyBoardBootstrap(page, 7);

  await page.goto("/event/bingo-networking/bingo");

  await expect(page.getByRole("heading", { name: "빙고 오픈까지 조금만 기다려 주세요" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "이름 설정" })).toBeVisible({ timeout: 8000 });
});

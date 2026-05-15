import { expect, test } from "@playwright/test";
import {
  buildBoardData,
  buildInteractionRecord,
  mockParticipantSearch,
  mockPublicEventProfile,
  seedBingoSession,
} from "./support/bingoApi";

const session = {
  userId: 7,
  userName: "테스터",
  loginId: "ABCD12",
};

const selectedValues = ["키워드 21", "키워드 22", "키워드 23"];
const firstThreeRows = Array.from({ length: 15 }, (_, index) => `키워드 ${index + 1}`);

test("updates the board from incoming exchanges and celebrates when the bingo goal is reached", async ({
  page,
}) => {
  let boardRequestCount = 0;
  let interactionRequestCount = 0;

  await seedBingoSession(page, session);
  await mockPublicEventProfile(page);
  await mockParticipantSearch(page, [{ user_id: 9, display_name: "상대방" }]);

  await page.route(`**/api/bingo/boards/${session.userId}**`, async (route) => {
    boardRequestCount += 1;
    const hasReachedGoal = boardRequestCount > 1;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        message: "ok",
        user_id: session.userId,
        display_name: session.userName,
        board_data: buildBoardData({
          selectedValues,
          activeValues: hasReachedGoal ? firstThreeRows : [],
        }),
        bingo_count: hasReachedGoal ? 3 : 0,
        user_interaction_count: hasReachedGoal ? 1 : 0,
      }),
    });
  });

  await page.route(`**/api/bingo/interactions/${session.userId}/all**`, async (route) => {
    interactionRequestCount += 1;
    const hasNewIncomingExchange = interactionRequestCount > 1;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        message: "ok",
        interactions: hasNewIncomingExchange
          ? [
              buildInteractionRecord({
                interactionId: 201,
                sendUserId: 9,
                receiveUserId: session.userId,
                sendUserName: "상대방",
                receiveUserName: session.userName,
                updatedWords: firstThreeRows,
                bingoCount: 3,
                createdAt: "2026-05-16T12:00:00+09:00",
              }),
            ]
          : [],
      }),
    });
  });

  await page.goto("/event/bingo-networking/bingo");

  await expect(page.getByLabel("상대방 이름 검색")).toBeVisible();
  await expect(page.locator(".bingo-board-cell.is-complete")).toHaveCount(0);

  await expect(page.getByRole("heading", { name: "빙고를 완성했어요" })).toBeVisible({
    timeout: 8000,
  });
  await expect(page.getByText("3줄 미션을 달성했습니다.")).toBeVisible();
  await expect(page.locator(".bingo-board-cell.is-complete")).toHaveCount(15);
  await expect(page.locator(".bingo-board__line--core")).toHaveCount(3);
  await expect(page.locator(".bingo-confetti__piece")).toHaveCount(42);
  await expect(page.locator(".bingo-toast__title")).toHaveText("완료되었어요");
  await expect(page.locator(".bingo-toast__message")).toHaveText("빙고 한 줄을 완성했습니다! 🎉");
  await expect(page.locator(".history-panel").last()).toContainText("상대방");
});

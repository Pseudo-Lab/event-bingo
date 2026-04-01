import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  buildInteractionCreateResponse,
  buildInteractionRecord,
  mockBoardBootstrap,
  mockPublicEventProfile,
  seedBingoSession,
} from "./support/bingoApi";

const session = {
  userId: 7,
  userName: "테스터",
  loginId: "ABCD12",
};

const selectedValues = ["키워드 1", "키워드 2", "키워드 3"];

const openExchangePage = async ({
  page,
  interactions = [],
}: {
  page: Page;
  interactions?: Record<string, unknown>[];
}) => {
  await seedBingoSession(page, session);
  await mockPublicEventProfile(page);
  await mockBoardBootstrap({
    page,
    userId: session.userId,
    selectedValues,
    interactions,
  });

  await page.goto("/bingo-networking/bingo");
  await expect(page.getByLabel("상대방 ID 입력")).toBeVisible();
};

test("sends keywords from an existing bingo session", async ({ page }) => {
  await page.route("**/api/bingo/interactions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildInteractionCreateResponse({
          sendUserId: session.userId,
          receiveUserId: 9,
          sendUserName: session.userName,
          receiveUserName: "상대방",
          updatedWords: selectedValues,
        })
      ),
    });
  });

  await openExchangePage({ page });

  await page.getByLabel("상대방 ID 입력").fill("9");
  await page.getByRole("button", { name: "보내기" }).click();

  await expect(page.locator(".bingo-toast__title")).toHaveText("키워드를 전송했어요");
  await expect(page.getByText('"상대방"님에게 새로운 키워드를 전송했어요.')).toBeVisible();
  await expect(page.locator(".history-panel").first()).toContainText("상대방");
  await expect(page.getByLabel("상대방 ID 입력")).toHaveValue("");
});

test("blocks duplicate exchange before calling the API", async ({ page }) => {
  let postCalled = false;

  await page.route("**/api/bingo/interactions", async (route) => {
    postCalled = true;
    await route.abort();
  });

  await openExchangePage({
    page,
    interactions: [
      buildInteractionRecord({
        interactionId: 88,
        sendUserId: session.userId,
        receiveUserId: 9,
        sendUserName: session.userName,
        receiveUserName: "상대방",
        updatedWords: ["키워드 1"],
      }),
    ],
  });

  await page.getByLabel("상대방 ID 입력").fill("9");
  await page.getByRole("button", { name: "보내기" }).click();

  await expect(page.locator(".bingo-toast__title")).toHaveText("이미 전송한 참가자예요");
  await expect(page.getByText("이미 같은 참가자에게 키워드를 보냈어요.")).toBeVisible();
  expect(postCalled).toBe(false);
  await expect(page.getByLabel("상대방 ID 입력")).toHaveValue("9");
});

test("shows an error and allows retrying the exchange", async ({ page }) => {
  let requestCount = 0;

  await page.route("**/api/bingo/interactions", async (route) => {
    requestCount += 1;

    if (requestCount === 1) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          detail: "temporary backend error",
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        buildInteractionCreateResponse({
          interactionId: 102,
          sendUserId: session.userId,
          receiveUserId: 9,
          sendUserName: session.userName,
          receiveUserName: "상대방",
          updatedWords: ["키워드 1", "키워드 2"],
        })
      ),
    });
  });

  await openExchangePage({ page });

  await page.getByLabel("상대방 ID 입력").fill("9");
  await page.getByRole("button", { name: "보내기" }).click();

  await expect(page.locator(".bingo-toast__title")).toHaveText("문제가 발생했어요");
  await expect(page.getByText("에러가 발생했습니다. 잠시 후 다시 시도해주세요.")).toBeVisible();
  await expect(page.getByLabel("상대방 ID 입력")).toHaveValue("9");

  await page.getByRole("button", { name: "보내기" }).click();

  await expect(page.locator(".bingo-toast__title")).toHaveText("새 키워드만 전송했어요");
  await expect(page.getByText('"상대방"님이 이미 가진 키워드는 제외하고 새로운 키워드만 전송했어요.')).toBeVisible();
  await expect(page.locator(".history-panel").first()).toContainText("상대방");
  await expect(page.getByLabel("상대방 ID 입력")).toHaveValue("");
  expect(requestCount).toBe(2);
});

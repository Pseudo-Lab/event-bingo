import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import {
  buildInteractionCreateResponse,
  buildInteractionRecord,
  mockBoardBootstrap,
  mockParticipantSearch,
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
  await mockParticipantSearch(page, [{ user_id: 9, display_name: "상대방" }]);

  await page.goto("/event/bingo-networking/bingo");
  await expect(page.getByLabel("상대방 이름 검색")).toBeVisible();
};

const selectOpponent = async (page: Page) => {
  await page.getByLabel("상대방 이름 검색").fill("상대");
  await expect(page.getByRole("button", { name: "상대방" })).toBeVisible();
  await page.getByRole("button", { name: "상대방" }).click();
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
  await selectOpponent(page);
  await page.getByRole("button", { name: "보내기" }).click();

  await expect(page.locator(".bingo-toast__title")).toHaveText("키워드를 전송했어요");
  await expect(page.getByText('"상대방"님에게 내 키워드를 전송했어요.')).toBeVisible();
  await expect(page.locator(".history-panel").first()).toContainText("상대방");
  await expect(page.getByLabel("상대방 이름 검색")).toHaveValue("");
});

test("switches the game screen language to English", async ({ page }) => {
  await openExchangePage({ page });

  await page.getByRole("button", { name: "English" }).click();

  await expect(page.getByRole("heading", { name: /Fill your bingo board/ })).toBeVisible();
  await expect(page.getByLabel("Search participant name")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
  await expect(page.getByText("Bingo completion")).toBeVisible();
  await expect(page.getByRole("heading", { name: "People I Sent To" })).toBeVisible();

  await page.reload();

  await expect(page.getByLabel("Search participant name")).toBeVisible();
});

test.describe("mobile touch", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  test("submits an exchange with touch on mobile", async ({ page }) => {
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
    await page.getByLabel("상대방 이름 검색").tap();
    await page.getByLabel("상대방 이름 검색").fill("상대");
    const resultButton = page.getByRole("button", { name: "상대방" });
    await expect(resultButton).toBeVisible();
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const result = Array.from(document.querySelectorAll("button")).find(
            (button) => button.textContent?.trim() === "상대방"
          );
          if (!result) {
            return "";
          }

          const rect = result.getBoundingClientRect();
          return document
            .elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
            ?.textContent?.trim();
        })
      )
      .toBe("상대방");
    await resultButton.tap();
    await page.getByRole("button", { name: "보내기" }).tap();

    await expect(page.locator(".bingo-toast__title")).toHaveText("키워드를 전송했어요");
    await expect(page.locator(".history-panel").first()).toContainText("상대방");
  });
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

  await selectOpponent(page);
  await page.getByRole("button", { name: "보내기" }).click();

  await expect(page.locator(".bingo-toast__title")).toHaveText("이미 전송한 참가자예요");
  await expect(page.getByText("이미 같은 참가자에게 키워드를 보냈어요.")).toBeVisible();
  expect(postCalled).toBe(false);
  await expect(page.getByLabel("상대방 이름 검색")).toHaveValue("상대방");
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
          wordIdList: JSON.stringify(selectedValues),
          updatedWords: ["키워드 1", "키워드 2"],
        })
      ),
    });
  });

  await openExchangePage({ page });
  await selectOpponent(page);
  await page.getByRole("button", { name: "보내기" }).click();

  await expect(page.locator(".bingo-toast__title")).toHaveText("문제가 발생했어요");
  await expect(page.getByText("에러가 발생했습니다. 잠시 후 다시 시도해주세요.")).toBeVisible();
  await expect(page.getByLabel("상대방 이름 검색")).toHaveValue("상대방");

  await page.getByRole("button", { name: "보내기" }).click();

  await expect(page.locator(".bingo-toast__title")).toHaveText("키워드를 전송했어요");
  await expect(page.getByText('"상대방"님에게 내 키워드를 전송했어요.')).toBeVisible();
  await expect(page.locator(".bingo-toast__keywords")).toContainText("키워드 3");
  await expect(page.locator(".history-panel").first()).toContainText("상대방");
  await expect(page.getByLabel("상대방 이름 검색")).toHaveValue("");
  expect(requestCount).toBe(2);
});

import { expect, test, type Page } from "@playwright/test";

const readLatestCollectedKeywordCount = async (page: Page) =>
  page.evaluate(() => {
    const matches = Array.from(
      document.body.innerText.matchAll(/수집한 키워드\n(\d+)\/24/g),
    );
    return Number(matches.at(-1)?.[1] ?? -1);
  });

test("demo experience starts without login and records a sample encounter", async ({
  page,
}) => {
  await page.goto("/experience");

  await expect(page).toHaveURL(/\/demo\/play$/);
  await expect(page.getByRole("heading", { name: "관심사 선택" })).toBeVisible();

  await page.getByRole("button", { name: "AI", exact: true }).click();
  await page.getByRole("button", { name: "디자인", exact: true }).click();
  await page.getByRole("button", { name: "프로덕트", exact: true }).click();
  await page.getByRole("button", { name: "빙고 시작하기" }).click();

  await expect(page).toHaveURL(/\/demo\/play\/game\?keywords=/);
  await expect(page.getByText("빙고 완성률")).toBeVisible();
  await expect(page.getByText("만난 참가자")).toBeVisible();
  await expect(page.getByText("참가자 이름을 검색한 뒤 내 키워드를 보내보세요.")).toBeVisible();
  await expect(page.getByText("김철수")).toBeVisible();
  await expect(page.getByText("키워드를 보내면 기록이 여기에 쌓입니다.")).toBeVisible();
  await expect(page.getByText("받은 키워드가 생기면 기록이 표시됩니다.")).toBeVisible();

  const sendButton = page.getByRole("button", { name: "보내기" });
  await expect(sendButton).toBeDisabled();

  await page.getByRole("button", { name: /김철수/ }).click();
  await expect(sendButton).toBeEnabled();
  await expect(sendButton).toHaveCSS("background-color", "rgb(79, 195, 153)");

  await sendButton.click();
  await page.mouse.move(0, 0);
  await expect(page.getByText("내 키워드를 보냈어요")).toBeVisible();
  await expect(page.getByText("참가자 이름을 검색한 뒤 내 키워드를 보내보세요.")).toBeHidden();
  await expect(page.getByText("김철수 님").first()).toBeVisible();

  const receiveButton = page.getByRole("button", { name: "교환 확인" });
  await expect(receiveButton).toHaveClass(/ring-\[5px\]/);
  await expect(receiveButton).toHaveCSS("background-color", "rgb(221, 255, 87)");
  await expect(page.getByRole("button", { name: "다시 체험하기" })).toHaveCSS(
    "background-color",
    "rgb(221, 255, 87)",
  );

  await receiveButton.click();
  await expect(page.getByText("김민수 님에게")).toBeVisible();
  await expect(page.getByText("키워드를 받았어요")).toBeVisible();
});

test("mobile demo tutorial gates send and fills board after scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo/play");

  await page.getByRole("button", { name: "AI", exact: true }).click();
  await page.getByRole("button", { name: "디자인", exact: true }).click();
  await page.getByRole("button", { name: "프로덕트", exact: true }).click();
  await page.getByRole("button", { name: "빙고 시작하기" }).click();

  await expect(page).toHaveURL(/\/demo\/play\/game\?keywords=/);
  await expect(
    page.getByText("참가자 이름을 검색한 뒤 내 키워드를 보내보세요."),
  ).toBeVisible();

  const nameLabel = page.locator(".bingo-hero__form-field span").first();
  const nameChoice = page.getByRole("button", { name: /김철수/ });
  const sendButton = page.getByRole("button", { name: "보내기" });

  await expect(nameLabel).toHaveCSS("color", "rgb(203, 213, 225)");
  await expect(sendButton).toBeDisabled();

  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await nameChoice.click();
  await expect(nameLabel).toHaveCSS("color", "rgb(7, 19, 34)");
  await expect(sendButton).toBeEnabled();

  await sendButton.click();
  const receiveButton = page.getByRole("button", { name: "교환 확인" });
  await expect(receiveButton).toBeVisible();
  await expect(
    page.getByText("키워드를 주고받으면 서로의 빙고판이 채워져요."),
  ).toBeVisible();

  await expect.poll(() => readLatestCollectedKeywordCount(page)).toBe(0);
  await receiveButton.click();
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  expect(await readLatestCollectedKeywordCount(page)).toBe(0);
  await expect
    .poll(() => readLatestCollectedKeywordCount(page), { timeout: 2000 })
    .toBeGreaterThan(0);
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

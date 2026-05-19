import { expect, test } from "@playwright/test";

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
  await expect(page.locator('[data-demo-play-scroll="true"]')).toHaveCount(0);
  await expect(page.getByText("빙고 완성률")).toBeVisible();
  await expect(page.getByText("만난 참가자")).toBeVisible();
  await expect(page.getByText("참가자 이름을 검색한 뒤 내 키워드를 보내보세요.")).toBeVisible();
  await expect(page.locator('[data-demo-spotlight-mask="true"]')).toHaveCount(1);
  await expect(page.locator('[data-demo-spotlight-mask="true"]')).not.toHaveClass(/backdrop-blur/);
  await expect(page.getByText("김철수")).toBeVisible();
  await expect(page.getByText("키워드를 보내면 기록이 여기에 쌓입니다.")).toBeVisible();
  await expect(page.getByText("받은 키워드가 생기면 기록이 표시됩니다.")).toBeVisible();

  const sendButton = page.getByRole("button", { name: "보내기" });
  await expect(sendButton).toBeDisabled();
  await expect(sendButton).not.toHaveClass(/ring-\[5px\]/);
  await expect
    .poll(async () =>
      sendButton.evaluate((button) => {
        const container = button.parentElement;
        const containerBox = container?.getBoundingClientRect();
        const buttonBox = button.getBoundingClientRect();

        if (!containerBox) {
          return false;
        }

        return buttonBox.right <= containerBox.right - 8;
      }),
    )
    .toBe(true);

  await page.getByRole("button", { name: /김철수/ }).click();
  await expect(sendButton).toBeEnabled();
  await expect(sendButton).toHaveCSS("background-color", "rgb(79, 195, 153)");

  await sendButton.click();
  await page.mouse.move(0, 0);
  const sendToast = page.locator('[role="status"]').filter({ hasText: "키워드가 전달됐어요." });
  await expect(page.getByText("나의 키워드가 채워집니다.")).toBeVisible();
  await expect(sendToast).toHaveCount(1);
  await expect(sendToast).not.toHaveClass(/inset-0/);
  await expect(page.getByText("참가자 이름을 검색한 뒤 내 키워드를 보내보세요.")).toBeHidden();
  const receiveButton = page.getByRole("button", { name: "키워드 수신 테스트" });
  await expect(receiveButton).toHaveCount(0);
  await page.getByRole("button", { name: "다음 단계" }).click();
  await expect(sendToast).toHaveCount(0);
  await expect(page.getByText("김민수 님이 키워드를 보냈어요")).toBeVisible();
  await expect(page.getByText("김민수 답장")).toHaveCount(0);
  await expect(page.getByText("상대방 이름 검색")).toBeVisible();
  await expect(page.getByText("상대방 이름 검색")).toHaveCSS("color", "rgb(203, 213, 225)");
  await expect(page.getByRole("button", { name: "상대방 이름 검색" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "보내기" })).toBeDisabled();
  await expect(receiveButton).not.toHaveClass(/ring-\[5px\]/);
  await expect(receiveButton).toHaveCSS("background-color", "rgb(221, 255, 87)");
  await expect(
    page.getByText("상대방이 키워드를 보내면 내 빙고판에 상대방의 키워드가 채워집니다."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "다시 체험하기" })).toHaveCount(0);

  await receiveButton.click();
  await expect(page.getByText("김민수 님에게")).toBeVisible();
  await expect(page.getByText("키워드를 받았어요")).toBeVisible();
});

test("mobile demo is blocked with preparation notice", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo/play");

  await expect(page.getByRole("heading", { name: /모바일 데모는/ })).toBeVisible();
  await expect(page.getByText("PC에서 데모를 체험해 주세요.")).toBeVisible();
  await expect(page.getByRole("link", { name: "홈으로 돌아가기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "빙고 시작하기" })).toHaveCount(0);

  await page.goto("/demo/play/game?keywords=AI,%EB%94%94%EC%9E%90%EC%9D%B8,%ED%94%84%EB%A1%9C%EB%8D%95%ED%8A%B8");
  await expect(page.getByRole("heading", { name: /모바일 데모는/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "보내기" })).toHaveCount(0);
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

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
  await expect(page.getByText("빙고 완성률")).toBeVisible();
  await expect(page.getByText("만난 참가자")).toBeVisible();
  await expect(page.getByText("참가자 이름을 검색한 뒤 내 키워드를 보내보세요.")).toBeVisible();
  await expect(page.getByText("김철수 검색")).toBeVisible();
  await expect(page.getByText("키워드를 보내면 기록이 여기에 쌓입니다.")).toBeVisible();
  await expect(page.getByText("받은 키워드가 생기면 기록이 표시됩니다.")).toBeVisible();

  const sendButton = page.getByRole("button", { name: "보내기" });
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

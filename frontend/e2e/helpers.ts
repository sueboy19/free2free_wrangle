/**
 * Playwright E2E 測試輔助函數
 */

/**
 * Mock 登入
 * @param page Playwright Page 物件
 * @param userType 'organizer' | 'participant'
 */
export async function mockLogin(page, userType: 'organizer' | 'participant') {
  await page.goto('/login');

  const buttonText =
    userType === 'organizer' ? 'Mock 登入 開局者 (測試用戶 A)' : 'Mock 登入 參與者 (測試用戶 B)';

  await page.getByRole('button', { name: buttonText }).click();
  await page.waitForURL('/', { timeout: 5000 });
  await page.waitForTimeout(1000); // 等待歡迎提示

  // 確認登入成功
  const welcomeMessage = await page.getByRole('heading', { level: 2 }).first().textContent();
  const userName = userType === 'organizer' ? 'Test User' : '測試用戶 B (參與者)';
  return welcomeMessage?.includes(userName);
}

/**
 * 登出
 * @param page Playwright Page 物件
 */
export async function logout(page) {
  await page.getByRole('button', { name: '登出' }).click();
  await page.waitForURL('/', { timeout: 5000 });
  await page.waitForTimeout(1000); // 等待登出提示

  // 確認返回登入頁面
  const loginButton = await page.getByRole('link', { name: '登入' });
  return loginButton !== null;
}

/**
 * 創建配對
 * @param page Playwright Page 物件
 * @param activityName 活動名稱
 * @param date 配對日期 (格式: YYYY-MM-DDTHH:mm)
 */
export async function createMatch(page, activityName: string, date: string) {
  await page.goto('/matches/create');

  // 選擇活動
  await page.getByRole('combobox').selectOption(activityName);

  // 輸入日期
  await page.getByRole('textbox').fill(date);
  await page.waitForTimeout(500);

  // 提交表單
  await page.getByRole('button', { name: '創建配對' }).click();
  await page.waitForTimeout(1000);

  // 驗證創建成功
  const successMessage = await page.getByText('配對創建成功').first();
  return successMessage !== null;
}

/**
 * 加入配對
 * @param page Playwright Page 物件
 * @param matchId 配對 ID
 */
export async function joinMatch(page, matchId: string) {
  await page.goto(`/matches/${matchId}`);

  // 點擊"參與配對"按鈕
  await page.getByRole('button', { name: '參與配對' }).click();
  await page.waitForTimeout(1000);

  // 驗證成功加入
  const successMessage = await page.getByText('成功參與配對').first();
  return successMessage !== null;
}

/**
 * 檢查配對狀態
 * @param page Playwright Page 物件
 * @param matchId 配對 ID
 */
export async function getMatchStatus(page, matchId: string): Promise<string> {
  await page.goto(`/matches/${matchId}`);
  await page.waitForLoadState('networkidle');

  const statusElement = await page
    .locator('.generic')
    .filter({ hasText: /^(進行中|待審核|已取消|已完成)$/ })
    .first();
  return await statusElement.textContent();
}

/**
 * 導航到我的配對頁面
 * @param page Playwright Page 物件
 * @param tab 'organizing' | 'participating' | 'history'
 */
export async function navigateToMyMatches(page, tab: 'organizing' | 'participating' | 'history') {
  await page.goto('/my-matches');
  await page.waitForLoadState('networkidle');

  const buttonTexts = {
    organizing: '我開局的',
    participating: '我參與的',
    history: '歷史配對',
  };

  await page.getByRole('button', { name: buttonTexts[tab] }).click();
  await page.waitForTimeout(500);
}

/**
 * 獲取我的配對列表數量
 * @param page Playwright Page 物件
 */
export async function getMyMatchesCount(page): Promise<number> {
  await page.goto('/my-matches');
  await page.waitForLoadState('networkidle');

  const organizingButton = await page.getByRole('button', { name: '我開局的' });
  const organizingText = await organizingButton.textContent();
  const match = organizingText?.match(/\((\d+)\)/);

  return match ? parseInt(match[1]) : 0;
}

/**
 * 訪問個人資料頁面
 * @param page Playwright Page 物件
 */
export async function navigateToProfile(page) {
  await page.goto('/profile');
  await page.waitForLoadState('networkidle');
}

/**
 * 驗證頁面標題
 * @param page Playwright Page 物件
 * @param expectedTitle 預期標題
 */
export async function expectPageTitle(page, expectedTitle: string) {
  const actualTitle = await page.title();
  return actualTitle.includes(expectedTitle);
}

/**
 * 等待並關閉提示
 * @param page Playwright Page 物件
 */
export async function closeToast(page) {
  await page.waitForTimeout(2000);
  const closeButton = await page.getByRole('button', { name: 'close' }).first();
  if (closeButton) {
    await closeButton.click();
    await page.waitForTimeout(500);
  }
}

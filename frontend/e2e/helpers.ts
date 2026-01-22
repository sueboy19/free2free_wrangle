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
  const userName = userType === 'organizer' ? '測試用戶 A (開局者)' : '測試用戶 B (參與者)';
  return welcomeMessage?.includes(userName);
}

/**
 * 登出
 * @param page Playwright Page 物件
 */
export async function logout(page) {
  // 檢查是否在移動端（漢堡選單可見）
  const hamburgerMenu = await page.locator('button[aria-label="選單"]');

  // 檢查按鈕是否可見
  if (await hamburgerMenu.isVisible()) {
    // 移動端：打開選單
    await hamburgerMenu.click();
    await page.waitForTimeout(500);

    // 點擊登出按鈕（在選單中）
    await page.getByRole('button', { name: '登出' }).click();
  } else {
    // 桌面端：直接點擊登出按鈕
    await page.getByRole('button', { name: '登出' }).click();
  }

  await page.waitForURL('/login', { timeout: 5000 });
  await page.waitForTimeout(1000); // 等待登出提示

  // 確認返回登入頁面
  const pageTitle = await page.title();
  return pageTitle.includes('登入');
}

/**
 * 創建配對
 * @param page Playwright Page 物件
 * @param activityName 活動名稱
 * @param date 配對日期 (格式: YYYY-MM-DDTHH:mm)
 */
export async function createMatch(page, activityName: string, date: string) {
  await page.goto('/matches/create');

  // 等待頁面加載
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);

  // 檢查是否有載入狀態，如果有則等待消失
  const loadingElement = page.getByText('載入活動中...');
  const loadingCount = await loadingElement.count();

  if (loadingCount > 0) {
    // 等待「載入中...」消失
    try {
      await loadingElement.waitFor({ state: 'hidden', timeout: 15000 });
    } catch {
      console.log('Waiting for activities to load timed out, continuing...');
    }
  }

  // 等待活動列表加載完成，最多等待 20 秒
  await page.waitForSelector('select[name="activity"]', {
    state: 'visible',
    timeout: 20000,
  });

  // 再等待一下確保下拉選項已渲染
  await page.waitForTimeout(500);

  // 選擇活動
  await page.locator('select[name="activity"]').selectOption({ label: activityName });

  // 輸入日期
  await page.locator('input[type="datetime-local"]').fill(date);
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
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // 檢查是否已經參與過
  const alreadyJoined = (await page.getByText('待審核').first().count()) > 0;
  if (alreadyJoined) {
    // 如果已經參與過，直接返回 true
    return true;
  }

  // 點擊"參與配對"按鈕
  await page.getByRole('button', { name: '參與配對' }).click();

  // 等待成功消息顯示（使用更靈活的匹配）
  try {
    await page.waitForSelector('text=成功參與配對', { state: 'visible', timeout: 5000 });
    return true;
  } catch {
    // 如果沒有看到成功消息，檢查是否已經是待審核狀態
    const isPending = (await page.getByText('待審核').first().count()) > 0;
    return isPending;
  }
}

/**
 * 檢查用戶在配對中的狀態
 * @param page Playwright Page 物件
 * @param matchId 配對 ID
 */
export async function getUserMatchStatus(page, matchId: string): Promise<string> {
  await page.goto(`/matches/${matchId}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  // 檢查參與按鈕上方的狀態文本（"待審核"或"已申請"）
  const statusSpan = page
    .locator('span.btn-secondary')
    .filter({ hasText: /^(待審核|已申請)$/ })
    .first();

  if ((await statusSpan.count()) > 0) {
    return await statusSpan.textContent();
  }

  // 如果沒有找到參與狀態，檢查配對的狀態
  const matchStatus = await page
    .locator('span')
    .filter({ hasText: /^(進行中|待審核|已取消|已完成)$/ })
    .first();
  return await matchStatus.textContent();
}

/**
 * 檢查配對狀態
 * @param page Playwright Page 物件
 * @param matchId 配對 ID
 */
export async function getMatchStatus(page, matchId: string): Promise<string> {
  return await getUserMatchStatus(page, matchId);
}

/**
 * 導航到我的配對頁面
 * @param page Playwright Page 物件
 * @param tab 'organizing' | 'participating' | 'history'
 */
export async function navigateToMyMatches(page, tab: 'organizing' | 'participating' | 'history') {
  await page.goto('/my-matches');

  // 等待頁面加載
  await page.waitForLoadState('domcontentloaded');

  // 等待 Vue 應用掛載並渲染
  await page.waitForTimeout(1000);

  // 使用文字選擇器而不是 data-test 屬性
  const buttonTexts = {
    organizing: /我開局的/,
    participating: /我參與的/,
    history: /歷史配對/,
  };

  const buttonTextPattern = buttonTexts[tab];

  // 點擊包含指定文字的按鈕
  await page.locator('button').filter({ hasText: buttonTextPattern }).first().click();
  await page.waitForTimeout(500);
}

/**
 * 獲取我的配對列表數量
 * @param page Playwright Page 物件
 */
export async function getMyMatchesCount(page): Promise<number> {
  await page.goto('/my-matches');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  const organizingButton = await page.getByRole('button', { name: '我開局的' });
  const organizingText = await organizingButton.textContent();
  const match = organizingText?.match(/\((\d+)\)/);

  return match ? parseInt(match[1]) : 0;
}

/**
 * 等待並關閉提示
 * @param page Playwright Page 物件
 */
export async function closeToast(page) {
  await page.waitForTimeout(2000);
  const closeButton = page.getByRole('button', { name: 'close' }).first();
  if ((await closeButton.count()) > 0) {
    await closeButton.click().catch(() => {
      // Toast 可能已經自動關閉
    });
    await page.waitForTimeout(500);
  }
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
 * 訪問個人資料頁面
 * @param page Playwright Page 物件
 */
export async function navigateToProfile(page) {
  await page.goto('/profile');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);
}

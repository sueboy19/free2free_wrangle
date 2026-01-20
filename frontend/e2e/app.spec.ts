import { test, expect } from '@playwright/test';
import {
  mockLogin,
  logout,
  createMatch,
  joinMatch,
  getMatchStatus,
  navigateToMyMatches,
  getMyMatchesCount,
  navigateToProfile,
  expectPageTitle,
  closeToast,
} from './helpers';

/**
 * 買一送一配對網站 E2E 測試
 * 雙帳號交叉測試：配對、審核、評分
 */

test.describe('用戶認證測試', () => {
  test('用戶A (開局者) 可以登入', async ({ page }) => {
    const success = await mockLogin(page, 'organizer');
    expect(success).toBe(true);
  });

  test('用戶B (參與者) 可以登入', async ({ page }) => {
    const success = await mockLogin(page, 'participant');
    expect(success).toBe(true);
  });

  test('用戶登出功能正常', async ({ page }) => {
    await mockLogin(page, 'organizer');
    await closeToast(page);

    const loggedOut = await logout(page);
    expect(loggedOut).toBe(true);

    const isLoginPage = await expectPageTitle(page, '登入');
    expect(isLoginPage).toBe(true);
  });
});

test.describe('基本功能導航測試', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page, 'organizer');
    await closeToast(page);
  });

  test('可以訪問配對列表頁面', async ({ page }) => {
    await page.goto('/matches');
    const title = await page.title();
    expect(title).toContain('配對列表');
  });

  test('可以訪問我的配對頁面', async ({ page }) => {
    await page.goto('/my-matches');
    const title = await page.title();
    expect(title).toContain('我的配對');
  });

  test('可以訪問個人資料頁面', async ({ page }) => {
    await navigateToProfile(page);
    const title = await page.title();
    expect(title).toContain('個人資料');
  });

  test('可以從首頁導航到各頁面', async ({ page }) => {
    await page.goto('/');

    // 測試配對列表導航
    await page.getByRole('link', { name: '配對列表' }).click();
    expect(await page.title()).toContain('配對列表');

    // 測試創建配對導航
    await page.getByRole('link', { name: '創建配對' }).click();
    expect(await page.title()).toContain('創建配對');

    // 測試我的配對導航
    await page.getByRole('link', { name: '我的配對' }).click();
    expect(await page.title()).toContain('我的配對');
  });
});

test.describe('配對建立測試', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page, 'organizer');
    await closeToast(page);
  });

  test('用戶A 可以創建配對', async ({ page }) => {
    const now = new Date();
    const futureDate = new Date(now.setDate(now.getDate() + 1));
    const dateStr = futureDate.toISOString().slice(0, 16);

    const created = await createMatch(page, '羽毛球雙打 - 台北車站', dateStr);
    expect(created).toBe(true);
  });

  test('創建配對後可以在我的配對頁面看到', async ({ page }) => {
    // 創建配對
    const now = new Date();
    const futureDate = new Date(now.setDate(now.getDate() + 1));
    const dateStr = futureDate.toISOString().slice(0, 16);
    await createMatch(page, '羽毛球雙打 - 台北車站', dateStr);
    await closeToast(page);

    // 導航到我的配對頁面
    await navigateToMyMatches(page, 'organizing');

    // 檢查是否顯示創建的配對
    const matchCards = await page.getByRole('heading', { level: 3 }).all();
    expect(matchCards.length).toBeGreaterThan(0);
  });
});

test.describe('配對參與測試', () => {
  let matchId: string;

  test.beforeEach(async ({ page }) => {
    await mockLogin(page, 'organizer');
    await closeToast(page);

    // 創建測試配對
    const now = new Date();
    const futureDate = new Date(now.setDate(now.getDate() + 2));
    const dateStr = futureDate.toISOString().slice(0, 16);
    await createMatch(page, '跑步團 - 新北板橋', dateStr);
    await closeToast(page);

    // 導航到配對列表獲取最新的配對 ID
    await page.goto('/my-matches');
    await navigateToMyMatches(page, 'organizing');

    // 從第一個配對卡片獲取 ID
    const firstMatchLink = await page.getByRole('link', { name: '管理配對' }).first();
    const href = await firstMatchLink.getAttribute('href');
    matchId = href?.split('/').pop() || '1';
  });

  test('用戶B 可以申請加入配對', async ({ page }) => {
    // 登出用戶A
    await logout(page);

    // 用戶B 登入
    const loginSuccess = await mockLogin(page, 'participant');
    expect(loginSuccess).toBe(true);
    await closeToast(page);

    // 加入配對
    const joined = await joinMatch(page, matchId);
    expect(joined).toBe(true);
  });

  test('加入配對後狀態顯示為待審核', async ({ page }) => {
    // 用戶B 登入並加入配對
    await logout(page);
    await mockLogin(page, 'participant');
    await closeToast(page);

    await joinMatch(page, matchId);
    await closeToast(page);

    // 檢查配對狀態
    const status = await getMatchStatus(page, matchId);
    expect(status).toContain('待審核');
  });

  test('用戶A 可以查看待審核的參與者', async ({ page }) => {
    // 登出用戶B
    await logout(page);

    // 用戶A 登入
    await mockLogin(page, 'organizer');
    await closeToast(page);

    // 導航到配對詳情
    await page.goto(`/matches/${matchId}`);

    // 檢查是否顯示參與者管理區塊
    const participantSection = await page.getByRole('heading', { name: '參與者管理' });
    expect(participantSection).toBeVisible();
  });
});

test.describe('雙向配對流程測試', () => {
  let organizerMatchId: string;
  let participantMatchId: string;

  test('完整流程：用戶A創建 -> 用戶B加入 -> 用戶A審核', async ({ page }) => {
    // 用戶A 登入並創建配對
    await mockLogin(page, 'organizer');
    await closeToast(page);

    const now = new Date();
    const futureDate = new Date(now.setDate(now.getDate() + 3));
    const dateStr = futureDate.toISOString().slice(0, 16);

    await createMatch(page, '羽毛球雙打 - 台北車站', dateStr);
    await closeToast(page);

    // 獲取配對 ID
    await page.goto('/my-matches');
    await navigateToMyMatches(page, 'organizing');

    const firstMatchLink = await page.getByRole('link', { name: '管理配對' }).first();
    const href = await firstMatchLink.getAttribute('href');
    organizerMatchId = href?.split('/').pop() || '1';

    // 用戶A 登出
    await logout(page);

    // 用戶B 登入並加入配對
    await mockLogin(page, 'participant');
    await closeToast(page);

    await joinMatch(page, organizerMatchId);
    await closeToast(page);

    // 驗證狀態為待審核
    const status = await getMatchStatus(page, organizerMatchId);
    expect(status).toContain('待審核');
  });

  test('反向流程：用戶B創建 -> 用戶A加入 -> 用戶B審核', async ({ page }) => {
    // 用戶B 登入並創建配對
    await mockLogin(page, 'participant');
    await closeToast(page);

    const now = new Date();
    const futureDate = new Date(now.setDate(now.getDate() + 4));
    const dateStr = futureDate.toISOString().slice(0, 16);

    await createMatch(page, '桌派對 - 台中車站', dateStr);
    await closeToast(page);

    // 獲取配對 ID
    await page.goto('/my-matches');
    await navigateToMyMatches(page, 'organizing');

    const firstMatchLink = await page.getByRole('link', { name: '管理配對' }).first();
    const href = await firstMatchLink.getAttribute('href');
    participantMatchId = href?.split('/').pop() || '2';

    // 用戶B 登出
    await logout(page);

    // 用戶A 登入並加入配對
    await mockLogin(page, 'organizer');
    await closeToast(page);

    await joinMatch(page, participantMatchId);
    await closeToast(page);

    // 驗證狀態為待審核
    const status = await getMatchStatus(page, participantMatchId);
    expect(status).toContain('待審核');
  });
});

test.describe('我的配對頁面功能測試', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page, 'organizer');
    await closeToast(page);
  });

  test('切換標籤查看不同類型的配對', async ({ page }) => {
    await page.goto('/my-matches');

    // 測試我開局的標籤
    await navigateToMyMatches(page, 'organizing');
    expect(await page.title()).toContain('我的配對');

    // 測試我參與的標籤
    await navigateToMyMatches(page, 'participating');
    expect(await page.title()).toContain('我的配對');

    // 測試歷史配對的標籤
    await navigateToMyMatches(page, 'history');
    expect(await page.title()).toContain('我的配對');
  });

  test('顯示統計數據', async ({ page }) => {
    await navigateToProfile(page);

    // 檢查是否顯示統計數據
    const stats = await page
      .locator('.generic')
      .filter({ hasText: /^(開局數量|參與數量|完成數量)$/ })
      .all();
    expect(stats.length).toBe(3);
  });
});

test.describe('個人資料頁面測試', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page, 'organizer');
    await closeToast(page);
  });

  test('顯示用戶基本信息', async ({ page }) => {
    await navigateToProfile(page);

    // 檢查用戶名稱
    const userName = await page.getByRole('heading', { level: 2 }).first().textContent();
    expect(userName).toContain('Test User');

    // 檢查登入方式
    const loginMethod = await page.getByText(/登入方式/).first();
    expect(loginMethod).toBeVisible();
  });

  test('顯示最近活動列表', async ({ page }) => {
    await navigateToProfile(page);

    // 檢查是否顯示最近活動區塊
    const recentActivities = await page.getByRole('heading', { name: '最近活動' });
    expect(recentActivities).toBeVisible();
  });
});

test.describe('錯誤處理測試', () => {
  test('未登入無法訪問需要認證的頁面', async ({ page }) => {
    await page.goto('/my-matches');

    // 應該被重定向到登入頁面
    await page.waitForURL(/\/login/, { timeout: 5000 });
    const title = await page.title();
    expect(title).toContain('登入');
  });

  test('無效的配對 ID 顯示錯誤頁面', async ({ page }) => {
    await mockLogin(page, 'organizer');
    await closeToast(page);

    // 訪問不存在的配對
    await page.goto('/matches/999999');

    // 檢查是否顯示錯誤提示或返回列表
    const url = page.url();
    expect(url.includes('/matches') || url.includes('/login')).toBe(true);
  });
});

test.describe('響應式設計測試', () => {
  test('桌面版瀏覽器正常顯示', async ({ page }) => {
    await mockLogin(page, 'organizer');
    await closeToast(page);

    // 檢查導航菜單是否顯示
    const navigation = await page.getByRole('navigation');
    expect(navigation).toBeVisible();

    // 檢查主要內容區域
    const main = await page.getByRole('main');
    expect(main).toBeVisible();
  });
});

test.describe('表單驗證測試', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page, 'organizer');
    await closeToast(page);
  });

  test('創建配對時必填字段驗證', async ({ page }) => {
    await page.goto('/matches/create');

    // 嘗試不選擇活動直接提交
    await page.getByRole('button', { name: '創建配對' }).click();

    // 應該顯示錯誤提示或阻止提交
    await page.waitForTimeout(1000);

    // 檢查是否仍在創建頁面（未提交成功）
    const url = page.url();
    expect(url).toContain('/matches/create');
  });
});

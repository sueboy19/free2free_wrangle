import { defineConfig, devices } from '@playwright/test';
import type { PlaywrightTestConfig } from '@playwright/test';

/**
 * Playwright E2E 測試配置
 */
const config: PlaywrightTestConfig = defineConfig({
  testDir: './',
  testMatch: /\.spec\.ts$/,

  // 測試環境配置
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // 捕獲瀏覽器 console 日誌
    launchOptions: {
      args: ['--enable-logging'],
    },
  },

  // 基本超時設定
  timeout: 30000, // 30 秒
  expect: {
    timeout: 10000, // 10 秒
  },

  // 重試策略
  retries: process.env.CI ? 2 : 0,

  // 報告器配置
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results.json' }],
  ],

  // 並行配置
  // 設為 1 避免並行測試共享資料庫時的衝突（如：同一配對不能同時被兩個用戶加入）
  workers: 1,

  // 專案配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
});

export default config;

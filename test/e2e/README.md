# E2E 測試文件說明

## 概述

本目錄包含 End-to-End (E2E) 測試，用於驗證整個系統的業務邏輯和 API 行為。

## 測試文件

| 文件 | 說明                        | 測試數量                                        |
| ---- | --------------------------- | ----------------------------------------------- | --- |
|      | `helpers.ts`                | 測試輔助函數（mock 登入、API 請求包裝等）       | -   |
|      | `test-flow.test.ts`         | 配對完整流程測試（vitest）                      | 1   |
|      | `concurrent-join.test.ts`   | 競態條件 - 並發參與測試                         | 3   |
|      | `capacity-check.test.ts`    | 配對容量驗證測試（驗證當前無容量限制的行為）    | 4   |
|      | `review-validation.test.ts` | 審核驗證測試                                    | 8   |
|      | `review-permission.test.ts` | 評分權限驗證測試                                | 10  |
|      | `init-test-data.ts`         | 初始化測試資料（插入測試 location 和 activity） | -   |
|      | `import-to-d1.sql`          | SQL 測試資料匯入腳本                            | -   |

## 如何運行測試

### 方法 1：使用 vitest

運行所有 E2E 測試：

```bash
npm run test:e2e
```

```bash
cd frontend/e2e && npx playwright test --project=chromium 

cd frontend/e2e && npx playwright test --project=mobile
```

這會運行以下測試：

- 配對完整流程測試（`test-flow.test.ts`）
- 競態條件測試（`concurrent-join.test.ts`）
- 配對容量驗證測試（`capacity-check.test.ts`）
- 審核驗證測試（`review-validation.test.ts`）
- 評分權限驗證測試（`review-permission.test.ts`）

**注意**：當前測試使用 `app.request()` 直接調用 Worker，符合 vitest-pool-workers 的架構。

## 測試結果說明

### 1. 競態條件測試 (`concurrent-join.test.ts`)

目的：驗證多個用戶同時參與配對不會產生重複記錄

測試場景：

- 並發參與配對不應產生重複記錄
- 單個用戶連續多次參與應只允許一次成功
- 不同用戶同時參與應該都能成功

預期結果：第一個請求成功，其餘請求失敗並返回「您已經參與過此配對」

### 2. 配對容量驗證測試 (`capacity-check.test.ts`)

目的：驗證容量檢查邏輯

**重要發現**：

- 實際代碼（`src/routes/organizer.ts`）中並沒有實現容量檢查
- 第 113-114 行註釋：「Note: No capacity check at application stage」
- 第 168-169 行註釋：「Note: No capacity check during review stage」

測試場景：

- 當前行為：參與配對沒有容量限制
- 記錄：當前系統缺少容量檢查
- 開局者不能參與自己的配對
- 同一用戶不能重複參與同一配對

**建議**：需要在後續版本中實施容量檢查邏輯。

### 3. 審核驗證測試 (`review-validation.test.ts`)

目的：驗證審核邏輯正確工作

測試場景：

- 開局者可以批准參與者
- 開局者可以拒絕參與者
- 不能審核已完成的配對
- 不能審核已取消的配對
- 參與者不能審核其他參與者
- 不能使用無效的審核狀態
- 不能審核不存在的參與者
- 不能審核不存在的配對

預期結果：所有權限檢查正確阻止不合法的操作

### 4. 評分權限驗證測試 (`review-permission.test.ts`)

目的：驗證評分權限檢查正常工作

測試場景：

- 未參與的用戶不能評分
- 只能評分已完成的配對
- 不能自我評分
- 不能評分未參與配對的用戶
- 不能重複評分同一用戶
- 正常評分流程應該成功
- 評分必須在 1-5 範圍內
- 評分可以不包含評論
- 必須提供必填字段

預期結果：所有權限檢查正確阻止不合法的評分

## 已知問題

### 1. 容量檢查未實施

參與配對和審核參與者時都沒有容量檢查，開局者可以批准任意數量的參與者，不受 `target_count` 限制。

### 2. 測試框架集成問題

當前的 E2E 測試文件需要修正以正確使用 vitest-pool-workers。測試函數應該使用以下語法：

```typescript
it('should do something', async ({ env }) => {
  // 使用 env 參數
});
```

而不是：

```typescript
beforeEach(async ({ env }) => {
  env = testEnv;
});

it('should do something', async () => {
  // 使用 env 變量
});
```

## 未來改進

1. 修正 E2E 測試以正確使用 vitest-pool-workers
2. 實施容量檢查邏輯
3. 添加更多邊緣情況測試
4. 添加性能測試
5. 添加數據清理腳本以確保測試隔離

## 參考資料

- [Vitest 文檔](https://vitest.dev/)
- [@cloudflare/vitest-pool-workers 文檔](https://github.com/cloudflare/vitest-pool-workers)
- [Hono 測試文檔](https://hono.dev/docs/testing/)
- [OPTIMIZATION_REPORT.md](../../OPTIMIZATION_REPORT.md)

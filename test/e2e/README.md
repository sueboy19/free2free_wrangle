# E2E 測試文件說明

## 概述

本目錄包含 End-to-End (E2E) 測試，用於驗證整個系統的業務邏輯和 API 行為。

## 測試文件

| 文件                        | 說明                                         | 測試數量 |
| --------------------------- | -------------------------------------------- | -------- |
| `helpers.ts`                | 測試輔助函數（mock 登入、API 請求包裝等）    | -        |
| `test-flow.test.ts`         | 配對完整流程測試（vitest）                   | 1        |
| `concurrent-join.test.ts`   | 競態條件 - 並發參與測試                      | 3        |
| `capacity-check.test.ts`    | 配對容量驗證測試（驗證當前無容量限制的行為） | 4        |
| `review-validation.test.ts` | 審核驗證測試                                 | 8        |
| `review-permission.test.ts` | 評分權限驗證測試                             | 10       |

## 如何運行測試

### 步驟 1：重置測試資料庫

在運行測試之前，請先重置資料庫以確保測試環境乾淨：

```bash
# 清理並重置本地資料庫（推薦）
npm run db:reset

# 清理並重置遠程資料庫（需要輸入 "YES" 確認）
npm run db:reset:remote
```

詳細的測試資料管理方案請參考：[docs/TEST_DATA_MANAGEMENT.md](../docs/TEST_DATA_MANAGEMENT.md)

### 步驟 2：運行測試

#### 後端 E2E 測試（Vitest）

運行所有後端 E2E 測試：

```bash
npm run test:e2e
```

#### Frontend E2E 測試（Playwright）

**重要說明**：

- ✅ **自動執行 db:reset**：e2e 腳本會自動重置測試資料庫，確保測試環境乾淨
- 🚫 **chromium 和 mobile 必須分開執行**：同時執行會導致測試超時（timeout）

**從根目錄一鍵執行（推薦）**：

```bash
# 運行桌面版測試（Chromium）
npm run e2e -- --project=chromium

# 運行移動版測試（Mobile）
npm run e2e -- --project=mobile
```

**在 frontend/e2e 目錄執行**：

```bash
# 切換到測試目錄
cd frontend/e2e

# 運行特定測試環境
npm test -- --project=chromium  # 桌面版
npm test -- --project=mobile    # 移動版

# 運行特定測試
npm test -- --project=chromium -g "用戶B 可以申請加入配對"
```

**其他執行方式**：

```bash
# 有視窗執行
npm run e2e:headed -- --project=chromium

# 調試模式
npm run e2e:debug -- --project=chromium

# UI 模式
npm run e2e:ui

# 查看測試報告
npm run e2e:report
```

**注意**：

- `npm run e2e`、`e2e:headed`、`e2e:debug` 都會自動執行 `db:reset`
- 可以通過 `--` 後的參數傳遞給 Playwright，例如 `--project=chromium` 或 `-g "測試名稱"`

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
5. 添加測試隔離機制（每個測試前自動清理資料）

## 測試輔助函數

`helpers.ts` 提供了以下函數：

- `mockLogin()` - Mock 登入獲取 token（使用標準化測試用戶）
- `createMatch()` - 創建配對
- `joinMatch()` - 申請加入配對
- `concurrentJoin()` - 並發參與配對（用於競態條件測試）
- `reviewParticipant()` - 審核參與者
- `closeMatch()` - 關閉配對
- `createReview()` - 創建評分
- `setupTestData` - 清理測試數據（已棄用，請使用 CLI 腳本）

**注意：** `setupTestData` 的 cleanup 功能已棄用，請改用 `npm run db:reset`

## 參考資料

- [Vitest 文檔](https://vitest.dev/)
- [@cloudflare/vitest-pool-workers 文檔](https://github.com/cloudflare/vitest-pool-workers)
- [Hono 測試文檔](https://hono.dev/docs/testing/)
- [OPTIMIZATION_REPORT.md](../../OPTIMIZATION_REPORT.md)
- [TEST_DATA_MANAGEMENT.md](../../docs/TEST_DATA_MANAGEMENT.md) - 測試資料管理方案

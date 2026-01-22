# 測試資料清理和重置方案

## 概述

為了解決測試資料混亂的問題，並避免生產環境誤操作的風險，我們實施了一套標準化的測試資料清理和重置方案。

## 問題

### 原有問題

1. ❌ `test/e2e/import-to-d1.sql` 包含重複的測試資料（同一資料插入了兩次）
2. ❌ Mock Login A/B 的用戶 ID 與 E2E 測試不一致
3. ❌ `test/cleanup/*` HTTP 端點存在生產環境風險
4. ❌ 缺乏統一的測試資料管理方式

## 解決方案

### 1. 標準化測試資料

#### 文件：`scripts/reset-test-data.sql`

清空所有資料表並插入標準化的測試資料：

**測試用戶：**
| social_id | 名稱 | 郵箱 | 用途 |
|-----------|------|------|------|
| `test_user_1` | 測試用戶 A (開局者) | test_user_1@example.com | Mock Login A |
| `test_user_2` | 測試用戶 B (參與者) | test_user_2@example.com | Mock Login B |
| `test_user_3` | 測試用戶 C | test_user_3@example.com | E2E 測試 |

**測試地點：**

- 台北車站 (25.0479, 121.5170)
- 新北板橋 (25.0124, 121.4635)
- 台中車站 (24.1477, 120.6736)

**測試活動：**

- 羽毛球雙打（目標 4 人）
- 跑步團（目標 10 人）
- 桌派對（目標 6 人）

### 2. CLI 清理腳本

#### 文件：`scripts/clean-database.ts`

安全的資料庫清理工具，特點：

- ✅ **不暴露 HTTP 端點**：避免生產環境誤操作風險
- ✅ **交互式確認**：遠程環境需要輸入 "YES" 確認
- ✅ **本地環境直接執行**：無需確認，提高開發效率
- ✅ **清晰輸出**：顯示執行步驟和結果

### 3. 統一測試用戶

所有測試環境使用相同的測試用戶：

- ✅ 前端 Login.vue：`test_user_1`, `test_user_2`
- ✅ 後端 E2E 測試 (test/e2e/helpers.ts)：`test_user_1`, `test_user_2`, `test_user_3`
- ✅ Frontend E2E 測試 (frontend/e2e)：使用相同用戶

### 4. 清理舊文件

- 移除 `test/e2e/import-to-d1.sql`（已棄用）
- 棄用 `test/e2e/helpers.ts` 中的 `setupTestData` cleanup 功能

## 使用方式

### 快速開始

```bash
# 清理並重置本地資料庫（推薦）
npm run db:reset

# 清理並重置遠程資料庫（需要輸入 "YES" 確認）
npm run db:reset:remote
```

### 直接執行 SQL 腳本

```bash
# 本地環境
wrangler d1 execute DB --local --file=./scripts/reset-test-data.sql

# 遠程環境（⚠️ 請謹慎使用！）
wrangler d1 execute free2free-db --remote --file=./scripts/reset-test-data.sql
```

## 運行測試

在運行測試之前，請先重置資料庫：

```bash
# 1. 重置資料庫
npm run db:reset

# 2. 運行測試
npm run test           # 單元測試 + 整合測試
npm run test:e2e       # 後端 E2E 測試
cd frontend/e2e && npx playwright test  # Frontend E2E 測試
```

## 架構變更

### 新增文件

```
scripts/
├── reset-test-data.sql      # 標準化測試資料腳本
└── clean-database.ts        # CLI 資料庫清理腳本
```

### 修改文件

```
test/e2e/
└── helpers.ts               # 統一測試用戶 ID，棄用 cleanup

package.json                 # 添加 db:reset 命令
README.md                    # 更新文檔
```

### 已棄用功能

- ❌ `/test/cleanup/*` HTTP 端點（已移除）
- ❌ `setupTestData.cleanMatchData()`（已棄用）
- ❌ `setupTestData.cleanUser()`（已棄用）
- ❌ `test/e2e/import-to-d1.sql`（已移除）

## 安全性

### 避免生產環境風險

1. **不暴露 HTTP 清理端點**：所有清理操作必須通過 CLI 執行
2. **遠程環境交互式確認**：需要明確輸入 "YES" 才能執行
3. **本地環境無需確認**：提高開發效率，但僅限本地
4. **清晰的警告提示**：提醒操作不可復原

## 總結

### 改進前

- ❌ 測試資料重複且混亂
- ❌ 用戶 ID 不一致
- ❌ HTTP 清理端點存在安全風險
- ❌ 缺乏統一的資料管理方式

### 改進後

- ✅ 標準化的測試資料
- ✅ 統一的測試用戶 ID
- ✅ 安全的 CLI 清理工具
- ✅ 清晰的使用文檔
- ✅ 便捷的 npm scripts

## 相關文檔

- [README.md](../README.md) - 主文檔
- [test/e2e/README.md](../test/e2e/README.md) - E2E 測試說明

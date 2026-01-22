# Free2Free API - Cloudflare Workers

買一送一配對網站的 Cloudflare Workers 後端 API。

## 技術棧

- **框架**: Hono
- **語言**: TypeScript
- **資料庫**: Cloudflare D1 (SQLite)
- **存儲**: Cloudflare KV
- **部署**: Cloudflare Workers

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 配置環境

建立 `.dev.vars` 檔案（參考 `.dev.vars.example`）：

```bash
JWT_SECRET=your_local_jwt_secret_at_least_32_characters_long
SESSION_KEY=your_local_session_secret_key_at_least_32_characters
FACEBOOK_KEY=your_local_facebook_app_key
FACEBOOK_SECRET=your_local_facebook_app_secret
INSTAGRAM_KEY=your_local_instagram_app_key
INSTAGRAM_SECRET=your_local_instagram_app_secret
```

### 3. 重置測試資料庫

```bash
npm run db:reset
```

### 4. 啟動開發伺服器

```bash
npm run dev
```

### 5. 運行測試

```bash
# 後端測試
npm run test

# Frontend E2E 測試
# 注意：運行 E2E 測試前需要先重置資料庫
npm run db:reset

cd frontend/e2e 
npx playwright test --project-chromium
npx playwright test --project-mobile
```

**重要說明**：

- ⚠️ **必須先執行 `npm run db:reset`**：E2E 測試會在資料庫中創建大量配對數據，重置可確保測試環境乾淨
- 🔧 **並行測試已限制為 1**：避免桌面端和移動端測試同時運行時造成資料庫衝突（如同一配對不能同時被兩個用戶加入）
- 📱 **兩套測試環境**：包含 chromium（桌面版）和 mobile（iPhone 13）兩種裝置的測試

## 開發環境

### 前置要求

- Node.js 18+
- npm 或 yarn
- Wrangler CLI

### 安裝 Wrangler

```bash
npm i -D wrangler@latest
wrangler login
```

### 本地開發

```bash
# 啟動本地開發伺服器（會自動建立本地 D1 資料庫）
npm run dev

# 運行測試
npm run test

# 運行 lint
npm run lint

# 清理並重置測試資料庫（本地）
npm run db:reset

# 清理並重置測試資料庫（遠程，需要確認）
npm run db:reset:remote
```

### 前端開發

```bash
# 啟動前端開發伺服器
wrangler pages dev ../frontend/dist --port=3000
```

## 環境配置

本專案支援三個環境：**本地開發**、**Staging**、**Production**。

### 本地開發（Development）

**資料庫**：

- 使用純本地 D1 資料庫（在 `.wrangler` 目錄中）
- `wrangler dev` 首次執行時會自動建立
- 使用 `--local` 參數操作本地資料庫

**Secrets 管理**：

- 使用 `.dev.vars` 檔案（已在 `.gitignore` 中）

**重要配置**：

⚠️ **本地開發必須設定 `database_id`**：

```toml
[[d1_databases]]
binding = "DB"
database_name = "free2free-db"
database_id = "local-dev-placeholder"  # 任意值均可
```

**常用指令**：

```bash
# 執行本地資料庫 migration
wrangler d1 execute DB --local --file=./migrations/0001_initial.sql

# 查詢本地資料庫
wrangler d1 execute DB --local --command="SELECT * FROM users LIMIT 10;"
```

### Staging 環境

**建立資料庫**：

```bash
wrangler d1 create free2free-db-staging
# 將 database_id 填入 wrangler.toml 的 [env.staging.d1_databases].database_id
```

**設定 Secrets**：

```bash
wrangler secret put JWT_SECRET --env staging
wrangler secret put SESSION_KEY --env staging
wrangler secret put FACEBOOK_KEY --env staging
wrangler secret put FACEBOOK_SECRET --env staging
wrangler secret put INSTAGRAM_KEY --env staging
wrangler secret put INSTAGRAM_SECRET --env staging
```

**常用指令**：

```bash
# 執行 staging 資料庫 migration
wrangler d1 execute free2free-db-staging --remote --file=./migrations/0001_initial.sql

# 部署到 staging
wrangler deploy --env staging
```

### Production 環境

**資料庫**：

- 已建立雲端 D1 資料庫（`7e2b5c27-c755-42e5-b349-b035b5df3534`）

**設定 Secrets**：

```bash
wrangler secret put JWT_SECRET --env production
wrangler secret put SESSION_KEY --env production
wrangler secret put FACEBOOK_KEY --env production
wrangler secret put FACEBOOK_SECRET --env production
wrangler secret put INSTAGRAM_KEY --env production
wrangler secret put INSTAGRAM_SECRET --env production
```

**CORS_ORIGINS**：

```bash
# 格式：,http://localhost:5173,http://localhost:3000 用,隔開
wrangler secret put CORS_ORIGINS --env production
```

**Debug**：

```bash
wrangler tail --env=production
```

**常用指令**：

```bash
# 執行 production 資料庫 migration
wrangler d1 execute free2free-db --remote --file=./migrations/0001_initial.sql

# 部署到 production
wrangler deploy --env production

# 部署 Frontend
wrangler pages deploy ../frontend/dist --project-name=free2free
```

### 環境對比表

| 項目             | 本地開發                | Staging                             | Production                             |
| ---------------- | ----------------------- | ----------------------------------- | -------------------------------------- |
| **啟動指令**     | `wrangler dev`          | `wrangler deploy --env staging`     | `wrangler deploy --env production`     |
| **資料庫位置**   | 本地檔案（`.wrangler`） | 雲端 D1                             | 雲端 D1                                |
| **資料庫建立**   | 自動建立                | `wrangler d1 create`                | 已建立                                 |
| **資料庫遷移**   | `--local`               | `--remote`                          | `--remote`                             |
| **Secrets 管理** | `.dev.vars`             | `wrangler secret put --env staging` | `wrangler secret put --env production` |
| **Secrets 存放** | 本地檔案                | Cloudflare 雲端（加密）             | Cloudflare 雲端（加密）                |

### 重要提醒

⚠️ **`--env` 參數很重要**：

- 部署時必須指定 `--env staging` 或 `--env production`

⚠️ **Secrets 環境隔離**：

- 每個環境的 secrets 是完全獨立的
- 避免使用 production 的 secrets 在 staging 或本地開發

⚠️ **資料庫操作注意**：

- 本地開發用 `--local`
- 雲端環境用 `--remote`
- 避免誤操作 production 資料庫

### 部署前檢查清單

在部署到 production 之前，請確認：

- [ ] 所有測試已通過（`npm run test`）
- [ ] 資料庫遷移已在 staging 測試過
- [ ] production 的 secrets 已設定
- [ ] CORS_ORIGINS 已更新為生產域名
- [ ] 檢查 wrangler.toml 中的生產環境設定

## 資料庫

### 執行 Migration

**本地開發**：

```bash
wrangler d1 execute DB --local --file=./migrations/0001_initial.sql
wrangler d1 execute DB --local --command="SELECT name FROM sqlite_master WHERE type='table';"
```

**Staging 環境**：

```bash
wrangler d1 execute free2free-db-staging --remote --file=./migrations/0001_initial.sql
```

**Production 環境**：

```bash
wrangler d1 execute free2free-db --remote --file=./migrations/0001_initial.sql
```

### 重置測試資料

⚠️ **重要：以下操作會清空所有資料表並重新插入測試資料，請謹慎使用！**

#### 使用 CLI 腳本（推薦）

```bash
# 清理並重置本地資料庫
npm run db:reset

# 清理並重置遠程資料庫（需要輸入 "YES" 確認）
npm run db:reset:remote
```

**CLI 腳本功能**：

- ✅ 清空所有資料表
- ✅ 重置 autoincrement 序列
- ✅ 插入標準化的測試資料
- ✅ 本地環境直接執行
- ✅ 遠程環境需要交互式確認

#### 直接執行 SQL 腳本

```bash
# 清理並重置本地資料庫
wrangler d1 execute DB --local --file=./scripts/reset-test-data.sql

# 清理並重置遠程資料庫（⚠️ 請謹慎使用！）
wrangler d1 execute free2free-db --remote --file=./scripts/reset-test-data.sql
```

#### 測試用戶說明

測試資料包含以下標準用戶：

| 用戶類型    | social_id     | 名稱                | 用途       |
| ----------- | ------------- | ------------------- | ---------- |
| Mock User A | `test_user_1` | 測試用戶 A (開局者) | 開局者登入 |
| Mock User B | `test_user_2` | 測試用戶 B (參與者) | 參與者登入 |
| Mock User C | `test_user_3` | 測試用戶 C          | 額外參與者 |

**這些用戶 ID 用於**：

- ✅ 前端 Mock Login (Login.vue)
- ✅ 後端 E2E 測試 (test/e2e/helpers.ts)
- ✅ Frontend E2E 測試 (frontend/e2e)

⚠️ **Production 環境通常不匯入測試資料**，應使用真實資料。

### 資料表結構

- `users` - 使用者資料
- `admins` - 管理員資料
- `locations` - 地點資料
- `activities` - 活動資料
- `matches` - 配對局資料
- `match_participants` - 參與者資料
- `reviews` - 評分資料
- `review_likes` - 評分點讚資料
- `refresh_tokens` - 重新整理 token 資料
- `sessions` - Session 資料

### 資料庫操作

```bash
# 本地開發
wrangler d1 execute DB --local --command="..."

# Staging
wrangler d1 execute free2free-db-staging --remote --command="..."

# Production
wrangler d1 execute free2free-db --remote --command="..."
```

詳細說明請參考：[TEST_DATA_MANAGEMENT.md](./docs/TEST_DATA_MANAGEMENT.md)

## 認證

### OAuth 登入流程

1. 獲取 OAuth 授權 URL

   ```
   GET /auth/:provider
   ```

2. 用戶授權後，系統回調

   ```
   GET /auth/:provider/callback?code=...
   ```

3. 返回 JWT token 和 session

### JWT Token

- **Access Token**: 15 分鐘過期
- **Refresh Token**: 7 天過期

### 使用 Token

在請求頭中添加 Authorization：

```
Authorization: Bearer <access_token>
```

### 刷新 Token

```
POST /auth/refresh
{
  "refresh_token": "<refresh_token>"
}
```

### 登出

```
POST /auth/logout
{
  "refresh_token": "<refresh_token>",
  "session_id": "<session_id>"
}
```

## 專案結構

```
src/
├── lib/           # 工具函數（db, kv, jwt, oauth）
├── routes/        # API 路由處理器
├── middleware/    # 中介層（cors, auth, error）
├── types/         # TypeScript 類型定義
└── index.ts       # 主入口
migrations/        # 資料庫 migration 檔案
scripts/           # 維護腳本
├── reset-test-data.sql      # 測試資料重置腳本
└── clean-database.ts        # CLI 資料庫清理腳本
test/              # 測試檔案
├── e2e/          # E2E 測試
│   ├── helpers.ts              # 測試輔助函數
│   ├── test-flow.test.ts       # 配對完整流程測試
│   ├── concurrent-join.test.ts # 競態條件測試
│   ├── capacity-check.test.ts  # 容量驗證測試
│   ├── review-validation.test.ts # 審核驗證測試
│   └── review-permission.test.ts # 評分權限驗證測試
└── integration/ # 整合測試
```

## E2E 測試

### 後端 E2E 測試

本專案使用 TypeScript + vitest-pool-workers 構建後端 E2E 測試。

**運行測試**：

```bash
# 運行後端 E2E 測試
npm run test:e2e
```

詳細說明請參考：[test/e2e/README.md](./test/e2e/README.md)

### Frontend E2E 測試

使用 Playwright 進行前端 E2E 測試。

**運行測試**：

```bash
# 運行 Frontend E2E 測試
cd frontend/e2e && npm test
```

快速開始請參考：[frontend/e2e/QUICKSTART.md](./frontend/e2e/QUICKSTART.md)

## API 文檔

請參考 [API.md](./API.md)

## 測試資料管理

詳細的測試資料管理方案請參考：[TEST_DATA_MANAGEMENT.md](./docs/TEST_DATA_MANAGEMENT.md)

**快速命令**：

```bash
# 清理並重置本地資料庫
npm run db:reset

# 清理並重置遠程資料庫（需要確認）
npm run db:reset:remote
```

## 遷移進度

- ✅ 階段 1：基礎架構設置
- ✅ 階段 2：資料層遷移
- ✅ 階段 3：認證系統遷移
- ✅ 階段 4：API 路由實現
- ✅ 階段 5：測試與部署

## 授權

MIT

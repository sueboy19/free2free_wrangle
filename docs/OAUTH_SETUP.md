# OAuth 設定指南

本專案使用 [Arctic](https://arcticjs.dev) 函式庫統一管理 OAuth 登入，支援以下提供者：

- Facebook
- Instagram
- Google
- Line

## 環境變數

在 `.dev.vars`（本地開發）或 Cloudflare Secrets（生產環境）中設定：

```bash
# 現有提供者
FACEBOOK_KEY=your_facebook_app_id
FACEBOOK_SECRET=your_facebook_app_secret

INSTAGRAM_KEY=your_instagram_app_id
INSTAGRAM_SECRET=your_instagram_app_secret

# 新增提供者
GOOGLE_KEY=your_google_client_id
GOOGLE_SECRET=your_google_client_secret

LINE_KEY=your_line_channel_id
LINE_SECRET=your_line_channel_secret
```

## 設定步驟

### 1. Google OAuth

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立專案或選擇現有專案
3. 啟用 **Google+ API** 或 **People API**
4. 建立 OAuth 2.0 憑證
5. 設定授權的重新導向 URI：
   - 本地：`http://localhost:8787/auth/google/callback`
   - 生產：`https://your-domain.com/auth/google/callback`
6. 複製「用戶端 ID」和「用戶端密鑰」到環境變數

### 2. Line Login

1. 前往 [Line Developers Console](https://developers.line.biz/console/)
2. 建立新提供者或選擇現有提供者
3. 建立新的 Channel (LINE Login)
4. 設定 Callback URL：
   - 本地：`http://localhost:8787/auth/line/callback`
   - 生產：`https://your-domain.com/auth/line/callback`
5. 複製「Channel ID」和「Channel Secret」到環境變數

## 生產環境部署

使用 wrangler 設定 secrets：

```bash
# Google
wrangler secret put GOOGLE_KEY --env production
wrangler secret put GOOGLE_SECRET --env production

# Line
wrangler secret put LINE_KEY --env production
wrangler secret put LINE_SECRET --env production
```

## 資料庫 Migration

執行新的 migration 以支援 PKCE code verifier：

```bash
# 本地開發
wrangler d1 execute DB --local --file=./migrations/0004_add_oauth_code_verifier.sql

# 生產環境
wrangler d1 execute DB --env production --remote --file=./migrations/0004_add_oauth_code_verifier.sql
```

## 技術實作說明

### Arctic 整合

專案使用 Arctic 取代自訂 OAuth 實作：

- **Facebook** → 使用 Arctic `Facebook` 類別
- **Google** → 使用 Arctic `Google` 類別（需要 PKCE）
- **Line** → 使用 Arctic `Line` 類別（需要 PKCE）
- **Instagram** → 保留自訂實作（Arctic 不支援）

### PKCE 支援

Google 和 Line 使用 PKCE（Proof Key for Code Exchange）增強安全性：

1. 產生 `code_verifier`（隨機字串）
2. 連同 `state` 一併存入資料庫
3. 驗證時使用 `code_verifier` 交換 access token
4. 一次性使用後立即刪除

### 程式碼結構

```
src/lib/oauth.ts          # OAuth Provider 實作（使用 Arctic）
src/routes/auth.ts        # 認證路由
src/types/index.ts        # 類型定義
migrations/0004_add_oauth_code_verifier.sql  # 資料庫 migration
```

## 錯誤排除

### 「Invalid OAuth provider」錯誤

確認 provider 名稱正確：

- ✅ `facebook`, `instagram`, `google`, `line`
- ❌ `gmail`, `google-oauth`, `line-login`

### 「Missing OAuth credentials」錯誤

確認環境變數已正確設定：

```bash
# 本地
wrangler dev

# 生產
wrangler secret list --env production
```

### PKCE 相關錯誤

確認資料庫 migration 已執行，且 `oauth_states` 表有 `code_verifier` 欄位。

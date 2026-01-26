# OAuth 安全修復總結

## 🔒 修復的安全問題

### 1. CSRF 攻擊防護

- **問題**: state 參數只是編碼的 URL，沒有隨機性
- **修復**: 使用隨機 UUID 作為 state，存儲到 `oauth_states` 表，驗證後刪除（一次性使用）

### 2. 開放重定向防護

- **問題**: 後端接受前端指定的 `redirect_uri` 參數
- **修復**: 使用固定的 `FRONTEND_URL` 環境變量

---

## 📝 修改文件

### 新增文件

- `migrations/0003_add_oauth_states.sql` - oauth_states 表
- `src/lib/oauth-cleanup.ts` - 清理過期記錄工具
- `scripts/cleanup-oauth.js` - CLI 清理腳本

### 修改文件

- `src/routes/auth.ts` - 使用隨機 state + 固定 FRONTEND_URL
- `frontend/src/stores/auth.ts` - 移除 redirect_uri 參數
- `src/index.ts` - 移除 maintenance routes
- `package.json` - 新增清理腳本
- `wrangler.toml.example` - 新增 FRONTEND_URL
- `README.md` - 更新認證文檔

---

## 🚀 部署

### 手動執行

#### 本地開發

```bash
# 1. 檢查表是否存在，不存在才執行 migration
wrangler d1 execute DB --local --command="SELECT name FROM sqlite_master WHERE type='table' AND name='oauth_states';"

# 2. 執行 migration（如果表不存在）
wrangler d1 execute DB --local --file=./migrations/0003_add_oauth_states.sql

# 3. 啟動開發服務器（FRONTEND_URL 使用 wrangler.toml 中的默認值）
npm run dev
```

#### Staging

```bash
# 1. 檢查表是否存在
wrangler d1 execute DB --env staging --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='oauth_states';"

# 2. 執行 migration（如果表不存在）
wrangler d1 execute DB --env staging --remote --file=./migrations/0003_add_oauth_states.sql

# 3. 設定環境變量
echo "https://staging.free2free.com" | wrangler secret put FRONTEND_URL --env staging

# 4. 部署
wrangler deploy --env staging
```

#### Production

```bash
# 1. 檢查表是否存在
wrangler d1 execute DB --env production --remote --command="SELECT name FROM sqlite_master WHERE type='table' AND name='oauth_states';"

# 2. 執行 migration（如果表不存在）
wrangler d1 execute DB --env production --remote --file=./migrations/0003_add_oauth_states.sql

# 3. 設定環境變量
echo "https://free2free.com" | wrangler secret put FRONTEND_URL --env production

# 4. 部署後端
wrangler deploy --env production

# 5. 部署前端
cd frontend && npm run build && cd ..
wrangler pages deploy frontend/dist --project-name=free2free
```

---

## 🧹 清理過期記錄

定期清理過期的 OAuth 記錄（可選）：

```bash
# 本地開發
npm run cleanup:oauth:local

# Staging
npm run cleanup:oauth:staging

# Production
npm run cleanup:oauth:prod
```

---

## ✅ 驗證

### 功能測試

- [ ] Facebook 登入正常
- [ ] Instagram 登入正常
- [ ] 成功獲取 token 並跳轉

### 安全測試

- [ ] 修改 URL 中的 state，應該返回 "Invalid or expired state"
- [ ] 過期的 state 應該被拒絕
- [ ] 重複使用同一個 state 應該被拒絕

---

## 📚 詳細文檔

完整說明請參考 `README.md` 的「認證」部分。

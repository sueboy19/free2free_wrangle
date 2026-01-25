# 買一送一配對網站前端

這是一個基於 Vue 3 + TypeScript + Tailwind CSS 的響應式前端應用，為買一送一配對網站提供完整的用戶介面。

## 功能特色

### 🔐 用戶認證

- Facebook 登入（使用 redirect 方式，支援手機和桌面）
- Instagram 登入（使用 redirect 方式，支援手機和桌面）
- JWT Token 管理
- 自動會話恢復

**OAuth 登入流程說明**：

本專案使用 **redirect + 短期 code** 方式實作 OAuth 登入，確保在移動設備上也能正常運作：

1. 用戶點擊「Facebook/Instagram 登入」按鈕
2. 前端重定向到後端 `/auth/:provider`
3. 後端重定向到 OAuth provider（Facebook/Instagram）
4. 用戶在 OAuth provider 頁面完成授權
5. OAuth provider 回調後端 `/auth/:provider/callback`
6. 後端生成短期認證碼（5 分鐘過期）並重定向到前端 `/auth/callback#code=...`
7. 前端用 code 向後端換取實際的 JWT token
8. 設置 token 並跳轉首頁

**資料安全特性**：

- Token 不暴露在 URL 中（使用短期 code 替代）
- Code 僅 5 分鐘有效
- Code 為一次性使用，用完即刪除
- 同時支援手機和桌面瀏覽器

詳細 API 文檔請參考專案根目錄的 [README.md](../README.md#認證)。

### 🎯 配對功能

- 瀏覽可用的配對機會
- 創建新的配對活動
- 參與他人開局的配對
- 配對狀態管理

### 👥 用戶管理

- 個人資料管理
- 配對歷史記錄
- 開局與參與統計

### ⚙️ 管理後台

- 配對活動管理 (CRUD)
- 地點管理 (CRUD)
- 數據統計

### ⭐ 評分系統

- 配對完成後評分
- 評論功能
- 互動反饋

### 📱 響應式設計

- 支援手機端
- 平板電腦
- 桌面端

## 技術棧

- **Vue 3** - 現代化前端框架
- **TypeScript** - 類型安全
- **Vite** - 快速建置工具
- **Vue Router** - 路由管理
- **Pinia** - 狀態管理
- **Axios** - HTTP 客戶端
- **Tailwind CSS** - 實用優先的 CSS 框架
- **Vue Toastification** - 通知組件
- **Date-fns** - 日期處理

## 專案結構

```
frontend/
├── public/                 # 靜態資源
├── src/
│   ├── components/        # 可重用組件
│   ├── views/            # 頁面視圖
│   │   ├── Home.vue         # 首頁
│   │   ├── Login.vue        # 登入頁
│   │   ├── AuthCallback.vue # OAuth 回調處理（系統使用）
│   │   ├── Matches.vue      # 配對列表
│   │   ├── CreateMatch.vue  # 創建配對
│   │   ├── MyMatches.vue    # 我的配對
│   │   ├── MatchDetails.vue # 配對詳情
│   │   ├── Profile.vue      # 個人資料
│   │   └── Admin.vue        # 管理後台
│   ├── stores/           # Pinia 狀態管理
│   │   └── auth.ts          # 認證狀態
│   ├── services/         # API 服務
│   │   └── api.ts           # API 客戶端
│   ├── router/           # 路由配置
│   │   └── index.ts         # 路由定義
│   ├── style.css         # 全域樣式
│   ├── main.ts           # 應用入口
│   └── App.vue           # 根組件
├── index.html            # HTML 模板
├── package.json          # 專案依賴
├── tsconfig.json         # TypeScript 配置
├── tailwind.config.js    # Tailwind 配置
├── vite.config.ts        # Vite 配置
└── README.md             # 專案說明
```

## 安裝和運行

### 環境要求

- Node.js 16+
- npm 或 yarn

### 安裝依賴

```bash
cd frontend
npm install
```

### 環境配置

創建 `.env` 檔案：

```env
VITE_API_BASE_URL=http://localhost:8080
```

### 開發模式

```bash
npm run dev
```

應用將在 http://localhost:3000 運行

### 建置生產版本

```bash
npm run build
```

### 預覽生產版本

```bash
npm run preview
```

## 頁面路由

| 路徑              | 頁面       | 需要登入 | 需要管理員 | 說明                             |
| ----------------- | ---------- | -------- | ---------- | -------------------------------- |
| `/`               | 首頁       | ❌       | ❌         | 公開頁面                         |
| `/login`          | 登入頁     | ❌       | ❌         | 公開頁面                         |
| `/auth/callback`  | OAuth 回調 | ❌       | ❌         | **系統使用**：OAuth 認證回調處理 |
| `/matches`        | 配對列表   | ✅       | ❌         | 需登入                           |
| `/matches/create` | 創建配對   | ✅       | ❌         | 需登入                           |
| `/matches/:id`    | 配對詳情   | ✅       | ❌         | 需登入                           |
| `/my-matches`     | 我的配對   | ✅       | ❌         | 需登入                           |
| `/profile`        | 個人資料   | ✅       | ❌         | 需登入                           |
| `/admin`          | 管理後台   | ✅       | ✅         | 需登入 + 管理員                  |

**注意**：`/auth/callback` 是 OAuth 登入流程中由後端回調使用的系統路由，用戶不會直接訪問此頁面。

## API 整合

前端應用與後端 API 完整整合，詳細 API 文檔請參考專案根目錄的 [API.md](../API.md)。

## 響應式設計

應用採用移動優先的設計原則：

### 斷點

- `sm`: 640px+
- `md`: 768px+
- `lg`: 1024px+
- `xl`: 1280px+

### 特性

- 適配手機、平板、桌面
- 觸控友好的按鈕尺寸
- 簡化的手機端導航
- 優化的表單體驗

## 開發說明

### 狀態管理

使用 Pinia 進行狀態管理，主要包含：

- `useAuthStore` - 用戶認證狀態
  - `login()` - 開始 OAuth 登入（使用 redirect 方式）
  - `setSession()` - 設置會話（用於 OAuth callback）
  - `logout()` - 登出
  - `restoreSession()` - 恢復會話（從 localStorage）
- API 調用和錯誤處理
- 本地存儲管理

### 路由守衛

路由守衛會檢查是否需要登入或管理員權限。**重要**：為避免 OAuth callback 流程被干擾，以下路由被加入公開白名單：

```typescript
const publicRoutes = ['Home', 'Login', 'AuthCallback'];
```

### OAuth 登入實作

**AuthStore (`src/stores/auth.ts`)**

```typescript
// 開始 OAuth 登入 - 重定向方式
const login = async (provider: 'facebook' | 'instagram') => {
  const authUrl = `${baseUrl}/auth/${provider}?redirect_uri=${frontendCallbackUrl}`;
  window.location.href = authUrl;
};

// 設置會話 - 用於 OAuth callback
const setSession = (userData: User, accessToken: string) => {
  user.value = userData;
  token.value = accessToken;
  localStorage.setItem('auth_token', accessToken);
  localStorage.setItem('user', JSON.stringify(userData));
  setAuthHeader();
};
```

**Callback 處理 (`src/views/AuthCallback.vue`)**

```typescript
onMounted(async () => {
  // 從 URL hash 解析 code
  const code = new URLSearchParams(window.location.hash.slice(1)).get('code');

  // 用 code 換取 token
  const response = await apiClient.post('/auth/exchange-code', { code });
  const { access_token, refresh_token, user } = response.data;

  // 設置 session
  authStore.setSession(user, access_token);
  localStorage.setItem('refresh_token', refresh_token);

  // 跳轉首頁
  router.push('/');
});
```

### 樣式系統

- Tailwind CSS 實用類
- 自訂設計系統
- 響應式組件
- 深色模式支援 (可擴展)

### 類型安全

- TypeScript 嚴格模式
- 完整類型定義
- 編譯時檢查

## E2E 測試

前端 E2E 測試使用 Playwright 框架，可以在根目錄或 `frontend/e2e` 目錄執行。

### 重要說明

- ✅ **自動執行 db:reset**：e2e 腳本會自動重置測試資料庫，確保測試環境乾淨
- 🚫 **chromium 和 mobile 必須分開執行**：同時執行會導致測試超時（timeout）
- 📱 **兩套測試環境**：包含 chromium（桌面版）和 mobile（iPhone 13）兩種裝置的測試

### 從根目錄執行（推薦）

```bash
# 切換到根目錄
cd ..

# 運行桌面版測試（Chromium）
npm run e2e -- --project=chromium

# 運行移動版測試（Mobile）
npm run e2e -- --project=mobile
```

### 在 frontend/e2e 目錄執行

```bash
# 1. 從根目錄執行（會自動重置資料庫）
npm run e2e -- --project=chromium
npm run e2e -- --project=mobile

# 或者在 frontend/e2e 目錄執行（需要手動重置資料庫）
cd frontend/e2e
npm install  # 首次運行
npm test -- --project=chromium  # 桌面版
npm test -- --project=mobile    # 移動版
```

### 其他執行方式

```bash
# 有視窗執行（可看到瀏覽器操作）
npm run e2e:headed -- --project=chromium

# 調試模式（逐步執行）
npm run e2e:debug -- --project=chromium

# UI 模式（交互式選擇測試）
npm run e2e:ui

# 查看測試報告
npm run e2e:report

# 安裝 Playwright 瀏覽器
npm run e2e:install
```

**注意**：

- `npm run e2e`、`e2e:headed`、`e2e:debug` 都會自動執行 `db:reset`
- 可以通過 `--` 後的參數傳遞給 Playwright，例如 `--project=chromium` 或 `-g "測試名稱"`

### 詳細文檔

完整的快速開始指南請參考：[frontend/e2e/QUICKSTART.md](./e2e/QUICKSTART.md)

## 部署建議

### 生產環境

部署前需要配置生產環境變數：

1. **設定 `.env.production` 文件**（已創建）：

   ```env
   VITE_API_BASE_URL=https://api.your-domain.com
   VITE_ENABLE_MOCK_LOGIN=false
   ```

2. **構建生產版本**：

   ```bash
   cd frontend
   npm run build
   ```

   Vite 會自動使用 `.env.production` 的配置

3. **部署到 Cloudflare Pages**：
   ```bash
   cd ..
   wrangler pages deploy frontend/dist --project-name=free2free
   ```

### 重要說明

- ⚠️ **VITE_ENABLE_MOCK_LOGIN** 在生產環境必須設為 `false`
- ⚠️ **VITE_API_BASE_URL** 必�改為生產 API 域名
- 📝 `.env.production` 文件已在 `.gitignore` 中，請確保生產配置不提交到代碼庫

### 部署檢查清單

在部署前請確認：

- [ ] 更新 `.env.production` 中的 `VITE_API_BASE_URL` 為生產 API 域名
- [ ] 確認 `VITE_ENABLE_MOCK_LOGIN=false`
- [ ] 本地測試構建：`npm run build && npm run preview`
- [ ] 檢查構建產物：`ls -la dist/`

### 其他優化

1. 啟用 HTTPS
2. 設定 CORS 政策
3. 啟用 Gzip 壓縮
4. 設定 CDN

### Docker 部署

```dockerfile
FROM node:16-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 故障排除

### 常見問題

1. **模組找不到錯誤**: 確保所有依賴已安裝
2. **API 調用失敗**: 檢查後端服務和 CORS 設定
3. **樣式問題**: 確保 Tailwind CSS 正確配置
4. **路由問題**: 檢查 Vue Router 配置

### 調試技巧

- 使用 Vue DevTools
- 檢查瀏覽器控制台
- 查看網路請求
- 驗證環境變數

## 貢獻指南

1. Fork 專案
2. 創建功能分支
3. 提交變更
4. 發起 Pull Request

## 授權

MIT License

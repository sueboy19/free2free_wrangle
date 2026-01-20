# 前端 E2E 測試說明

這是一套完整的 Playwright E2E 測試套件，用於自動化測試「買一送一配對網站」的前端功能。

## 📋 測試清單

### 已實現的測試場景

#### 1. 用戶認證測試

- ✅ 用戶A（開局者）可以登入
- ✅ 用戶B（參與者）可以登入
- ✅ 用戶登出功能正常

#### 2. 基本功能導航測試

- ✅ 可以訪問配對列表頁面
- ✅ 可以訪問我的配對頁面
- ✅ 可以訪問個人資料頁面
- ✅ 可以從首頁導航到各頁面

#### 3. 配對建立測試

- ✅ 用戶A 可以創建配對
- ✅ 創建配對後可以在我的配對頁面看到
- ✅ 創建時必填字段驗證

#### 4. 配對參與測試

- ✅ 用戶B 可以申請加入配對
- ✅ 加入配對後狀態顯示為待審核
- ✅ 用戶A 可以查看待審核的參與者

#### 5. 雙向配對流程測試

- ✅ 完整流程：用戶A創建 → 用戶B加入 → 用戶A審核
- ✅ 反向流程：用戶B創建 → 用戶A加入 → 用戶B審核

#### 6. 我的配對頁面功能測試

- ✅ 切換標籤查看不同類型的配對
- ✅ 顯示統計數據

#### 7. 個人資料頁面測試

- ✅ 顯示用戶基本信息
- ✅ 顯示最近活動列表

#### 8. 錯誤處理測試

- ✅ 未登入無法訪問需要認證的頁面
- ✅ 無效的配對 ID 顯示錯誤頁面

#### 9. 響應式設計測試

- ✅ 桌面版瀏覽器正常顯示

#### 10. 表單驗證測試

- ✅ 創建配對時必填字段驗證

## 🚀 安裝與設置

### 1. 安裝依賴

```bash
cd frontend/e2e
npm install
```

或者使用你喜歡的包管理器：

```bash
cd frontend/e2e
pnpm install
# 或
yarn install
```

### 2. 確認測試環境

確保以下服務正在運行：

- **前端服務**: http://localhost:3000
- **後端服務**: http://localhost:8787

如果服務未運行，請先啟動：

```bash
# 在項目根目錄啟動前端
cd frontend
npm run dev

# 啟動後端
cd ..
wrangler dev
```

### 3. 自定義環境變數（可選）

```bash
# 設置不同的基礎 URL
export BASE_URL=http://localhost:3000

# CI 環境自動設置
```

## ▶️ 執行測試

### 基本命令

```bash
# 在終端執行測試（無頭模式）
npm test

# 在有頭模式執行測試（可以看到瀏覽器）
npm run test:headed

# 調試模式（帶調試工具）
npm run test:debug

# 使用 Playwright UI 界面
npm run test:ui
```

### 查看測試報告

```bash
# 在瀏覽器中打開 HTML 報告
npm run test:report
```

### 安裝瀏覽器（首次運行時需要）

```bash
npm run test:install
```

## 📊 測試結果

測試執行後，你可以在以下位置查看結果：

- **HTML 報告**: `playwright-report/`
  - 在瀏覽器中打開 `index.html` 查看詳細報告
  - 包含每個測試的截圖和錄屏

- **JSON 報告**: `test-results.json`
  - 用於 CI/CD 整合

- **截圖**: `test-results/`
  - 僅在測試失敗時截圖

## 🧪 測試架構

```
frontend/e2e/
├── playwright.config.ts    # Playwright 配置
├── package.json           # 測試依賴配置
├── helpers.ts             # 測試輔助函數
├── app.spec.ts            # 主測試文件
└── README.md             # 本文件
```

### 測試輔助函數

所有可重用的測試邏輯都放在 `helpers.ts` 中：

- `mockLogin()` - Mock 登入
- `logout()` - 登出
- `createMatch()` - 創建配對
- `joinMatch()` - 加入配對
- `getMatchStatus()` - 獲取配對狀態
- `navigateToMyMatches()` - 導航到我的配對
- `getMyMatchesCount()` - 獲取配對數量
- `navigateToProfile()` - 導航到個人資料
- `expectPageTitle()` - 驗證頁面標題
- `closeToast()` - 關閉提示

## 📱 多瀏覽器測試

測試配置了多個測試環境：

### 1. Chromium（桌面版）

- 默認測試環境
- 模擬 Chrome 桌面瀏覽器

### 2. Mobile（移動版）

- 模擬 iPhone 13
- 測試響應式設計

運行特定環境：

```bash
# 測試桌面版
npx playwright test --project=chromium

# 測試移動版
npx playwright test --project=mobile
```

## 🔄 CI/CD 整合

### GitHub Actions 示例

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: cd frontend/e2e && npm install
      - name: Install Playwright Browsers
        run: cd frontend/e2e && npx playwright install --with-deps
      - name: Run E2E tests
        run: cd frontend/e2e && npm test
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/e2e/playwright-report/
```

## 🐛 調試技巧

### 1. 調試模式

```bash
npm run test:debug
```

這會打開瀏覽器開發者工具，並在每個步驟暫停。

### 2. 只運行特定測試

```bash
# 運行單個測試
npx playwright test -g "用戶A (開局者) 可以登入"

# 運行特定測試組
npx playwright test -g "用戶認證測試"
```

### 3. 運行並查看

```bash
npx playwright test --ui
```

這會打開 Playwright UI 界面，可以交互式地運行測試。

## 📈 測試覆蓋率

當前測試覆蓋的主要功能：

- ✅ 用戶認證流程
- ✅ 基本導航
- ✅ 配對建立
- ✅ 配對參與
- ✅ 雙向配對流程
- ✅ 我的配對管理
- ✅ 個人資料
- ✅ 錯誤處理
- ✅ 響應式設計

**待擴展的測試**：

- ⏳ 評分系統
- ⏳ 配對取消功能
- ⏳ 配對完成流程
- ⏳ 個人資料編輯
- ⏳ 通知功能
- ⏳ 管理後台功能

## 📝 添加新測試

### 步驟 1: 添加測試到 `app.spec.ts`

```typescript
test.describe('新功能測試', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page, 'organizer');
    await closeToast(page);
  });

  test('測試新功能', async ({ page }) => {
    // 測試邏輯
    expect(condition).toBe(true);
  });
});
```

### 步驟 2: 在 `helpers.ts` 中添加輔助函數（如果需要）

```typescript
export async function newHelperFunction(page: Page) {
  // 實現輔助邏輯
}
```

### 步驟 3: 執行測試

```bash
npm test
```

## ⚠️ 注意事項

1. **測試隔離性**
   - 每個測試前都會清理 Toast 提示
   - 每個測試都從登錄狀態開始（如果需要）

2. **時間設置**
   - 預設超時：30 秒
   - Expect 超時：10 秒
   - 如果測試超時，可能需要增加超時時間

3. **Mock 登入**
   - 使用預設的 Mock 登入按鈕
   - 避免依賴外部 OAuth 服務

4. **並發限制**
   - 預設並行執行：2 個工作進程
   - CI 環境設置為 1 個（避免資源競爭）

## 🤝 貢獻指南

1. 保持測試簡單且獨立
2. 每個測試只測試一個功能點
3. 使用有意義的測試名稱
4. 添加適當的註釋說明測試目的
5. 重複使用的邏輯提取到 `helpers.ts`

## 🔗 相關資源

- [Playwright 官方文檔](https://playwright.dev/docs/intro)
- [專案 README](../../README.md)
- [前端 README](../../frontend/README.md)

## 📞 常見問題

### Q: 測試失敗提示「Cannot find module」

A: 需要安裝依賴：

```bash
cd frontend/e2e
npm install
```

### Q: 瀏覽器未安裝

A: 運行安裝命令：

```bash
npm run test:install
```

### Q: 測試超時

A: 可能是服務未啟動或網絡問題，檢查：

- 前端服務是否運行在 http://localhost:3000
- 後端服務是否運行在 http://localhost:8787
- 是否有網絡錯誤

### Q: 如何測試其他語言版本？

A: 在 `helpers.ts` 中修改文本匹配的選擇器，或使用多語言測試。

## 📞 聯繫方式

如有問題或建議，請通過以下方式聯繫：

- GitHub Issues
- 專案 Wiki
- 技術文檔

---

**測試套件版本**: 1.0.0
**最後更新**: 2026-01-20
**維護者**: Sisyphus

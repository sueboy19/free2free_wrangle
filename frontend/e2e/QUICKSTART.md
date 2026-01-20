# 快速開始指南

## 一鍵運行 E2E 測試

### 前置條件

確保以下服務正在運行：

```bash
# 終端 1: 啟動前端服務
cd frontend
npm run dev

# 終端 2: 啟動後端服務
cd ..
wrangler dev
```

### 安裝並運行測試

```bash
# 終端 3: 安裝測試依賴
cd frontend/e2e
npm install

# 執行所有測試
npm test
```

## 測試流程說明

### 測試場景概述

這套 E2E 測試模擬了兩個用戶的完整交互流程：

1. **用戶A（開局者）** - Mock 登入「開局者 (測試用戶 A)」
2. **用戶B（參與者）** - Mock 登入「參與者 (測試用戶 B)」

### 核心測試流程

#### 流程 1: 雙向配對（用戶A 開局）

```
用戶A 登入
  ↓
用戶A 創建配對（羽毛球雙打）
  ↓
用戶A 登出
  ↓
用戶B 登入
  ↓
用戶B 加入配對
  ↓
用戶B 登出
  ↓
用戶A 登入
  ↓
用戶A 查看待審核的參與者列表
```

#### 流程 2: 雙向配對（用戶B 開局）

```
用戶B 登入
  ↓
用戶B 創建配對（跑步團）
  ↓
用戶B 登出
  ↓
用戶A 登入
  ↓
用戶A 加入配對
  ↓
用戶A 登出
  ↓
用戶B 登入
  ↓
用戶B 查看待審核的參與者列表
```

### 執行特定測試

```bash
# 只運行認證測試
npx playwright test -g "用戶認證測試"

# 只運行配對建立測試
npx playwright test -g "配對建立測試"

# 只運行雙向流程測試
npx playwright test -g "雙向配對流程測試"

# 只運行單個測試
npx playwright test -g "用戶A (開局者) 可以登入"
```

## 常用命令

### 調試命令

```bash
# 有頭模式運行（可以看到瀏覽器）
npm run test:headed

# 調試模式
npm run test:debug

# UI 模式（交互式執行）
npm run test:ui
```

### 報告查看

```bash
# 在瀏覽器中打開 HTML 報告
npm run test:report
```

## 預期結果

### 成功的測試

所有測試通過後，你會看到：

```
Running 43 tests using 2 workers

  ✓ 用戶認證測試 (3)
  ✓ 基本功能導航測試 (4)
  ✓ 配對建立測試 (2)
  ✓ 配對參與測試 (3)
  ✓ 雙向配對流程測試 (2)
  ✓ 我的配對頁面功能測試 (2)
  ✓ 個人資料頁面測試 (2)
  ✓ 錯誤處理測試 (2)
  ✓ 響應式設計測試 (1)
  ✓ 表單驗證測試 (1)

  43 passed (23s)
```

### 查看報告

```bash
# 打開 HTML 報告
cd frontend/e2e
start playwright-report/index.html
```

報告中會包含：

- 每個測試的詳細步驟
- 截圖（失敗時）
- 執行時間
- 測試統計

## 故障排除

### 問題：測試安裝失敗

```bash
# 清理並重新安裝
cd frontend/e2e
rm -rf node_modules
rm package-lock.json
npm install
```

### 問題：找不到測試服務

```bash
# 檢查服務是否運行
netstat -ano | findstr ":3000 :8787"

# 啟動服務（如果未運行）
cd frontend && npm run dev
cd .. && wrangler dev
```

### 問題：測試超時

```bash
# 使用更長的超時時間
npx playwright test --timeout=60000
```

### 問題：Mock 登入失敗

檢查前端是否正確顯示 Mock 登入按鈕：

1. 訪問 http://localhost:3000/login
2. 確認看到「Mock 登入 開局者 (測試用戶 A)」按鈕
3. 確認看到「Mock 登入 參與者 (測試用戶 B)」按鈕

## 下一步

- 查看完整的 `README.md` 了解詳細功能
- 瀏覽 `app.spec.ts` 了解測試實現
- 根據需要添加新的測試場景
- 集成到 CI/CD 流程

---

**快速開始** → 執行 `npm test` 即可開始測試

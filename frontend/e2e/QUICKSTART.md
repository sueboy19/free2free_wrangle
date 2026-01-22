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

### 重要說明

- ✅ **自動執行 db:reset**：e2e 腳本會自動重置測試資料庫，確保測試環境乾淨
- 🚫 **chromium 和 mobile 必須分開執行**：同時執行會導致測試超時（timeout）

### 從根目錄一鍵執行（推薦）

```bash
# 終端 3: 運行桌面版測試（Chromium）
npm run e2e -- --project=chromium

# 運行移動版測試（Mobile）
npm run e2e -- --project=mobile
```

### 在 frontend/e2e 目錄執行

```bash
# 終端 3: 切換到測試目錄
cd frontend/e2e

# 安裝測試依賴（首次運行）
npm install

# 運行特定測試環境
npm test -- --project=chromium  # 桌面版
npm test -- --project=mobile    # 移動版
```

**注意**：在 frontend/e2e 目錄執行時，需要手動從根目錄執行 `npm run db:reset` 來重置資料庫。

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
# 只運行認證測試（桌面版）
npm test -- --project=chromium -g "用戶認證測試"

# 只運行配對建立測試（桌面版）
npm test -- --project=chromium -g "配對建立測試"

# 只運行雙向流程測試（桌面版）
npm test -- --project=chromium -g "雙向配對流程測試"

# 只運行單個測試（桌面版）
npm test -- --project=chromium -g "用戶A (開局者) 可以登入"
```

## 常用命令

### 調試命令

```bash
# 有頭模式運行（可以看到瀏覽器）- 桌面版
npm run test:headed -- --project=chromium

# 調試模式 - 桌面版
npm run test:debug -- --project=chromium

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

每個環境測試通過後，你會看到：

**執行流程**：

```
🔄 重置測試数据库...
✅ 数据库重置完成

🚀 运行 E2E 测试...
执行命令: npm run test --prefix frontend/e2e -- --project=chromium

Running tests using 1 worker

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

  22 passed (XXs)

✅ E2E 測試完成！
```

**注意**：

- chromium 和 mobile 需要分開執行，避免超時
- `npm run e2e` 會自動執行 `db:reset`，無需手動執行

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

**確保 chromium 和 mobile 分開執行**：

```bash
# ❌ 錯誤：同時執行會超時
npm test

# ✅ 正確：分開執行
npm run e2e -- --project=chromium
npm run e2e -- --project=mobile
```

**使用更長的超時時間**：

```bash
npm run e2e -- --project=chromium --timeout=60000
```

### 問題：資料庫重置失敗

檢查是否有其他程序正在使用資料庫，或手動執行：

```bash
npm run db:reset
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

**確保 chromium 和 mobile 分開執行**：

```bash
# ❌ 錯誤：同時執行會超時
npm test

# ✅ 正確：分開執行
npm test -- --project=chromium
npm test -- --project=mobile
```

**使用更長的超時時間**：

```bash
npm test -- --project=chromium --timeout=60000
```

### 問題：測試失敗（資料庫衝突）

**確保每次執行前都重置資料庫**：

```bash
# 從根目錄執行
npm run db:reset

# 然後運行測試
npm run e2e -- --project=chromium
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

**快速開始** → 從根目錄執行 `npm run e2e -- --project=chromium` 即可開始測試（會自動重置資料庫）

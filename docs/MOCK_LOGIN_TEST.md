# Mock 登入測試說明

## 概述

本專案提供 mock 登入功能，讓開發者可以輕鬆創建多個測試帳號來測試配對流程。

## 前端登入介面 (推薦使用)

### 快速開始

1. **啟動前端開發伺服器**

   ```bash
   cd frontend
   npm run dev
   ```

   前端將運行在 http://localhost:3000

2. **訪問登入頁面**
   打開瀏覽器訪問 http://localhost:3000/login

3. **使用 Mock 登入按鈕**
   - 🔵 **Mock 登入 (開局者)** - 測試用戶 A
   - 🟢 **Mock 登入 (參與者)** - 測試用戶 B

4. **測試流程**
   - 使用用戶 A 登入 → 創建配對
   - 使用用戶 B 登入 → 申請加入配對
   - 使用用戶 A 登入 → 審核用戶 B

### 測試帳號信息

| 帳號   | 顏色    | 角色   | ID          | Email                   | 用途                 |
| ------ | ------- | ------ | ----------- | ----------------------- | -------------------- |
| 用戶 A | 🔵 藍色 | 開局者 | test_user_1 | test_user_1@example.com | 創建配對、審核參與者 |
| 用戶 B | 🟢 綠色 | 參與者 | test_user_2 | test_user_2@example.com | 申請加入配對         |

### 測試場景示例

**場景 1: 完整配對流程**

1. 使用用戶 A 登入
2. 創建一個配對活動
3. 記住配對 ID
4. 登出用戶 A
5. 使用用戶 B 登入
6. 申請加入配對
7. 登出用戶 B
8. 使用用戶 A 登入
9. 審核通過用戶 B

**場景 2: 測試同時參與**

1. 使用用戶 A 創建配對
2. 使用用戶 B 申請加入
3. 登出用戶 B
4. 使用用戶 C（重複 mock 登入並輸入新 ID）申請加入
5. 用戶 A 查看所有申請者並審核

## Mock 登入 API

### 端點

```
POST /auth/mock
```

### 請求 Body

```json
{
  "id": "test_user_1",
  "name": "測試用戶 1",
  "email": "user1@example.com"
}
```

### 響應

```json
{
  "user": {
    "id": 1,
    "social_id": "test_user_1",
    "social_provider": "facebook",
    "name": "測試用戶 1",
    "email": "user1@example.com",
    "avatar_url": null,
    "is_admin": false,
    "created_at": 1234567890000,
    "updated_at": 1234567890000
  },
  "tokens": {
    "access": "eyJhbGciOiJIUzI1NiIs...",
    "refresh": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 注意事項

- `id` 是唯一標識符，相同的 `id` 會返回同一個用戶
- 不同的 `id` 會創建新用戶
- `name` 和 `email` 僅用於顯示，可以隨意修改
  POST /auth/mock

````

### 請求 Body

```json
{
  "id": "test_user_1",
  "name": "測試用戶 1",
  "email": "user1@example.com"
}
````

### 響應

```json
{
  "user": {
    "id": 1,
    "social_id": "test_user_1",
    "social_provider": "facebook",
    "name": "測試用戶 1",
    "email": "user1@example.com",
    "avatar_url": null,
    "is_admin": false,
    "created_at": 1234567890000,
    "updated_at": 1234567890000
  },
  "tokens": {
    "access": "eyJhbGciOiJIUzI1NiIs...",
    "refresh": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

## 程式化使用（進階）

### 使用 curl

**登入用戶 A（開局者）：**

```bash
curl -X POST http://127.0.0.1:8787/auth/mock \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_user_1",
    "name": "測試用戶 A (開局者)",
    "email": "test_user_1@example.com"
  }'
```

**登入用戶 B（參與者）：**

```bash
curl -X POST http://127.0.0.1:8787/auth/mock \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_user_2",
    "name": "測試用戶 B (參與者)",
    "email": "test_user_2@example.com"
  }'
```

### 使用 JavaScript (瀏覽器/Node.js)

```javascript
// 登入用戶 A
const userAResponse = await fetch('http://127.0.0.1:8787/auth/mock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'user_organizer',
    name: '開局者',
    email: 'organizer@test.com',
  }),
});
const userA = await userAResponse.json();

// 登入用戶 B
const userBResponse = await fetch('http://127.0.0.1:8787/auth/mock', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'user_participant',
    name: '參與者',
    email: 'participant@test.com',
  }),
});
const userB = await userBResponse.json();

// 使用 token 發送請求
await fetch('http://127.0.0.1:8787/matches/1/join', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${userB.tokens.access}`,
  },
});
```

## 測試配對流程

### 完整測試腳本

專案提供了完整的測試腳本 `scripts/test-match-flow.ts`，可以測試完整的配對流程：

1. 用戶 A 登入（開局者）
2. 用戶 B 登入（參與者）
3. 用戶 A 創建配對
4. 用戶 B 申請加入配對
5. 用戶 A 審核通過用戶 B
6. 用戶 A 關閉配對

**執行測試腳本：**

```bash
# 安裝依賴（如果還沒安裝）
npm install --save-dev ts-node dotenv

# 執行測試
npx ts-node scripts/test-match-flow.ts
```

### 手動測試步驟

#### 1. 準備測試數據

首先確保資料庫中有測試數據：

```bash
wrangler d1 execute free2free-db --local --file=./scripts/import-to-d1.sql
```

#### 2. 登入用戶 A（開局者）

```bash
curl -X POST http://127.0.0.1:8787/auth/mock \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user_organizer",
    "name": "開局者",
    "email": "organizer@test.com"
  }' \
  | jq -r '.tokens.access' > /tmp/token_a.txt
```

#### 3. 用戶 A 創建配對

```bash
TOKEN_A=$(cat /tmp/token_a.txt)

curl -X POST http://127.0.0.1:8787/matches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{
    "activity_id": 1,
    "match_time": "2025-01-25T10:00:00Z"
  }' \
  | jq '.data.id' > /tmp/match_id.txt
```

#### 4. 登入用戶 B（參與者）

```bash
curl -X POST http://127.0.0.1:8787/auth/mock \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user_participant",
    "name": "參與者",
    "email": "participant@test.com"
  }' \
  | jq -r '.tokens.access' > /tmp/token_b.txt
```

#### 5. 用戶 B 申請加入配對

```bash
TOKEN_B=$(cat /tmp/token_b.txt)
MATCH_ID=$(cat /tmp/match_id.txt)

curl -X POST http://127.0.0.1:8787/matches/$MATCH_ID/join \
  -H "Authorization: Bearer $TOKEN_B" \
  | jq
```

#### 6. 用戶 A 審核通過用戶 B

```bash
# 先獲取參與者 ID
curl -X GET "http://127.0.0.1:8787/matches/$MATCH_ID/participants" \
  -H "Authorization: Bearer $TOKEN_A" \
  | jq '.data[0].id' > /tmp/participant_id.txt

PARTICIPANT_ID=$(cat /tmp/participant_id.txt)

# 審核通過
curl -X PUT "http://127.0.0.1:8787/matches/$MATCH_ID/participants/$PARTICIPANT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"status": "approved"}' \
  | jq
```

#### 7. 用戶 A 關閉配對

```bash
curl -X PUT "http://127.0.0.1:8787/matches/$MATCH_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"status": "completed"}' \
  | jq
```

## 注意事項

1. **Mock 登入僅適用於非生產環境**
   - 生產環境 (`ENVIRONMENT=production`) 禁用 mock 登入
   - 本地開發和 staging 環境可以使用

2. **Token 有效期**
   - Access Token: 15 分鐘
   - Refresh Token: 7 天
   - 測試時如果 token 過期，重新 mock 登入即可

3. **唯一性**
   - `id` 字段用於識別用戶（相當於 social_id）
   - 相同的 `id` 會返回已存在的用戶
   - 不同的 `id` 會創建新用戶

4. **測試數據清理**
   - 如需重新開始測試，清理資料庫：
     ```bash
     wrangler d1 execute free2free-db --local --file=./scripts/import-to-d1.sql
     ```

## 常見問題

### Q: 如何獲取 Activity ID？

A: 執行測試數據導入後，查詢資料庫：

```bash
wrangler d1 execute free2free-db --local --command="SELECT * FROM activities;"
```

### Q: Token 過期怎麼辦？

A: 重新執行 mock 登入獲取新 token

### Q: 如何測試多人參與？

A: 創建多個 mock 用戶（不同 id），讓它們都申請加入同一個配對

### Q: 如何測試開局者不能參與自己的配對？

A: 用創建配對的用戶 token 嘗試加入自己的配對，應該會收到錯誤提示

### Q: 如何測試配對狀態限制？

A: 用戶 A 關閉配對後，用戶 B 嘗試申請加入，應該會收到錯誤提示

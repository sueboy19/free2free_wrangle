/**
 * 測試 mock 登入兩個帳號
 *
 * 用途：
 * 1. 登入帳號 A（開局者）→ 創建配對
 * 2. 登入帳號 B（參與者）→ 申請加入配對
 * 3. 帳號 A 審核帳號 B
 */

import 'dotenv/config';

const BASE_URL = 'http://127.0.0.1:8787';

// 測試用戶定義
const TEST_USERS = {
  user1: {
    id: 'test_user_1',
    name: '測試用戶 A (開局者)',
    email: 'test_user_1@example.com',
  },
  user2: {
    id: 'test_user_2',
    name: '測試用戶 B (參與者)',
    email: 'test_user_2@example.com',
  },
};

/**
 * Mock 登入
 */
async function mockLogin(user) {
  const response = await fetch(`${BASE_URL}/auth/mock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Mock login failed: ${data.message || 'Unknown error'}`);
  }

  return data;
}

/**
 * 創建配對
 */
async function createMatch(token, matchData) {
  const response = await fetch(`${BASE_URL}/matches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(matchData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Create match failed: ${data.message || 'Unknown error'}`);
  }

  return data.data;
}

/**
 * 申請加入配對
 */
async function joinMatch(token, matchId) {
  const response = await fetch(`${BASE_URL}/matches/${matchId}/join`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Join match failed: ${data.message || 'Unknown error'}`);
  }

  return data.data;
}

/**
 * 審核參與者
 */
async function reviewParticipant(token, matchId, participantId, status) {
  const response = await fetch(`${BASE_URL}/matches/${matchId}/participants/${participantId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Review participant failed: ${data.message || 'Unknown error'}`);
  }

  return data.data;
}

/**
 * 關閉配對
 */
async function closeMatch(token, matchId, status) {
  const response = await fetch(`${BASE_URL}/matches/${matchId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Close match failed: ${data.message || 'Unknown error'}`);
  }

  return data.data;
}

/**
 * 主測試流程
 */
async function runTest() {
  console.log('='.repeat(50));
  console.log('開始測試配對流程');
  console.log('='.repeat(50));

  try {
    // 1. 用戶 A 登入（開局者）
    console.log('\n[1] 用戶 A (開局者) 登入中...');
    const user1Login = await mockLogin(TEST_USERS.user1);
    const user1Token = user1Login.tokens.access;
    console.log(`✓ 用戶 A 登入成功: ${user1Login.user.name} (ID: ${user1Login.user.id})`);

    // 2. 用戶 B 登入（參與者）
    console.log('\n[2] 用戶 B (參與者) 登入中...');
    const user2Login = await mockLogin(TEST_USERS.user2);
    const user2Token = user2Login.tokens.access;
    console.log(`✓ 用戶 B 登入成功: ${user2Login.user.name} (ID: ${user2Login.user.id})`);

    // 3. 用戶 A 創建配對
    console.log('\n[3] 用戶 A 創建配對...');
    const match = await createMatch(user1Token, {
      activity_id: 1, // 假設存在 activity_id=1
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    console.log(`✓ 配對創建成功 (ID: ${match.id})`);

    // 4. 用戶 B 申請加入配對
    console.log('\n[4] 用戶 B 申請加入配對...');
    const participant = await joinMatch(user2Token, match.id);
    console.log(`✓ 申請成功 (參與者 ID: ${participant.id}, 狀態: ${participant.status})`);

    // 5. 用戶 A 審核通過用戶 B
    console.log('\n[5] 用戶 A 審核通過用戶 B...');
    const updatedParticipant = await reviewParticipant(
      user1Token,
      match.id,
      participant.id,
      'approved'
    );
    console.log(
      `✓ 審核成功 (參與者 ID: ${updatedParticipant.id}, 狀態: ${updatedParticipant.status})`
    );

    // 6. 用戶 A 關閉配對
    console.log('\n[6] 用戶 A 關閉配對...');
    const closedMatch = await closeMatch(user1Token, match.id, 'completed');
    console.log(`✓ 配對已關閉 (狀態: ${closedMatch.status})`);

    console.log('\n' + '='.repeat(50));
    console.log('✓ 所有測試通過！');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// 執行測試
runTest();

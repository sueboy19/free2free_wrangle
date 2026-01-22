/**
 * E2E 測試輔助函數 - 使用 fetch 直接調用 API
 *
 * 提供可重用的測試工具，包括：
 * - Mock 登入
 * - 直接用 fetch 調用 API 端點
 */

import type { Env } from '../../src/types';

/**
 * 測試用戶定義
 *
 * ⚠️ 重要：這些 social_id 必須與 reset-test-data.sql 中的用戶一致
 *
 * - test_user_1: 測試用戶 A (開局者)
 * - test_user_2: 測試用戶 B (參與者)
 * - test_user_3: 測試用戶 C (額外參與者)
 */
export const TEST_USERS = {
  organizer: {
    id: 'test_user_1',
    name: '測試用戶 A (開局者)',
    email: 'test_user_1@example.com',
  },
  participant1: {
    id: 'test_user_2',
    name: '測試用戶 B (參與者)',
    email: 'test_user_2@example.com',
  },
  participant2: {
    id: 'test_user_3',
    name: '測試用戶 C',
    email: 'test_user_3@example.com',
  },
  participant3: {
    id: 'test_user_4',
    name: '測試用戶 D',
    email: 'test_user_4@example.com',
  },
  nonParticipant: {
    id: 'test_non_participant_1',
    name: '測試非參與者',
    email: 'test_non_participant_1@example.com',
  },
};

const BASE_URL = 'http://localhost:8787';

/**
 * 從 token 中解析 user_id
 */
function getUserIdFromToken(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.user_id;
  } catch {
    return null;
  }
}

/**
 * Mock 登入獲取 token
 */
export async function mockLogin(user: typeof TEST_USERS.organizer) {
  const response = await fetch(`${BASE_URL}/auth/mock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Mock login failed: ${data.message || 'Unknown error'}`);
  }

  return {
    user: data.user,
    accessToken: data.tokens.access,
    refreshToken: data.tokens.refresh,
  };
}

/**
 * 創建配對
 */
export async function createMatch(
  token: string,
  matchData: { activity_id: number; match_time: string }
) {
  console.log('[createMatch] Calling API...', { activity_id: matchData.activity_id });
  const response = await fetch(`${BASE_URL}/matches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(matchData),
  });
  console.log('[createMatch] Response status:', response.status);
  console.log('[createMatch] Response headers:', Object.fromEntries(response.headers.entries()));

  // Read response as text first, then try to parse as JSON
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.log('[createMatch] JSON parse error:', text.slice(0, 200));
    return {
      ok: false,
      status: response.status,
      data: null,
      error: `JSON parse error: ${text.slice(0, 100)}`,
    };
  }

  // Check for error in response
  if (data.error) {
    return {
      ok: false,
      status: response.status,
      data: null,
      error: data.error,
    };
  }

  console.log('[createMatch] Success:', data.data);
  return data.data;
}

/**
 * 申請加入配對
 */
export async function joinMatch(token: string, matchId: number) {
  const response = await fetch(`${BASE_URL}/matches/${matchId}/join`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Read response as text first, then try to parse as JSON
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.log('[joinMatch] JSON parse error:', text.slice(0, 200));
    return {
      ok: false,
      status: response.status,
      data: null,
      error: `JSON parse error: ${text.slice(0, 100)}`,
    };
  }

  // Check for error in response
  if (data.error) {
    console.log('[joinMatch] Error response:', { matchId, error: data.error, response: data });
    return {
      ok: false,
      status: response.status,
      data: null,
      error: data.error,
    };
  }

  return {
    ok: true,
    status: response.status,
    data: data.data,
    error: undefined,
  };
}

/**
 * 並發參與配對（用於競態條件測試）
 */
export async function concurrentJoin(
  token: string,
  matchId: number,
  count: number
): Promise<Array<{ ok: boolean; status: number; data?: any; error?: string }>> {
  const promises = Array(count)
    .fill(null)
    .map(() => joinMatch(token, matchId));

  return Promise.all(promises);
}

/**
 * 審核參與者
 */
export async function reviewParticipant(
  token: string,
  matchId: number,
  participantId: number,
  status: 'approved' | 'rejected'
) {
  const response = await fetch(`${BASE_URL}/matches/${matchId}/participants/${participantId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  // Read response as text first, then try to parse as JSON
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.log('[reviewParticipant] JSON parse error:', text.slice(0, 200));
    return {
      ok: false,
      status: response.status,
      data: null,
      error: `JSON parse error: ${text.slice(0, 100)}`,
    };
  }

  // Check for error in response
  if (data.error) {
    console.log('[reviewParticipant] Error:', {
      matchId,
      participantId,
      status,
      error: data.error,
      response: data,
      tokenUserId: getUserIdFromToken(token),
    });
    return {
      ok: false,
      status: response.status,
      data: null,
      error: data.error,
    };
  }

  return {
    ok: true,
    status: response.status,
    data: data.data,
    error: undefined,
  };
}

/**
 * 關閉配對
 */
export async function closeMatch(
  token: string,
  matchId: number,
  status: 'completed' | 'cancelled'
) {
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
 * 創建評分
 */
export async function createReview(
  token: string,
  reviewData: { match_id: number; reviewee_id: number; score: number; comment?: string }
) {
  const response = await fetch(`${BASE_URL}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(reviewData),
  });

  // Read response as text first, then try to parse as JSON
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.log('[createReview] JSON parse error:', text.slice(0, 200));
    return {
      ok: false,
      status: response.status,
      data: null,
      error: `JSON parse error: ${text.slice(0, 100)}`,
    };
  }

  // Check for error in response
  if (data.error) {
    return {
      ok: false,
      status: response.status,
      data: null,
      error: data.error,
    };
  }

  return {
    ok: true,
    status: response.status,
    data: data.data,
    error: undefined,
  };
}

/**
 * 設置測試數據
 *
 * ⚠️ 注意：cleanup 功能已被移除，因為存在生產環境風險。
 *
 * 請改用 CLI 工具來清理和重置測試資料：
 *   npx tsx scripts/clean-database.ts local
 *
 * 或直接執行 SQL 腳本：
 *   wrangler d1 execute DB --local --file=./scripts/reset-test-data.sql
 */
export const setupTestData = {
  /**
   * 清理測試數據（已棄用）
   *
   * ⚠️ 請改用 CLI 工具：npx tsx scripts/clean-database.ts
   */
  async cleanMatchData(matchId: number) {
    console.warn(`⚠️ cleanMatchData 已棄用。請改用 CLI：npx tsx scripts/clean-database.ts local`);
  },

  /**
   * 清理測試用戶（已棄用）
   *
   * ⚠️ 請改用 CLI 工具：npx tsx scripts/clean-database.ts
   */
  async cleanUser(socialId: string) {
    console.warn(`⚠️ cleanUser 已棄用。請改用 CLI：npx tsx scripts/clean-database.ts local`);
  },
};

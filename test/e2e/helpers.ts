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
 */
export const TEST_USERS = {
  organizer: {
    id: 'test_organizer_1',
    name: '測試開局者 A',
    email: 'test_organizer_1@example.com',
  },
  participant1: {
    id: 'test_participant_1',
    name: '測試參與者 B',
    email: 'test_participant_1@example.com',
  },
  participant2: {
    id: 'test_participant_2',
    name: '測試參與者 C',
    email: 'test_participant_2@example.com',
  },
  participant3: {
    id: 'test_participant_3',
    name: '測試參與者 D',
    email: 'test_participant_3@example.com',
  },
  nonParticipant: {
    id: 'test_non_participant_1',
    name: '測試非參與者',
    email: 'test_non_participant_1@example.com',
  },
};

const BASE_URL = 'http://localhost:8787';

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
    console.log('[createMatch] JSON parse error, response text:', text.slice(0, 500));
    throw new Error(`Create match failed (${response.status}): ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    console.log('[createMatch] API error:', data);
    throw new Error(`Create match failed (${response.status}): ${data.message || 'Unknown error'}`);
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

  return {
    ok: response.ok,
    status: response.status,
    data: data.data,
    error: !response.ok ? data.message || 'Unknown error' : null,
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

  return {
    ok: response.ok,
    status: response.status,
    data: data.data,
    error: !response.ok ? data.message || 'Unknown error' : null,
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

  return {
    ok: response.ok,
    status: response.status,
    data: data.data,
    error: !response.ok ? data.message || 'Unknown error' : null,
  };
}

/**
 * 設置測試數據
 */
export const setupTestData = {
  /**
   * 清理測試數據
   */
  async cleanMatchData(matchId: number) {
    await fetch(`${BASE_URL}/test/cleanup/match/${matchId}`, {
      method: 'DELETE',
    });
  },

  /**
   * 清理測試用戶
   */
  async cleanUser(socialId: string) {
    await fetch(`${BASE_URL}/test/cleanup/user/${socialId}`, {
      method: 'DELETE',
    });
  },
};

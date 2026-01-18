/**
 * E2E 測試輔助函數 - 使用 vitest-pool-workers
 *
 * 提供可重用的測試工具，包括：
 * - Mock 登入
 * - 直接調用 Worker 端點（不使用 HTTP）
 * - 測試數據清理
 */

import app from '../../src/index';
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

/**
 * Mock 登入獲取 token
 */
export async function mockLogin(env: Env, user: typeof TEST_USERS.organizer) {
  const response = await app.request(
    '/auth/mock',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    },
    env
  );

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
  env: Env,
  token: string,
  matchData: { activity_id: number; match_time: string }
) {
  const response = await app.request(
    '/matches',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(matchData),
    },
    env
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Create match failed: ${data.message || 'Unknown error'}`);
  }

  return data.data;
}

/**
 * 申請加入配對
 */
export async function joinMatch(env: Env, token: string, matchId: number) {
  const response = await app.request(
    `/matches/${matchId}/join`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    env
  );

  const data = await response.json();

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
  env: Env,
  token: string,
  matchId: number,
  count: number
): Promise<Array<{ ok: boolean; status: number; data?: any; error?: string }>> {
  const promises = Array(count)
    .fill(null)
    .map(() => joinMatch(env, token, matchId));

  return Promise.all(promises);
}

/**
 * 審核參與者
 */
export async function reviewParticipant(
  env: Env,
  token: string,
  matchId: number,
  participantId: number,
  status: 'approved' | 'rejected'
) {
  const response = await app.request(
    `/matches/${matchId}/participants/${participantId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    },
    env
  );

  const data = await response.json();

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
  env: Env,
  token: string,
  matchId: number,
  status: 'completed' | 'cancelled'
) {
  const response = await app.request(
    `/matches/${matchId}/status`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    },
    env
  );

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
  env: Env,
  token: string,
  reviewData: { match_id: number; reviewee_id: number; score: number; comment?: string }
) {
  const response = await app.request(
    '/reviews',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(reviewData),
    },
    env
  );

  const data = await response.json();

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
  async cleanMatchData(env: Env, matchId: number) {
    await env.DB.prepare(`DELETE FROM reviews WHERE match_id = ?`).bind(matchId).run();
    await env.DB.prepare(`DELETE FROM match_participants WHERE match_id = ?`).bind(matchId).run();
    await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(matchId).run();
  },

  /**
   * 清理測試用戶
   */
  async cleanUser(env: Env, socialId: string) {
    await env.DB.prepare(`DELETE FROM users WHERE social_id = ?`).bind(socialId).run();
  },
};

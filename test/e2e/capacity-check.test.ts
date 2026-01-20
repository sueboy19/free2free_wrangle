/**
 * E2E 測試 2：配對容量驗證測試
 *
 * 目的：驗證容量檢查邏輯
 *
 * 重要發現：實際代碼中並沒有實現容量檢查
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { TEST_USERS, mockLogin, createMatch, joinMatch } from './helpers';

let organizerToken: string;
let participant1Token: string;
let participant2Token: string;
let participant3Token: string;
let matchId: number;

describe('E2E 測試 2：配對容量驗證測試（當前行為）', () => {
  beforeAll(async () => {
    // 1. Mock 登入開局者
    const organizerLogin = await mockLogin(TEST_USERS.organizer);
    organizerToken = organizerLogin.accessToken;

    // 2. Mock 登入參與者 1
    const participant1Login = await mockLogin(TEST_USERS.participant1);
    participant1Token = participant1Login.accessToken;

    // 3. Mock 登入參與者 2
    const participant2Login = await mockLogin(TEST_USERS.participant2);
    participant2Token = participant2Login.accessToken;

    // 4. Mock 登入參與者 3
    const participant3Login = await mockLogin(TEST_USERS.participant3);
    participant3Token = participant3Login.accessToken;

    // 5. 創建配對
    const match = await createMatch(organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    matchId = match.id;
  });

  it('當前行為：參與配對沒有容量限制', async () => {
    // 用戶 1 參與配對
    const user1Result = await joinMatch(participant1Token, matchId);
    expect(user1Result.ok).toBe(true);
    expect(user1Result.data).toBeDefined();
    expect(user1Result.data.status).toBe('pending');

    // 用戶 2 參與配對
    const user2Result = await joinMatch(participant2Token, matchId);
    expect(user2Result.ok).toBe(true);
    expect(user2Result.data).toBeDefined();
    expect(user2Result.data.status).toBe('pending');

    // 用戶 3 參與配對 → 當前應該成功（沒有容量限制）
    const user3Result = await joinMatch(participant3Token, matchId);
    expect(user3Result.ok).toBe(true);
    expect(user3Result.data).toBeDefined();
    expect(user3Result.data.status).toBe('pending');
  });

  it('開局者不能參與自己的配對', async () => {
    const result = await joinMatch(organizerToken, matchId);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('開局者不能參與自己的配對');
  });

  it('同一用戶不能重複參與同一配對', async () => {
    // 創建新配對進行測試
    const match = await createMatch(organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newMatchId = match.id;

    // 第一次參與
    const firstResult = await joinMatch(participant1Token, newMatchId);
    expect(firstResult.ok).toBe(true);

    // 第二次參與應該失敗
    const secondResult = await joinMatch(participant1Token, newMatchId);
    expect(secondResult.ok).toBe(false);
    expect(secondResult.error).toContain('您已經參與過此配對');

    // 暫時不清理測試數據
  });
});

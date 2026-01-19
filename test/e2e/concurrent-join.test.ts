/**
 * E2E 測試 1：競態條件 - 並發參與測試
 *
 * 目的：驗證多個用戶同時參與配對不會產生重複記錄
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TEST_USERS, mockLogin, createMatch, concurrentJoin, setupTestData } from './helpers';

let organizerToken: string;
let participantToken: string;
let matchId: number;

describe('E2E 測試 1：競態條件 - 並發參與測試', () => {
  beforeAll(async () => {
    // 1. Mock 登入開局者
    const organizerLogin = await mockLogin(TEST_USERS.organizer);
    organizerToken = organizerLogin.accessToken;

    // 2. Mock 登入參與者
    const participantLogin = await mockLogin(TEST_USERS.participant1);
    participantToken = participantLogin.accessToken;

    // 3. 創建配對
    const match = await createMatch(organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    matchId = match.id;
  });

  afterAll(async () => {
    // 清理測試數據
    if (matchId) {
      await setupTestData.cleanMatchData(matchId);
    }
  });

  it('並發參與配對不應產生重複記錄', async () => {
    // 使用並發參與（模擬競態條件）
    const results = await concurrentJoin(participantToken, matchId, 3);

    // 檢查是否有多個成功
    const successfulResults = results.filter((r) => r.ok);
    expect(successfulResults.length).toBeLessThanOrEqual(1);
  });

  it('單個用戶連續多次參與應只允許一次成功', async () => {
    // 創建新配對進行測試
    const match = await createMatch(organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newMatchId = match.id;

    // 第一次參與
    const firstResult = await concurrentJoin(participantToken, newMatchId, 3);
    const firstSuccess = firstResult.filter((r) => r.ok);

    expect(firstSuccess.length).toBe(1);

    // 清理測試數據
    await setupTestData.cleanMatchData(newMatchId);
  });

  it('不同用戶同時參與應該都能成功', async () => {
    // 創建新配對
    const match = await createMatch(organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newMatchId = match.id;

    // 創建第二個用戶並登入
    const participant2Login = await mockLogin(TEST_USERS.participant2);
    const participant2Token = participant2Login.accessToken;

    // 用戶1嘗試並發參與2次（應該只有1次成功）
    const results1 = await concurrentJoin(participantToken, newMatchId, 2);
    const success1 = results1.filter((r) => r.ok);

    // 用戶2嘗試並發參與2次（應該只有1次成功）
    const results2 = await concurrentJoin(participant2Token, newMatchId, 2);
    const success2 = results2.filter((r) => r.ok);

    // 每個用戶最多只能成功加入1次
    expect(success1.length).toBe(1);
    expect(success2.length).toBe(1);

    // 清理測試數據
    await setupTestData.cleanMatchData(newMatchId);
  });
});

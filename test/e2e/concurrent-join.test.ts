/**
 * E2E 測試 1：競態條件 - 並發參與測試
 *
 * 目的：驗證多個用戶同時參與配對不會產生重複記錄
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TEST_USERS, mockLogin, createMatch, concurrentJoin, setupTestData } from './helpers';
import type { Env } from '../../src/types';

let env: Env;
let organizerToken: string;
let participantToken: string;
let participantUserId: number;
let matchId: number;

describe('E2E 測試 1：競態條件 - 並發參與測試', () => {
  beforeAll(async (ctx) => {
    env = ctx.env as Env;

    // 1. Mock 登入開局者
    const organizerLogin = await mockLogin(env, TEST_USERS.organizer);
    organizerToken = organizerLogin.accessToken;

    // 2. Mock 登入參與者
    const participantLogin = await mockLogin(env, TEST_USERS.participant1);
    participantToken = participantLogin.accessToken;
    participantUserId = participantLogin.user.id;

    // 3. 創建配對
    const match = await createMatch(env, organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    matchId = match.id;
  });

  afterAll(async () => {
    // 清理測試數據
    if (env && matchId) {
      await setupTestData.cleanMatchData(env, matchId);
    }
  });

  it('並發參與配對不應產生重複記錄', async () => {
    // 並發發送 10 個相同的參與請求
    const results = await concurrentJoin(env, participantToken, matchId, 10);

    // 統計成功和失敗的請求
    const successCount = results.filter((r) => r.ok).length;
    const failureCount = results.filter((r) => !r.ok).length;

    console.log(`成功請求: ${successCount}`);
    console.log(`失敗請求: ${failureCount}`);

    // 至少有一個請求應該成功（第一個）
    expect(successCount).toBeGreaterThan(0);

    // 其餘請求應該失敗
    expect(failureCount).toBeGreaterThan(0);

    // 驗證錯誤訊息
    const failedResults = results.filter((r) => !r.ok);
    failedResults.forEach((result) => {
      expect(result.error).toContain('您已經參與過此配對');
    });

    // 查詢數據庫驗證沒有重複記錄
    const duplicates = await env.DB.prepare(
      `SELECT match_id, user_id, COUNT(*) as count
         FROM match_participants
         WHERE match_id = ? AND user_id = ?
         GROUP BY match_id, user_id
         HAVING count > 1`
    )
      .bind(matchId, participantUserId)
      .all();

    expect(duplicates.results?.length || 0).toBe(0);
  }, 15000);

  it('單個用戶連續多次參與應只允許一次成功', async () => {
    // 創建新的配對
    const match = await createMatch(env, organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newMatchId = match.id;

    // 第一次參與應該成功
    const firstJoin = await concurrentJoin(env, participantToken, newMatchId, 1);
    expect(firstJoin[0].ok).toBe(true);

    // 第二次參與應該失敗
    const secondJoin = await concurrentJoin(env, participantToken, newMatchId, 1);
    expect(secondJoin[0].ok).toBe(false);
    expect(secondJoin[0].error).toContain('您已經參與過此配對');

    // 清理
    await setupTestData.cleanMatchData(env, newMatchId);
  });

  it('不同用戶同時參與應該都能成功', async () => {
    // 創建新的配對
    const match = await createMatch(env, organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newMatchId = match.id;

    // Mock 登入另一個用戶
    const participant2Login = await mockLogin(env, TEST_USERS.participant2);
    const participant2Token = participant2Login.accessToken;

    // 兩個用戶同時參與
    const [user1Result, user2Result] = await Promise.all([
      concurrentJoin(env, participantToken, newMatchId, 1),
      concurrentJoin(env, participant2Token, newMatchId, 1),
    ]);

    // 兩個用戶都應該成功參與
    expect(user1Result[0].ok).toBe(true);
    expect(user2Result[0].ok).toBe(true);

    // 清理
    await setupTestData.cleanMatchData(env, newMatchId);
  });
});

/**
 * E2E 測試 3：審核驗證測試
 *
 * 目的：驗證審核邏輯正確工作
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  TEST_USERS,
  mockLogin,
  createMatch,
  joinMatch,
  reviewParticipant,
  closeMatch,
  setupTestData,
} from './helpers';

let organizerToken: string;
let participant1Token: string;
let participant1UserId: number;
let participant2Token: string;
let participant2UserId: number;

describe('E2E 測試 3：審核驗證測試', () => {
  beforeAll(async () => {
    // 1. Mock 登入開局者
    const organizerLogin = await mockLogin(TEST_USERS.organizer);
    organizerToken = organizerLogin.accessToken;

    // 2. Mock 登入參與者 1
    const participant1Login = await mockLogin(TEST_USERS.participant1);
    participant1Token = participant1Login.accessToken;
    participant1UserId = participant1Login.user.id;

    // 3. Mock 登入參與者 2
    const participant2Login = await mockLogin(TEST_USERS.participant2);
    participant2Token = participant2Login.accessToken;
    participant2UserId = participant2Login.user.id;
  });

  it('開局者可以批准參與者', async () => {
    // 創建自己的配對
    const match = await createMatch(organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const matchId = match.id;

    // 參與者加入
    const joinResult = await joinMatch(participant1Token, matchId);
    expect(joinResult.ok).toBe(true);
    expect(joinResult.data).toBeDefined();
    const participantDbId = joinResult.data.id; // 這是 match_participants 表的 id

    // 批准 (使用 participant 的 database id，不是 user id)
    const reviewResult = await reviewParticipant(
      organizerToken,
      matchId,
      participantDbId,
      'approved'
    );

    expect(reviewResult.ok).toBe(true);
    expect(reviewResult.data).toBeDefined();
    expect(reviewResult.data.status).toBe('approved');

    await setupTestData.cleanMatchData(matchId);
  });

  it('開局者可以拒絕參與者', async () => {
    // 創建自己的配對
    const match = await createMatch(organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const matchId = match.id;

    // 參與者加入
    const joinResult = await joinMatch(participant2Token, matchId);
    expect(joinResult.ok).toBe(true);
    expect(joinResult.data).toBeDefined();
    const participantDbId = joinResult.data.id;

    // 拒絕
    const reviewResult = await reviewParticipant(
      organizerToken,
      matchId,
      participantDbId,
      'rejected'
    );

    expect(reviewResult.ok).toBe(true);
    expect(reviewResult.data).toBeDefined();
    expect(reviewResult.data.status).toBe('rejected');

    await setupTestData.cleanMatchData(matchId);
  });

  it('不能審核已完成的配對', async () => {
    // 創建自己的配對
    const match = await createMatch(organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const matchId = match.id;

    // 參與者加入
    await joinMatch(participant1Token, matchId);

    // 先完成配對
    await closeMatch(organizerToken, matchId, 'completed');

    // 嘗試審核
    const reviewResult = await reviewParticipant(
      organizerToken,
      matchId,
      participant1UserId,
      'approved'
    );

    expect(reviewResult.ok).toBe(false);
    expect(reviewResult.error).toContain('配對已關閉或已完成，無法審核');

    await setupTestData.cleanMatchData(matchId);
  });

  it('不能審核已取消的配對', async () => {
    // 創建自己的配對
    const match = await createMatch(organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const matchId = match.id;

    // 參與者加入
    await joinMatch(participant1Token, matchId);

    // 先取消配對
    await closeMatch(organizerToken, matchId, 'cancelled');

    // 嘗試審核
    const reviewResult = await reviewParticipant(
      organizerToken,
      matchId,
      participant1UserId,
      'approved'
    );

    expect(reviewResult.ok).toBe(false);
    expect(reviewResult.error).toContain('配對已關閉或已完成，無法審核');

    await setupTestData.cleanMatchData(matchId);
  });

  it('參與者不能審核其他參與者', async () => {
    // 創建自己的配對
    const match = await createMatch(organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const matchId = match.id;

    // 參與者 1 加入
    await joinMatch(participant1Token, matchId);

    // 參與者 1 嘗試審核參與者 2
    const result = await reviewParticipant(
      participant1Token,
      matchId,
      participant2UserId,
      'approved'
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('只有開局者才能執行此操作');

    await setupTestData.cleanMatchData(matchId);
  });

  it('不能審核不存在的參與者', async () => {
    // 創建自己的配對
    const match = await createMatch(organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const matchId = match.id;

    // 參與者加入
    await joinMatch(participant1Token, matchId);

    // 嘗試審核不存在的 participantId
    const result = await reviewParticipant(organizerToken, matchId, 99999, 'approved');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('參與者不存在');

    await setupTestData.cleanMatchData(matchId);
  });

  it('不能使用無效的審核狀態', async () => {
    // 創建自己的配對
    const match = await createMatch(organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const matchId = match.id;

    // 參與者加入
    await joinMatch(participant1Token, matchId);

    // 嘗試使用無效狀態
    const result = await reviewParticipant(
      organizerToken,
      matchId,
      participant1UserId,
      'invalid_status' as any
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Invalid status');

    await setupTestData.cleanMatchData(matchId);
  });
});

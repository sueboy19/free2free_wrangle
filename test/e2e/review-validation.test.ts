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
let participant2Token: string;
let matchId: number;

describe('E2E 測試 3：審核驗證測試', () => {
  beforeAll(async () => {
    // 1. Mock 登入開局者
    const organizerLogin = await mockLogin(TEST_USERS.organizer);
    organizerToken = organizerLogin.accessToken;

    // 2. Mock 登入參與者
    const participant1Login = await mockLogin(TEST_USERS.participant1);
    participant1Token = participant1Login.accessToken;

    // 3. 創建配對
    const match = await createMatch(organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });

    matchId = match.id;

    // 4. 參與者 1 申請加入
    await joinMatch(participant1Token, matchId);
  });

  afterAll(async () => {
    // 清理測試數據
    if (matchId) {
      await setupTestData.cleanMatchData(matchId);
    }
  });

  it('開局者可以批准參與者', async () => {
    const reviewResult = await reviewParticipant(
      organizerToken,
      matchId,
      (await mockLogin(TEST_USERS.participant1)).user.id,
      'approved'
    );

    expect(reviewResult.ok).toBe(true);
    expect(reviewResult.data).toBeDefined();
    expect(reviewResult.data.status).toBe('approved');
  });

  it('開局者可以拒絕參與者', async () => {
    const reviewResult = await reviewParticipant(
      organizerToken,
      matchId,
      (await mockLogin(TEST_USERS.participant1)).user.id,
      'rejected'
    );

    expect(reviewResult.ok).toBe(true);
    expect(reviewResult.data).toBeDefined();
    expect(reviewResult.data.status).toBe('rejected');
  });

  it('不能審核已完成的配對', async () => {
    // 先完成配對
    await closeMatch(organizerToken, matchId, 'completed');

    // 嘗試審核
    const reviewResult = await reviewParticipant(
      organizerToken,
      matchId,
      (await mockLogin(TEST_USERS.participant1)).user.id,
      'approved'
    );

    expect(reviewResult.ok).toBe(false);
    expect(reviewResult.error).toContain('只能審核待處理中的配對');
  });

  it('不能審核已取消的配對', async () => {
    // 先取消配對
    await closeMatch(organizerToken, matchId, 'cancelled');

    // 嘗試審核
    const reviewResult = await reviewParticipant(
      organizerToken,
      matchId,
      (await mockLogin(TEST_USERS.participant1)).user.id,
      'approved'
    );

    expect(reviewResult.ok).toBe(false);
    expect(reviewResult.error).toContain('只能審核待處理中的配對');
  });

  it('參與者不能審核其他參與者', async () => {
    // 參與者 1 審核參與者 2
    const result = await reviewParticipant(
      participant1Token,
      matchId,
      (await mockLogin(TEST_USERS.participant2)).user.id,
      'approved'
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('只有開局者可以審核參與者');
  });

  it('不能審核不存在的參與者', async () => {
    // 嘗試審核不存在的 participantId
    const result = await reviewParticipant(organizerToken, matchId, 99999, 'approved');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('找不到該參與者');
  });

  it('不能使用無效的審核狀態', async () => {
    const result = await reviewParticipant(
      organizerToken,
      matchId,
      (await mockLogin(TEST_USERS.participant1)).user.id,
      'invalid_status' as any
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('無效的審核狀態');
  });
});

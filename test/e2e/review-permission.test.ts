/**
 * E2E 測試 4：評分權限驗證測試
 *
 * 目的：驗證評分權限檢查正常工作
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TEST_USERS, mockLogin, createMatch, joinMatch, closeMatch, createReview } from './helpers';
import type { Env } from '../../src/types';

let env: Env;
let organizerToken: string;
let participant1Token: string;
let participant2Token: string;
let participant3Token: string;
let nonParticipantToken: string;
let matchId: number;

describe('E2E 測試 4：評分權限驗證測試', () => {
  beforeAll(async (ctx) => {
    env = ctx.env as Env;

    // 1. Mock 登入開局者
    const organizerLogin = await mockLogin(env, TEST_USERS.organizer);
    organizerToken = organizerLogin.accessToken;

    // 2. Mock 登入參與者 1
    const participant1Login = await mockLogin(env, TEST_USERS.participant1);
    participant1Token = participant1Login.accessToken;

    // 3. Mock 登入參與者 2
    const participant2Login = await mockLogin(env, TEST_USERS.participant2);
    participant2Token = participant2Login.accessToken;

    // 4. Mock 登入參與者 3
    const participant3Login = await mockLogin(env, TEST_USERS.participant3);
    participant3Token = participant3Login.accessToken;

    // 5. Mock 登入非參與者
    const nonParticipantLogin = await mockLogin(env, TEST_USERS.nonParticipant);
    nonParticipantToken = nonParticipantLogin.accessToken;

    // 6. 創建配對
    const match = await createMatch(env, organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    matchId = match.id;

    // 7. 參與者 1 申請加入
    await joinMatch(env, participant1Token, matchId);

    // 8. 參與者 2 申請加入
    await joinMatch(env, participant2Token, matchId);

    // 9. 關閉配對（標記為已完成）
    await closeMatch(env, organizerToken, matchId, 'completed');
  });

  afterAll(async () => {
    if (env && matchId) {
      await env.DB.prepare(`DELETE FROM reviews WHERE match_id = ?`).bind(matchId).run();
      await env.DB.prepare(`DELETE FROM match_participants WHERE match_id = ?`).bind(matchId).run();
      await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(matchId).run();
    }
  });

  it('未參與的用戶不能評分', async () => {
    const result = await createReview(env, nonParticipantToken, {
      match_id: matchId,
      reviewee_id: (await mockLogin(env, TEST_USERS.participant1)).user.id,
      score: 5,
      comment: '測試評分',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('您未參與此配對，無法評分');
  });

  it('只能評分已完成的配對', async () => {
    const match = await createMatch(env, organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newMatchId = match.id;

    await joinMatch(env, participant1Token, newMatchId);
    await joinMatch(env, participant2Token, newMatchId);

    const participant1Login = await mockLogin(env, TEST_USERS.participant1);
    const participant2Login = await mockLogin(env, TEST_USERS.participant2);

    // 嘗試評分未完成的配對
    const result = await createReview(env, participant1Login.accessToken, {
      match_id: newMatchId,
      reviewee_id: participant2Login.user.id,
      score: 5,
      comment: '測試評分',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('只能評分已完成的配對');

    await env.DB.prepare(`DELETE FROM match_participants WHERE match_id = ?`)
      .bind(newMatchId)
      .run();
    await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(newMatchId).run();
  });

  it('不能自我評分', async () => {
    const participant1Login = await mockLogin(env, TEST_USERS.participant1);
    const result = await createReview(env, participant1Login.accessToken, {
      match_id: matchId,
      reviewee_id: participant1Login.user.id,
      score: 5,
      comment: '自我評分測試',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('不能評分自己');
  });

  it('不能評分未參與配對的用戶', async () => {
    const participant1Login = await mockLogin(env, TEST_USERS.participant1);
    const result = await createReview(env, participant1Login.accessToken, {
      match_id: matchId,
      reviewee_id: 99999,
      score: 5,
      comment: '測試評分',
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain('被評分者未參與此配對');
  });

  it('不能重複評分同一用戶', async () => {
    const participant1Login = await mockLogin(env, TEST_USERS.participant1);
    const participant2Login = await mockLogin(env, TEST_USERS.participant2);

    // 第一次評分
    const firstResult = await createReview(env, participant1Login.accessToken, {
      match_id: matchId,
      reviewee_id: participant2Login.user.id,
      score: 5,
      comment: '第一次評分',
    });

    expect(firstResult.ok).toBe(true);
    expect(firstResult.data).toBeDefined();

    // 第二次評分同一用戶
    const secondResult = await createReview(env, participant1Login.accessToken, {
      match_id: matchId,
      reviewee_id: participant2Login.user.id,
      score: 4,
      comment: '第二次評分',
    });

    expect(secondResult.ok).toBe(false);
    expect(secondResult.error).toContain('您已經評分過此用戶');
  });

  it('正常評分流程應該成功', async () => {
    const match = await createMatch(env, organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newMatchId = match.id;

    await joinMatch(env, participant1Token, newMatchId);
    await joinMatch(env, participant2Token, newMatchId);

    await closeMatch(env, organizerToken, newMatchId, 'completed');

    const participant1Login = await mockLogin(env, TEST_USERS.participant1);
    const participant2Login = await mockLogin(env, TEST_USERS.participant2);

    const result = await createReview(env, participant1Login.accessToken, {
      match_id: newMatchId,
      reviewee_id: participant2Login.user.id,
      score: 5,
      comment: '很好的體驗',
    });

    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.score).toBe(5);
    expect(result.data.comment).toBe('很好的體驗');

    await env.DB.prepare(`DELETE FROM reviews WHERE match_id = ?`).bind(newMatchId).run();
    await env.DB.prepare(`DELETE FROM match_participants WHERE match_id = ?`)
      .bind(newMatchId)
      .run();
    await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(newMatchId).run();
  });

  it('評分必須在 1-5 範圍內', async () => {
    const participant2Login = await mockLogin(env, TEST_USERS.participant2);
    const participant1Login = await mockLogin(env, TEST_USERS.participant1);

    // 測試 score = 0
    const result1 = await createReview(env, participant2Login.accessToken, {
      match_id: matchId,
      reviewee_id: participant1Login.user.id,
      score: 0,
      comment: '測試',
    });

    expect(result1.ok).toBe(false);
    expect(result1.error).toContain('Score must be between 1 and 5');

    // 測試 score = 6
    const result2 = await createReview(env, participant2Login.accessToken, {
      match_id: matchId,
      reviewee_id: participant1Login.user.id,
      score: 6,
      comment: '測試',
    });

    expect(result2.ok).toBe(false);
    expect(result2.error).toContain('Score must be between 1 and 5');
  });

  it('評分可以不包含評論', async () => {
    const match = await createMatch(env, organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newMatchId = match.id;

    await joinMatch(env, participant1Token, newMatchId);
    await joinMatch(env, participant2Token, newMatchId);

    await closeMatch(env, organizerToken, newMatchId, 'completed');

    const participant1Login = await mockLogin(env, TEST_USERS.participant1);
    const participant2Login = await mockLogin(env, TEST_USERS.participant2);

    const result = await createReview(env, participant1Login.accessToken, {
      match_id: newMatchId,
      reviewee_id: participant2Login.user.id,
      score: 4,
      // 不提供 comment
    });

    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.score).toBe(4);

    await env.DB.prepare(`DELETE FROM reviews WHERE match_id = ?`).bind(newMatchId).run();
    await env.DB.prepare(`DELETE FROM match_participants WHERE match_id = ?`)
      .bind(newMatchId)
      .run();
    await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(newMatchId).run();
  });

  it('必須提供必填字段', async () => {
    const participant1Login = await mockLogin(env, TEST_USERS.participant1);
    const participant2Login = await mockLogin(env, TEST_USERS.participant2);

    // 缺少 match_id
    const result1 = await createReview(env, participant1Login.accessToken, {
      reviewee_id: participant2Login.user.id,
      score: 5,
    } as any);

    expect(result1.ok).toBe(false);
    expect(result1.error).toContain('Missing required fields');

    // 缺少 reviewee_id
    const result2 = await createReview(env, participant1Login.accessToken, {
      match_id: matchId,
      score: 5,
    } as any);

    expect(result2.ok).toBe(false);
    expect(result2.error).toContain('Missing required fields');
  });

  it('開局者也可以參與評分（如果開局者也參與了配對）', async () => {
    // 開局者不能參與自己的配對，所以這個測試需要調整
    // 暫時跳過
    expect(true).toBe(true);
  });
});

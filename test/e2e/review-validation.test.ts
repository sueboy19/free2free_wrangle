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
} from './helpers';
import type { Env } from '../../src/types';

let env: Env;
let organizerToken: string;
let participant1Token: string;
let participant2Token: string;
let matchId: number;

describe('E2E 測試 3：審核驗證測試', () => {
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

    // 4. 創建配對
    const match = await createMatch(env, organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    matchId = match.id;
  });

  afterAll(async () => {
    if (env) {
      await env.DB.prepare(`DELETE FROM match_participants WHERE match_id = ?`).bind(matchId).run();
      await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(matchId).run();
    }
  });

  it('開局者可以批准參與者', async () => {
    // 創建新配對進行測試
    const match = await createMatch(env, organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newMatchId = match.id;

    // 參與者申請加入
    const participantResult = await joinMatch(env, participant1Token, newMatchId);
    const newParticipantId = participantResult.data.id;

    // 開局者批准參與者
    const result = await reviewParticipant(
      env,
      organizerToken,
      newMatchId,
      newParticipantId,
      'approved'
    );

    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.status).toBe('approved');

    await env.DB.prepare(`DELETE FROM match_participants WHERE match_id = ?`)
      .bind(newMatchId)
      .run();
    await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(newMatchId).run();
  });

  it('開局者可以拒絕參與者', async () => {
    const match = await createMatch(env, organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newMatchId = match.id;

    const participantResult = await joinMatch(env, participant1Token, newMatchId);
    const newParticipantId = participantResult.data.id;

    const result = await reviewParticipant(
      env,
      organizerToken,
      newMatchId,
      newParticipantId,
      'rejected'
    );

    expect(result.ok).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.status).toBe('rejected');

    await env.DB.prepare(`DELETE FROM match_participants WHERE match_id = ?`)
      .bind(newMatchId)
      .run();
    await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(newMatchId).run();
  });

  it('不能審核已完成的配對', async () => {
    const match = await createMatch(env, organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newMatchId = match.id;

    const participantResult = await joinMatch(env, participant1Token, newMatchId);
    const newParticipantId = participantResult.data.id;

    // 開局者關閉配對
    await closeMatch(env, organizerToken, newMatchId, 'completed');

    // 嘗試審核已完成的配對
    const result = await reviewParticipant(
      env,
      organizerToken,
      newMatchId,
      newParticipantId,
      'approved'
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('配對已關閉或已完成，無法審核');

    await env.DB.prepare(`DELETE FROM match_participants WHERE match_id = ?`)
      .bind(newMatchId)
      .run();
    await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(newMatchId).run();
  });

  it('不能審核已取消的配對', async () => {
    const match = await createMatch(env, organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newMatchId = match.id;

    const participantResult = await joinMatch(env, participant1Token, newMatchId);
    const newParticipantId = participantResult.data.id;

    // 開局者取消配對
    await closeMatch(env, organizerToken, newMatchId, 'cancelled');

    const result = await reviewParticipant(
      env,
      organizerToken,
      newMatchId,
      newParticipantId,
      'approved'
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('配對已關閉或已完成，無法審核');

    await env.DB.prepare(`DELETE FROM match_participants WHERE match_id = ?`)
      .bind(newMatchId)
      .run();
    await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(newMatchId).run();
  });

  it('參與者不能審核其他參與者', async () => {
    const match = await createMatch(env, organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newMatchId = match.id;

    const participantResult = await joinMatch(env, participant1Token, newMatchId);
    const newParticipantId = participantResult.data.id;

    // 參與者 2 嘗試審核參與者 1（應該失敗）
    const result = await reviewParticipant(
      env,
      participant2Token,
      newMatchId,
      newParticipantId,
      'approved'
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain('只有開局者才能執行此操作');

    await env.DB.prepare(`DELETE FROM match_participants WHERE match_id = ?`)
      .bind(newMatchId)
      .run();
    await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(newMatchId).run();
  });

  it('不能使用無效的審核狀態', async () => {
    const match = await createMatch(env, organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newMatchId = match.id;

    const participantResult = await joinMatch(env, participant1Token, newMatchId);
    const newParticipantId = participantResult.data.id;

    const response = await (
      await import('../../src/index')
    ).default.request(
      `/matches/${newMatchId}/participants/${newParticipantId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${organizerToken}`,
        },
        body: JSON.stringify({ status: 'invalid_status' }),
      } as any,
      env
    );

    const data = await response.json();

    expect(response.ok).toBe(false);
    expect(data.message).toContain('Invalid status');

    await env.DB.prepare(`DELETE FROM match_participants WHERE match_id = ?`)
      .bind(newMatchId)
      .run();
    await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(newMatchId).run();
  });

  it('不能審核不存在的參與者', async () => {
    const match = await createMatch(env, organizerToken, {
      activity_id: 1,
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const newMatchId = match.id;

    const result = await reviewParticipant(env, organizerToken, newMatchId, 99999, 'approved');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('參與者不存在');

    await env.DB.prepare(`DELETE FROM matches WHERE id = ?`).bind(newMatchId).run();
  });

  it('不能審核不存在的配對', async () => {
    const result = await reviewParticipant(env, organizerToken, 99999, 1, 'approved');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('配對不存在');
  });
});

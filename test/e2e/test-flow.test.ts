/**
 * E2E 測試 - 配對完整流程測試
 *
 * 測試完整的配對流程：
 * 1. Mock 登入兩個帳號（開局者和參與者）
 * 2. 創建配對
 * 3. 參與者申請加入配對
 * 4. 開局者審核參與者
 * 5. 關閉配對
 *
 * 運行方式：
 *   npm run test:e2e
 */

import { describe, it, expect, beforeEach } from 'vitest';
import app from '../../src/index';
import type { Env } from '../../src/types';
import {
  mockLogin,
  createMatch,
  joinMatch,
  reviewParticipant,
  closeMatch,
  TEST_USERS,
} from './helpers';

describe('配對完整流程測試', () => {
  let env: Env;

  beforeEach(async ({ env: testEnv }) => {
    env = testEnv as Env;
  });

  it('應該成功完成完整的配對流程', async () => {
    // 1. 用戶 A 登入（開局者）
    const organizerLogin = await mockLogin(env, TEST_USERS.organizer);
    const organizerToken = organizerLogin.accessToken;

    expect(organizerLogin.user).toBeDefined();
    expect(organizerLogin.user.id).toBe(TEST_USERS.organizer.id);
    expect(organizerToken).toBeDefined();

    // 2. 用戶 B 登入（參與者）
    const participantLogin = await mockLogin(env, TEST_USERS.participant1);
    const participantToken = participantLogin.accessToken;

    expect(participantLogin.user).toBeDefined();
    expect(participantLogin.user.id).toBe(TEST_USERS.participant1.id);
    expect(participantToken).toBeDefined();

    // 3. 用戶 A 創建配對
    const match = await createMatch(env, organizerToken, {
      activity_id: 1, // 假設存在 activity_id=1
      match_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(match.id).toBeDefined();
    expect(match.status).toBe('open');
    expect(match.organizer_id).toBe(organizerLogin.user.id);

    // 4. 用戶 B 申請加入配對
    const joinResult = await joinMatch(env, participantToken, match.id);

    expect(joinResult.ok).toBe(true);
    expect(joinResult.data).toBeDefined();
    expect(joinResult.data.status).toBe('pending');

    // 5. 用戶 A 審核通過用戶 B
    const reviewResult = await reviewParticipant(
      env,
      organizerToken,
      match.id,
      joinResult.data.id,
      'approved'
    );

    expect(reviewResult.ok).toBe(true);
    expect(reviewResult.data).toBeDefined();
    expect(reviewResult.data.status).toBe('approved');

    // 6. 用戶 A 關閉配對
    const closedMatch = await closeMatch(env, organizerToken, match.id, 'completed');

    expect(closedMatch.status).toBe('completed');
    expect(closedMatch.id).toBe(match.id);
  });
});

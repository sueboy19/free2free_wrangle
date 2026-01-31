import { Hono } from 'hono';
import type { Env } from '../types';
import { FacebookOAuthProvider, InstagramOAuthProvider } from '../lib/oauth';
import { JWTManager } from '../lib/jwt';
import { SessionManager } from '../lib/session';
import { authMiddleware } from '../middleware/auth';

const router = new Hono<{ Bindings: Env }>();

// This must come BEFORE /auth/:provider to avoid route conflicts
router.get('/auth/me', authMiddleware, async (c) => {
  const user = c.get('user' as never);

  if (!user) {
    throw new Error('Authentication required');
  }

  return c.json({ user });
});

router.get('/auth/:provider', async (c) => {
  const provider = c.req.param('provider');

  if (!['facebook', 'instagram'].includes(provider)) {
    throw new Error('Invalid OAuth provider');
  }
  // 使用固定的前端回調 URL（從環境變量讀取，或使用默認值）
  const frontendCallbackUrl =
    `${c.env.FRONTEND_URL}/auth/callback` || 'http://localhost:3000/auth/callback';

  const redirectUri = `${c.env.BACKEND_API_BASE_URL}/auth/${provider}/callback`;

  let oauthProvider;
  if (provider === 'facebook') {
    oauthProvider = new FacebookOAuthProvider(
      c.env.FACEBOOK_KEY,
      c.env.FACEBOOK_SECRET,
      redirectUri
    );
  } else {
    oauthProvider = new InstagramOAuthProvider(
      c.env.INSTAGRAM_KEY,
      c.env.INSTAGRAM_SECRET,
      redirectUri
    );
  }

  // 生成隨機 state 並存儲到數據庫（防止 CSRF 攻擊）
  const state = crypto.randomUUID();
  const stateExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5分鐘過期

  await c.env.DB.prepare(
    `INSERT INTO oauth_states (state, expires_at, created_at)
     VALUES (?, ?, datetime('now'))`
  )
    .bind(state, stateExpiresAt)
    .run();

  const authUrl = oauthProvider.getAuthUrl(state);

  return c.redirect(authUrl, 302);
});

router.get('/auth/:provider/callback', async (c) => {
  const provider = c.req.param('provider');
  const code = c.req.query('code');
  const state = c.req.query('state');

  // 檢查 Facebook/Instagram 返回的錯誤參數（用戶取消授權等）
  const error = c.req.query('error');
  const errorCode = c.req.query('error_code');
  const errorReason = c.req.query('error_reason');
  const errorDescription = c.req.query('error_description');

  if (error) {
    console.error(
      '[OAuth Callback] Provider returned error:',
      JSON.stringify({
        provider,
        error,
        error_code: errorCode,
        error_reason: errorReason,
        error_description: errorDescription,
        timestamp: new Date().toISOString(),
      })
    );

    // 根據錯誤類型顯示不同的錯誤訊息
    let errorMessage = '登入失敗，請重試';

    if (errorReason === 'user_denied' || errorCode === '200') {
      // 用戶取消授權
      errorMessage = '您已取消授權，如需登入請重新點擊登入按鈕';
    } else if (errorReason === 'user_cancelled') {
      // 用戶關閉登入視窗
      errorMessage = '登入已取消';
    } else if (error === 'access_denied') {
      // 拒絕存取權限
      errorMessage = '您拒絕了必要的權限，如需使用本服務請重新授權';
    } else {
      // 其他錯誤
      errorMessage = errorDescription || '登入失敗，請重試';
    }

    // 重定向到前端並帶錯誤訊息
    const frontendCallbackUrl =
      `${c.env.FRONTEND_URL}/auth/callback` || 'http://localhost:3000/auth/callback';
    const redirectUrl = `${frontendCallbackUrl}?error=${encodeURIComponent(errorMessage)}`;

    return c.redirect(redirectUrl, 302);
  }

  if (!code) {
    console.error(
      '[OAuth Callback] Missing authorization code:',
      JSON.stringify({
        provider,
        timestamp: new Date().toISOString(),
      })
    );
    const frontendCallbackUrl =
      `${c.env.FRONTEND_URL}/auth/callback` || 'http://localhost:3000/auth/callback';
    const redirectUrl = `${frontendCallbackUrl}?error=${encodeURIComponent('授權碼丟失，請重新登入')}`;
    return c.redirect(redirectUrl, 302);
  }

  if (!state) {
    console.error(
      '[OAuth Callback] Missing state parameter:',
      JSON.stringify({
        provider,
        timestamp: new Date().toISOString(),
      })
    );
    throw new Error('授權碼無效，請重新登入');
  }

  // 驗證 state（防止 CSRF 攻擊）
  const stateRecord = await c.env.DB.prepare(
    'SELECT * FROM oauth_states WHERE state = ? AND expires_at > datetime("now")'
  )
    .bind(state)
    .first();

  if (!stateRecord) {
    console.error(
      '[OAuth State] Invalid or expired state:',
      JSON.stringify({
        provider,
        state,
        timestamp: new Date().toISOString(),
      })
    );
    throw new Error('授權已過期，請重新登入');
  }

  // 刪除已使用的 state（一次性使用）
  await c.env.DB.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();

  // 使用固定的前端回調 URL（從環境變量讀取）
  const frontendCallbackUrl =
    `${c.env.FRONTEND_URL}/auth/callback` || 'http://localhost:3000/auth/callback';

  const redirectUri = `${c.env.BACKEND_API_BASE_URL}/auth/${provider}/callback`;

  let oauthProvider;
  if (provider === 'facebook') {
    oauthProvider = new FacebookOAuthProvider(
      c.env.FACEBOOK_KEY,
      c.env.FACEBOOK_SECRET,
      redirectUri
    );
  } else {
    oauthProvider = new InstagramOAuthProvider(
      c.env.INSTAGRAM_KEY,
      c.env.INSTAGRAM_SECRET,
      redirectUri
    );
  }

  const accessToken = await oauthProvider.exchangeCodeForToken(code);
  const profile = await oauthProvider.getUserProfile(accessToken);

  let user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE social_id = ? AND social_provider = ?'
  )
    .bind(profile.id, provider)
    .first();

  if (!user) {
    const result = await c.env.DB.prepare(
      `INSERT INTO users (social_id, social_provider, name, email, avatar_url, is_admin)
         VALUES (?, ?, ?, ?, ?, 0)`
    )
      .bind(profile.id, provider, profile.name, profile.email || '', profile.avatar_url || null)
      .run();

    user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(result.meta.last_row_id)
      .first();
  }

  if (!user) {
    throw new Error('Failed to create user');
  }

  const jwtManager = new JWTManager(c.env.JWT_SECRET);

  const userData = {
    id: user.id as number,
    social_id: user.social_id as string,
    social_provider: user.social_provider as 'facebook' | 'instagram',
    name: user.name as string,
    email: user.email as string,
    avatar_url: user.avatar_url as string | undefined,
    is_admin: (user.is_admin as unknown as number) === 1,
    created_at: user.created_at as number,
    updated_at: user.updated_at as number,
  };

  const tokens = await jwtManager.generateTokens(userData);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await c.env.DB.prepare(
    `INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
     VALUES (?, ?, ?, datetime('now'))`
  )
    .bind(user.id, tokens.refresh, expiresAt)
    .run();

  const sessionManager = new SessionManager(c.env.DB);
  await sessionManager.createSession(user.id as number, { ...userData });

  // 生成短期 code（5 分鐘），用於換取 token
  const authCode = crypto.randomUUID();
  const codeExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // 儲存 code 對應的 token 和 user
  await c.env.DB.prepare(
    `INSERT INTO oauth_codes (code, user_id, access_token, refresh_token, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  )
    .bind(authCode, user.id, tokens.access, tokens.refresh, codeExpiresAt)
    .run();

  // 重定向到前端 /auth/callback?code=...（用 query 參數而不是 hash）
  const redirectUrl = `${frontendCallbackUrl}?code=${authCode}`;

  return c.redirect(redirectUrl, 302);
});

router.post('/auth/refresh', async (c) => {
  const body = await c.req.json();
  const refreshToken = body.refresh_token;

  if (!refreshToken) {
    throw new Error('Refresh token is required');
  }

  const jwtManager = new JWTManager(c.env.JWT_SECRET);
  const payload = await jwtManager.verifyRefreshToken(refreshToken);

  const tokenRecord = await c.env.DB.prepare(
    'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > datetime("now")'
  )
    .bind(refreshToken)
    .first();

  if (!tokenRecord) {
    throw new Error('Invalid token');
  }

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(payload.user_id)
    .first();

  if (!user) {
    throw new Error('User not found');
  }

  const userData = {
    id: user.id as number,
    social_id: user.social_id as string,
    social_provider: user.social_provider as 'facebook' | 'instagram',
    name: user.name as string,
    email: user.email as string,
    avatar_url: user.avatar_url as string | undefined,
    is_admin: (user.is_admin as unknown as number) === 1,
    created_at: user.created_at as number,
    updated_at: user.updated_at as number,
  };

  const newTokens = await jwtManager.generateTokens(userData);

  await c.env.DB.prepare('DELETE FROM refresh_tokens WHERE token = ?').bind(refreshToken).run();

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await c.env.DB.prepare(
    `INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
     VALUES (?, ?, ?, datetime('now'))`
  )
    .bind(user.id, newTokens.refresh, expiresAt)
    .run();

  return c.json({
    tokens: {
      access: newTokens.access,
      refresh: newTokens.refresh,
    },
  });
});

router.post('/auth/logout', async (c) => {
  try {
    const body = await c.req.json();
    const refreshToken = body.refresh_token;
    const sessionId = body.session_id;

    if (refreshToken) {
      await c.env.DB.prepare('DELETE FROM refresh_tokens WHERE token = ?').bind(refreshToken).run();
    }

    if (sessionId) {
      await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
    }

    return c.json({ message: 'Logged out successfully' });
  } catch {
    return c.json({ message: 'Logged out successfully' });
  }
});

// Exchange OAuth code for tokens
router.post('/auth/exchange-code', async (c) => {
  const body = await c.req.json();
  const { code } = body;

  if (!code) {
    return c.json({ error: 'Code is required' }, 400);
  }

  // Get code from database
  const codeRecord = await c.env.DB.prepare(
    'SELECT * FROM oauth_codes WHERE code = ? AND expires_at > datetime("now")'
  )
    .bind(code)
    .first();

  if (!codeRecord) {
    return c.json({ error: 'Invalid or expired code' }, 400);
  }

  // Get user data
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(codeRecord.user_id)
    .first();

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  const userData = {
    id: user.id as number,
    social_id: user.social_id as string,
    social_provider: user.social_provider as 'facebook' | 'instagram',
    name: user.name as string,
    email: user.email as string,
    avatar_url: user.avatar_url as string | undefined,
    is_admin: (user.is_admin as unknown as number) === 1,
    created_at: user.created_at as number,
    updated_at: user.updated_at as number,
  };

  // Delete code (one-time use)
  await c.env.DB.prepare('DELETE FROM oauth_codes WHERE code = ?').bind(code).run();

  return c.json({
    access_token: codeRecord.access_token,
    refresh_token: codeRecord.refresh_token,
    user: userData,
  });
});

router.get('/auth/me', authMiddleware, async (c) => {
  const user = c.get('user' as never);

  if (!user) {
    throw new Error('Authentication required');
  }

  return c.json({ user });
});

router.get('/profile', authMiddleware, async (c) => {
  const user = c.get('user' as never);

  if (!user) {
    throw new Error('Authentication required');
  }

  return c.json({ data: user });
});

router.get('/logout', async (c) => {
  return c.json({ message: 'Logged out successfully' });
});

router.post('/auth/mock', async (c) => {
  try {
    if (c.env.ENVIRONMENT === 'production') {
      throw new Error('Mock login is not available in production');
    }

    const body = await c.req.json();
    const mockId = body.id || 'mock_user_123';
    const mockName = body.name || 'Mock User';
    const mockEmail = body.email || 'mock@example.com';

    let user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE social_id = ? AND social_provider = ?'
    )
      .bind(mockId, 'facebook')
      .first();

    if (!user) {
      const result = await c.env.DB.prepare(
        `INSERT INTO users (social_id, social_provider, name, email, avatar_url, is_admin)
           VALUES (?, ?, ?, ?, ?, 0)`
      )
        .bind(mockId, 'facebook', mockName, mockEmail, null)
        .run();

      user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
        .bind(result.meta.last_row_id)
        .first();
    }

    if (!user) {
      throw new Error('Failed to create mock user');
    }

    const jwtManager = new JWTManager(c.env.JWT_SECRET);

    const userData = {
      id: user.id as number,
      social_id: user.social_id as string,
      social_provider: user.social_provider as 'facebook' | 'instagram',
      name: user.name as string,
      email: user.email as string,
      avatar_url: user.avatar_url as string | undefined,
      is_admin: (user.is_admin as unknown as number) === 1,
      created_at: user.created_at as number,
      updated_at: user.updated_at as number,
    };

    const tokens = await jwtManager.generateTokens(userData);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await c.env.DB.prepare(
      `INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
        VALUES (?, ?, ?, datetime('now'))`
    )
      .bind(user.id, tokens.refresh, expiresAt)
      .run();

    const sessionManager = new SessionManager(c.env.DB);
    await sessionManager.createSession(user.id as number, { ...userData });

    return c.json({
      user: userData,
      tokens: {
        access: tokens.access,
        refresh: tokens.refresh,
      },
    });
  } catch (error) {
    return c.json({ message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

export default router;

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

  // 獲取前端回調 URL（用於 OAuth 後 redirect 回前端）
  const origin =
    c.req.header('origin') || c.req.header('referer')?.split('/')[2] || 'http://localhost:3000';
  const frontendCallbackUrl = c.req.query('redirect_uri') || `${origin}/auth/callback`;

  const redirectUri = `${c.env.BASE_URL}/auth/${provider}/callback`;

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

  // 將前端回調 URL 編碼到 state 參數中（用於 callback 時找回前端 URL）
  const state = encodeURIComponent(frontendCallbackUrl);
  const authUrl = oauthProvider.getAuthUrl(state);

  return c.redirect(authUrl, 302);
});

router.get('/auth/:provider/callback', async (c) => {
  const provider = c.req.param('provider');
  const code = c.req.query('code');
  const state = c.req.query('state');

  if (!code) {
    throw new Error('Authorization code is required');
  }

  // 從 state 中解析前端回調 URL
  let frontendCallbackUrl = 'http://localhost:3000/auth/callback';
  if (state) {
    try {
      frontendCallbackUrl = decodeURIComponent(state);
    } catch (e) {
      console.warn('Failed to decode state:', state);
    }
  }

  const redirectUri = `${c.env.BASE_URL}/auth/${provider}/callback`;

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

  // Store token and user data in DB with short-lived code (5 minutes)
  const authCode = crypto.randomUUID();
  const codeExpiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  await c.env.DB.prepare(
    `INSERT INTO oauth_codes (code, user_id, access_token, refresh_token, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  )
    .bind(authCode, user.id, tokens.access, tokens.refresh, codeExpiresAt)
    .run();

  // Redirect to frontend with code only (not token)
  const redirectUrl = `${frontendCallbackUrl}#code=${authCode}`;

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

// Exchange OAuth code for token (used by frontend callback)
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

  // Delete the code (one-time use)
  await c.env.DB.prepare('DELETE FROM oauth_codes WHERE code = ?').bind(code).run();

  return c.json({
    access_token: codeRecord.access_token,
    refresh_token: codeRecord.refresh_token,
    user: userData,
  });
});

export default router;

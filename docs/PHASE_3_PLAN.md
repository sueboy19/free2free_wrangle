# Cloudflare Workers 遷移計畫 - 階段 3：認證系統遷移

## 📋 階段 3 概述

**目標：** 完整實現認證系統，包括 JWT、OAuth 和 Session 管理

**預計時間：** 1 週

**狀態：** ✅ 已完成

**完成日期：** 2026-01-16

---

## ✅ 任務清單

### Task 3.1: 完善 JWT 生成和驗證

**狀態：** ⬜ 待辦

**說明：** 在 src/lib/jwt.ts 中完善 JWT 功能

**檔案：** `src/lib/jwt.ts`

**實現內容：**

```typescript
import { SignJWT, jwtVerify } from 'jose';
import type { JWTPayload, User } from '../types';

const JWT_ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export class JWTManager {
  constructor(private secret: string) {
    if (secret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters');
    }
  }

  private getSecretKey(): Uint8Array {
    return new TextEncoder().encode(this.secret);
  }

  async generateAccessToken(user: User): Promise<string> {
    return new SignJWT({
      user_id: user.id,
      user_name: user.name,
      is_admin: user.is_admin,
    } as JWTPayload)
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt()
      .setExpirationTime(ACCESS_TOKEN_EXPIRY)
      .sign(this.getSecretKey());
  }

  async generateRefreshToken(user: User): Promise<string> {
    const tokenData = {
      user_id: user.id,
      jti: crypto.randomUUID(), // JWT ID for rotation
    };

    return new SignJWT(tokenData)
      .setProtectedHeader({ alg: JWT_ALGORITHM })
      .setIssuedAt()
      .setExpirationTime(REFRESH_TOKEN_EXPIRY)
      .sign(this.getSecretKey());
  }

  async generateTokens(user: User): Promise<{ access: string; refresh: string }> {
    const [access, refresh] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    return { access, refresh };
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, this.getSecretKey());
      return payload as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<{ user_id: number; jti: string }> {
    try {
      const { payload } = await jwtVerify(token, this.getSecretKey());
      return {
        user_id: payload.user_id as number,
        jti: payload.jti as string,
      };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async getTokenPayload(token: string): Promise<JWTPayload | null> {
    try {
      return await this.verifyAccessToken(token);
    } catch {
      return null;
    }
  }
}

export function createJWTManager(secret: string): JWTManager {
  return new JWTManager(secret);
}
```

**驗證：**

- [ ] JWT 生成功能正常
- [ ] JWT 驗證功能正常
- [ ] Token 過期處理正確

---

### Task 3.2: 實現 Session 管理（使用 D1 而非 KV）

**狀態：** ⬜ 待辦

**說明：** 在 src/lib/session.ts 中實現 Session 管理，使用 D1 資料庫存儲

**檔案：** `src/lib/session.ts`

**實現內容：**

```typescript
import type { D1Database } from '@cloudflare/workers-types';
import type { User } from '../types';

export interface Session {
  id: string;
  user_id: number;
  data: Record<string, unknown>;
  expires_at: string;
  created_at: string;
}

export class SessionManager {
  constructor(private db: D1Database) {}

  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  private getExpiryTime(minutes: number): string {
    const expiry = new Date(Date.now() + minutes * 60 * 1000);
    return expiry.toISOString();
  }

  async createSession(
    userId: number,
    data: Record<string, unknown> = {},
    expiryMinutes: number = 1440
  ): Promise<Session> {
    const sessionId = this.generateSessionId();
    const expiresAt = this.getExpiryTime(expiryMinutes);

    await this.db
      .prepare(
        `INSERT INTO sessions (id, user_id, data, expires_at, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      )
      .bind(sessionId, userId, JSON.stringify(data), expiresAt)
      .run();

    return this.getSession(sessionId) as Promise<Session>;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const row = await this.db
      .prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")')
      .bind(sessionId)
      .first<Session>();

    if (!row) return null;

    return {
      ...row,
      data: JSON.parse(row.data as string),
    };
  }

  async updateSession(sessionId: string, data: Record<string, unknown>): Promise<Session | null> {
    await this.db
      .prepare(
        'UPDATE sessions SET data = ?, expires_at = datetime("now", "+1440 minutes") WHERE id = ?'
      )
      .bind(JSON.stringify(data), sessionId)
      .run();

    return this.getSession(sessionId);
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
    return (result.meta.changes || 0) > 0;
  }

  async deleteSessionsByUserId(userId: number): Promise<number> {
    const result = await this.db
      .prepare('DELETE FROM sessions WHERE user_id = ?')
      .bind(userId)
      .run();
    return result.meta.changes || 0;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.db
      .prepare('DELETE FROM sessions WHERE expires_at <= datetime("now")')
      .run();
    return result.meta.changes || 0;
  }

  async getUserFromSession(sessionId: string): Promise<User | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const user = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(session.user_id)
      .first<User>();

    if (!user) return null;

    return { ...user, is_admin: user.is_admin === 1 };
  }

  async refreshSession(sessionId: string): Promise<Session | null> {
    const expiresAt = this.getExpiryTime(1440);

    await this.db
      .prepare('UPDATE sessions SET expires_at = ? WHERE id = ?')
      .bind(expiresAt, sessionId)
      .run();

    return this.getSession(sessionId);
  }
}

export function createSessionManager(db: D1Database): SessionManager {
  return new SessionManager(db);
}
```

**驗證：**

- [ ] Session 創建功能正常
- [ ] Session 查詢功能正常
- [ ] Session 刪除功能正常
- [ ] 過期 Session 清理正常

---

### Task 3.3: 更新 D1 Migration 添加 Sessions 表

**狀態：** ⬜ 待辦

**說明：** 在 migrations/0001_initial.sql 中添加 sessions 表

**實現內容：**

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  data TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
```

**驗證：**

- [ ] sessions 表已創建
- [ ] 索引已創建

---

### Task 3.4: 實現 Facebook OAuth Handler

**狀態：** ⬜ 待辦

**說明：** 在 src/lib/oauth.ts 中實現完整的 Facebook OAuth 處理

**檔案：** `src/lib/oauth.ts`

**實現內容：**

```typescript
import type { User } from '../types';

export interface OAuthProvider {
  name: 'facebook' | 'instagram';
  getAuthUrl(): string;
  exchangeCodeForToken(code: string): Promise<string>;
  getUserProfile(accessToken: string): Promise<OAuthProfile>;
}

export interface OAuthProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

export class FacebookOAuthProvider implements OAuthProvider {
  name = 'facebook' as const;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'email,public_profile',
      response_type: 'code',
      state: crypto.randomUUID(),
    });
    return `https://www.facebook.com/v18.0/dialog/oauth?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
      code,
    });

    const response = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?${params}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Facebook OAuth error: ${data.error.message}`);
    }

    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<OAuthProfile> {
    const params = new URLSearchParams({
      fields: 'id,name,email,picture',
      access_token: accessToken,
    });

    const response = await fetch(`https://graph.facebook.com/v18.0/me?${params}`);
    const data = await response.json();

    if (data.error) {
      throw new Error(`Facebook API error: ${data.error.message}`);
    }

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      avatar_url: data.picture?.data?.url,
    };
  }
}

export class InstagramOAuthProvider implements OAuthProvider {
  name = 'instagram' as const;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'user_profile',
      response_type: 'code',
      state: crypto.randomUUID(),
    });
    return `https://api.instagram.com/oauth/authorize?${params}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      code,
    });

    const response = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data = await response.json();

    if (data.error_type) {
      throw new Error(`Instagram OAuth error: ${data.error_message}`);
    }

    return data.access_token;
  }

  async getUserProfile(accessToken: string): Promise<OAuthProfile> {
    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username,profile_picture_url&access_token=${accessToken}`
    );
    const data = await response.json();

    if (data.error) {
      throw new Error(`Instagram API error: ${data.error.message}`);
    }

    return {
      id: data.id,
      name: data.username,
      email: '', // Instagram doesn't provide email by default
      avatar_url: data.profile_picture_url,
    };
  }
}

export class OAuthManager {
  private providers: Map<string, OAuthProvider> = new Map();

  registerProvider(provider: OAuthProvider) {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): OAuthProvider | undefined {
    return this.providers.get(name);
  }

  async handleOAuthLogin(providerName: string, code: string): Promise<OAuthProfile> {
    const provider = this.getProvider(providerName);

    if (!provider) {
      throw new Error(`OAuth provider '${providerName}' not found`);
    }

    const accessToken = await provider.exchangeCodeForToken(code);
    const profile = await provider.getUserProfile(accessToken);

    return profile;
  }
}
```

**驗證：**

- [ ] Facebook OAuth 功能正常
- [ ] Instagram OAuth 功能正常
- [ ] 錯誤處理正確

---

### Task 3.5: 實現認證 Middleware

**狀態：** ⬜ 待辦

**說明：** 在 src/middleware/auth.ts 中實現認證相關的 middleware

**檔案：** `src/middleware/auth.ts`

**實現內容：**

```typescript
import type { Context, Next } from 'hono';
import type { Env } from '../types';
import { Errors } from '../lib/errors';
import { SessionManager } from '../lib/session';

export const authMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  try {
    // Check for JWT token in Authorization header
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Errors.unauthorized();
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    const { verifyAccessToken } = await import('../lib/jwt');
    const jwtManager = new (await import('../lib/jwt')).JWTManager(c.env.JWT_SECRET);
    const payload = await jwtManager.verifyAccessToken(token);

    // Get user from database
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(payload.user_id)
      .first();

    if (!user) {
      throw Errors.unauthorized('User not found');
    }

    // Attach user to context
    c.set('user', {
      id: user.id,
      social_id: user.social_id,
      social_provider: user.social_provider,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      is_admin: user.is_admin === 1,
    });

    await next();
  } catch (error) {
    if (error instanceof Error && error.message.includes('token')) {
      throw Errors.invalidToken();
    }
    throw error;
  }
};

export const adminAuthMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  await authMiddleware(c, async () => {});

  const user = c.get('user');

  if (!user || !user.is_admin) {
    throw Errors.forbidden('Admin access required');
  }

  await next();
};

export const optionalAuthMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { JWTManager } = await import('../lib/jwt');
      const jwtManager = new JWTManager(c.env.JWT_SECRET);
      const payload = await jwtManager.verifyAccessToken(token);

      const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
        .bind(payload.user_id)
        .first();

      if (user) {
        c.set('user', {
          id: user.id,
          social_id: user.social_id,
          social_provider: user.social_provider,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
          is_admin: user.is_admin === 1,
        });
      }
    }
  } catch (error) {
    // Ignore errors in optional auth
  }

  await next();
};
```

**驗證：**

- [ ] JWT 認證正常
- [ ] Admin 檢查正常
- [ ] Optional auth 正常

---

### Task 3.6: 實現 OAuth 路由

**狀態：** ⬜ 待辦

**說明：** 在 src/routes/auth.ts 中實現 OAuth 相關的路由

**檔案：** `src/routes/auth.ts`

**實現內容：**

```typescript
import { Hono } from 'hono';
import { Errors } from '../lib/errors';
import type { Env } from '../types';

const router = new Hono<{ Bindings: Env }>();

// Get OAuth authorization URL
router.get('/auth/:provider', async (c) => {
  const provider = c.req.param('provider');

  if (!['facebook', 'instagram'].includes(provider)) {
    throw Errors.validation('Invalid OAuth provider');
  }

  const redirectUri = `${c.env.BACKEND_API_BASE_URL}/auth/${provider}/callback`;

  const { FacebookOAuthProvider, InstagramOAuthProvider } = await import('../lib/oauth');

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

  const authUrl = oauthProvider.getAuthUrl();

  return c.json({ auth_url: authUrl });
});

// OAuth callback
router.get('/auth/:provider/callback', async (c) => {
  const provider = c.req.param('provider');
  const code = c.req.query('code');

  if (!code) {
    throw Errors.validation('Authorization code is required');
  }

  const redirectUri = `${c.env.BACKEND_API_BASE_URL}/auth/${provider}/callback`;

  const { FacebookOAuthProvider, InstagramOAuthProvider } = await import('../lib/oauth');

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

  // Find or create user
  let user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE social_id = ? AND social_provider = ?'
  )
    .bind(profile.id, provider)
    .first();

  if (!user) {
    // Create new user
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
    throw Errors.internal('Failed to create user');
  }

  // Generate JWT tokens
  const { JWTManager } = await import('../lib/jwt');
  const jwtManager = new JWTManager(c.env.JWT_SECRET);

  const userData = {
    id: user.id,
    social_id: user.social_id,
    social_provider: user.social_provider,
    name: user.name,
    email: user.email,
    avatar_url: user.avatar_url,
    is_admin: user.is_admin === 1,
  };

  const tokens = await jwtManager.generateTokens(userData);

  // Store refresh token in database
  const { decode } = await import('jose');
  const decoded = decode(tokens.refresh);
  const expiresAt = new Date((decoded.payload.exp || 0) * 1000).toISOString();

  await c.env.DB.prepare(
    `INSERT INTO refresh_tokens (user_id, token, expires_at, created_at)
     VALUES (?, ?, ?, datetime('now'))`
  )
    .bind(user.id, tokens.refresh, expiresAt)
    .run();

  // Create session
  const { SessionManager } = await import('../lib/session');
  const sessionManager = new SessionManager(c.env.DB);
  const session = await sessionManager.createSession(user.id, { ...userData });

  // Return tokens and user data
  return c.json({
    user: userData,
    tokens: {
      access: tokens.access,
      refresh: tokens.refresh,
    },
    session_id: session.id,
  });
});

// Refresh access token
router.post('/auth/refresh', async (c) => {
  const body = await c.req.json();
  const refreshToken = body.refresh_token;

  if (!refreshToken) {
    throw Errors.validation('Refresh token is required');
  }

  // Verify refresh token
  const { JWTManager } = await import('../lib/jwt');
  const jwtManager = new JWTManager(c.env.JWT_SECRET);
  const payload = await jwtManager.verifyRefreshToken(refreshToken);

  // Check if refresh token exists in database
  const tokenRecord = await c.env.DB.prepare(
    'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > datetime("now")'
  )
    .bind(refreshToken)
    .first();

  if (!tokenRecord) {
    throw Errors.invalidToken();
  }

  // Get user
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(payload.user_id)
    .first();

  if (!user) {
    throw Errors.notFound('User');
  }

  const userData = {
    id: user.id,
    social_id: user.social_id,
    social_provider: user.social_provider,
    name: user.name,
    email: user.email,
    avatar_url: user.avatar_url,
    is_admin: user.is_admin === 1,
  };

  // Generate new tokens
  const newTokens = await jwtManager.generateTokens(userData);

  // Delete old refresh token and create new one
  await c.env.DB.prepare('DELETE FROM refresh_tokens WHERE token = ?').bind(refreshToken).run();

  const { decode } = await import('jose');
  const decoded = decode(newTokens.refresh);
  const expiresAt = new Date((decoded.payload.exp || 0) * 1000).toISOString();

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

// Logout
router.post('/auth/logout', async (c) => {
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
});

// Get current user
router.get('/auth/me', async (c) => {
  const user = c.get('user');

  if (!user) {
    throw Errors.unauthorized();
  }

  return c.json({ user });
});

export default router;
```

**驗證：**

- [ ] OAuth 登入流程正常
- [ ] Token 刷新正常
- [ ] 登出功能正常

---

### Task 3.7: 更新主入口註冊路由

**狀態：** ⬜ 待辦

**說明：** 在 src/index.ts 中註冊認證路由和 middleware

**實現內容：**

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { errorHandler } from './middleware/error';
import { optionalAuthMiddleware } from './middleware/auth';
import type { Env } from './types';
import authRoutes from './routes/auth';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: c.env.CORS_ORIGINS.split(','),
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  });
  return corsMiddleware(c, next);
});
app.use('*', errorHandler);

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'Free2Free API is running',
    timestamp: new Date().toISOString(),
  });
});

// Auth routes (public)
app.route('/', authRoutes);

export default app;
```

**驗證：**

- [ ] 路由註冊成功
- [ ] Middleware 正確應用

---

### Task 3.8: 寫入 JWT 測試

**狀態：** ⬜ 待辦

**檔案：** `test/unit/jwt.test.ts`

**實現內容：**

```typescript
import { describe, it, expect } from 'vitest';
import { JWTManager } from '../../src/lib/jwt';
import type { User } from '../../src/types';

describe('JWTManager', () => {
  const secret = 'test-secret-key-at-least-32-characters-long';
  const jwtManager = new JWTManager(secret);

  const mockUser: User = {
    id: 1,
    social_id: '123',
    social_provider: 'facebook',
    name: 'Test User',
    email: 'test@example.com',
    avatar_url: 'http://example.com/avatar.jpg',
    is_admin: false,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  it('should generate access token', async () => {
    const token = await jwtManager.generateAccessToken(mockUser);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('should verify access token', async () => {
    const token = await jwtManager.generateAccessToken(mockUser);
    const payload = await jwtManager.verifyAccessToken(token);

    expect(payload.user_id).toBe(mockUser.id);
    expect(payload.user_name).toBe(mockUser.name);
    expect(payload.is_admin).toBe(mockUser.is_admin);
    expect(payload.exp).toBeTruthy();
  });

  it('should generate refresh token', async () => {
    const token = await jwtManager.generateRefreshToken(mockUser);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
  });

  it('should generate both tokens', async () => {
    const tokens = await jwtManager.generateTokens(mockUser);

    expect(tokens.access).toBeTruthy();
    expect(tokens.refresh).toBeTruthy();
    expect(tokens.access).not.toBe(tokens.refresh);
  });

  it('should throw error for invalid token', async () => {
    await expect(jwtManager.verifyAccessToken('invalid-token')).rejects.toThrow();
  });

  it('should throw error for secret less than 32 characters', () => {
    expect(() => new JWTManager('short-secret')).toThrow();
  });
});
```

**驗證：**

- [ ] 所有測試通過
- [ ] 錯誤處理正確

---

### Task 3.9: 寫入 Session 測試

**狀態：** ⬜ 待辦

**檔案：** `test/unit/session.test.ts`

**實現內容：**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { SessionManager } from '../../src/lib/session';
import type { Env } from '../../src/types';

describe('SessionManager', () => {
  let db: any;
  let sessionManager: SessionManager;

  beforeEach(() => {
    db = {
      prepare: () => ({
        bind: () => ({
          run: async () => ({ meta: { changes: 1 } }),
          first: async () => ({
            id: 'session-id',
            user_id: 1,
            data: JSON.stringify({ test: 'data' }),
            expires_at: new Date(Date.now() + 1000000).toISOString(),
            created_at: new Date().toISOString(),
          }),
        }),
      }),
    };
    sessionManager = new SessionManager(db);
  });

  it('should create a session', async () => {
    const session = await sessionManager.createSession(1, { test: 'data' });

    expect(session.id).toBeTruthy();
    expect(session.user_id).toBe(1);
    expect(session.data).toEqual({ test: 'data' });
  });

  it('should get a session', async () => {
    const session = await sessionManager.getSession('session-id');

    expect(session).toBeTruthy();
    expect(session?.id).toBe('session-id');
  });

  it('should return null for expired session', async () => {
    db.prepare = () => ({
      bind: () => ({
        first: async () => null,
      }),
    });

    const session = await sessionManager.getSession('session-id');
    expect(session).toBeNull();
  });

  it('should delete a session', async () => {
    const result = await sessionManager.deleteSession('session-id');
    expect(result).toBe(true);
  });

  it('should delete sessions by user id', async () => {
    const count = await sessionManager.deleteSessionsByUserId(1);
    expect(typeof count).toBe('number');
  });
});
```

**驗證：**

- [ ] 所有測試通過

---

### Task 3.10: 寫入 OAuth 測試

**狀態：** ⬜ 待辦

**檔案：** `test/unit/oauth.test.ts`

**實現內容：**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { FacebookOAuthProvider, InstagramOAuthProvider, OAuthManager } from '../../src/lib/oauth';

// Mock fetch
global.fetch = vi.fn();

describe('OAuthProvider', () => {
  const redirectUri = 'http://localhost:8787/auth/facebook/callback';

  describe('FacebookOAuthProvider', () => {
    const provider = new FacebookOAuthProvider('test-id', 'test-secret', redirectUri);

    it('should generate auth URL', () => {
      const url = provider.getAuthUrl();

      expect(url).toContain('facebook.com');
      expect(url).toContain('client_id=test-id');
      expect(url).toContain(redirectUri);
    });

    it('should exchange code for token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        json: async () => ({ access_token: 'test-access-token' }),
      } as Response);

      const token = await provider.exchangeCodeForToken('test-code');

      expect(token).toBe('test-access-token');
    });

    it('should get user profile', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        json: async () => ({
          id: '123',
          name: 'Test User',
          email: 'test@example.com',
          picture: { data: { url: 'http://example.com/avatar.jpg' } },
        }),
      } as Response);

      const profile = await provider.getUserProfile('test-access-token');

      expect(profile.id).toBe('123');
      expect(profile.name).toBe('Test User');
      expect(profile.email).toBe('test@example.com');
    });

    it('should throw error on OAuth failure', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        json: async () => ({ error: { message: 'Invalid code' } }),
      } as Response);

      await expect(provider.exchangeCodeForToken('invalid-code')).rejects.toThrow();
    });
  });

  describe('InstagramOAuthProvider', () => {
    const provider = new InstagramOAuthProvider('test-id', 'test-secret', redirectUri);

    it('should generate auth URL', () => {
      const url = provider.getAuthUrl();

      expect(url).toContain('instagram.com');
      expect(url).toContain('client_id=test-id');
    });

    it('should exchange code for token', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        json: async () => ({ access_token: 'test-access-token' }),
      } as Response);

      const token = await provider.exchangeCodeForToken('test-code');

      expect(token).toBe('test-access-token');
    });

    it('should get user profile', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        json: async () => ({
          id: '123',
          username: 'testuser',
          profile_picture_url: 'http://example.com/avatar.jpg',
        }),
      } as Response);

      const profile = await provider.getUserProfile('test-access-token');

      expect(profile.id).toBe('123');
      expect(profile.name).toBe('testuser');
    });
  });

  describe('OAuthManager', () => {
    const manager = new OAuthManager();

    it('should register and get provider', () => {
      const provider = new FacebookOAuthProvider('test-id', 'test-secret', redirectUri);
      manager.registerProvider(provider);

      const retrieved = manager.getProvider('facebook');
      expect(retrieved).toBe(provider);
    });

    it('should return undefined for unknown provider', () => {
      const retrieved = manager.getProvider('unknown');
      expect(retrieved).toBeUndefined();
    });
  });
});
```

**驗證：**

- [ ] 所有測試通過

---

### Task 3.11: 寫入整合測試

**狀態：** ⬜ 待辦

**檔案：** `test/integration/auth.test.ts`

**實現內容：**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '../../src/types';

describe('Authentication Integration', () => {
  let app: Hono<{ Bindings: Env }>;
  let env: Env;

  beforeEach(async () => {
    env = {
      DB: {
        prepare: (query: string) => ({
          bind: (...args: any[]) => ({
            run: async () => ({ meta: { last_row_id: 1, changes: 1 } }),
            first: async () => ({
              id: 1,
              social_id: '123',
              social_provider: 'facebook',
              name: 'Test User',
              email: 'test@example.com',
              avatar_url: 'http://example.com/avatar.jpg',
              is_admin: 0,
            }),
          }),
        }),
      } as any,
      KV: {} as any,
      JWT_SECRET: 'test-secret-key-at-least-32-characters-long',
      SESSION_KEY: 'test-session-key-at-least-32-characters-long',
      FACEBOOK_KEY: 'test',
      FACEBOOK_SECRET: 'test',
      INSTAGRAM_KEY: 'test',
      INSTAGRAM_SECRET: 'test',
      BASE_URL: 'http://localhost',
      FRONTEND_URL: 'http://localhost:3000',
      CORS_ORIGINS: 'http://localhost:3000',
    };

    app = new Hono<{ Bindings: Env }>();
    app.get('/test-auth', async (c) => {
      const { authMiddleware } = await import('../../src/middleware/auth');
      await authMiddleware(c, async () => {
        const user = c.get('user');
        return c.json({ user });
      });
    });
  });

  it('should allow authenticated request', async () => {
    const { JWTManager } = await import('../../src/lib/jwt');
    const jwtManager = new JWTManager(env.JWT_SECRET);

    const user = {
      id: 1,
      social_id: '123',
      social_provider: 'facebook',
      name: 'Test User',
      email: 'test@example.com',
      avatar_url: 'http://example.com/avatar.jpg',
      is_admin: false,
    };

    const token = await jwtManager.generateAccessToken(user);

    const res = await app.request('/test-auth', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
  });

  it('should reject unauthenticated request', async () => {
    const res = await app.request('/test-auth');

    expect(res.status).toBe(401);
  });
});
```

**驗證：**

- [ ] 整合測試通過

---

### Task 3.12: 更新類型定義

**狀態：** ⬜ 待辦

**說明：** 在 src/types/index.ts 中添加 Session 相關類型

**實現內容：**

```typescript
export interface Session {
  id: string;
  user_id: number;
  data: Record<string, unknown>;
  expires_at: string;
  created_at: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  user: User;
  tokens: TokenResponse;
  session_id: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token?: string;
  session_id?: string;
}
```

**驗證：**

- [ ] 類型定義完整

---

### Task 3.13: 更新錯誤處理

**狀態：** ⬜ 待辦

**說明：** 在 src/lib/errors.ts 中添加認證相關錯誤

**實現內容：**

```typescript
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  OAUTH_ERROR: 'OAUTH_ERROR',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
} as const;

export const Errors = {
  // ... existing errors

  oauth: (message: string) => new AppError(500, ErrorCodes.OAUTH_ERROR, message),

  invalidToken: () => new AppError(401, ErrorCodes.INVALID_TOKEN, 'Invalid token'),

  tokenExpired: () => new AppError(401, ErrorCodes.TOKEN_EXPIRED, 'Token expired'),
};
```

**驗證：**

- [ ] 錯誤類型完整

---

### Task 3.14: 更新 README 文檔

**狀態：** ⬜ 待辦

**說明：** 在 README.md 中添加認證相關說明

**實現內容：**

```markdown
## 認證

### OAuth 登入流程

1. 獲取 OAuth 授權 URL
```

GET /auth/:provider

```

2. 用戶授權後，系統回調
```

GET /auth/:provider/callback?code=...

```

3. 返回 JWT token 和 session

### JWT Token

- **Access Token**: 15 分鐘過期
- **Refresh Token**: 7 天過期

### 使用 Token

在請求頭中添加 Authorization：
```

Authorization: Bearer <access_token>

```

### 刷新 Token

```

POST /auth/refresh
{
"refresh_token": "<refresh_token>"
}

```

### 登出

```

POST /auth/logout
{
"refresh_token": "<refresh_token>",
"session_id": "<session_id>"
}

```

```

**驗證：**

- [ ] 文檔完整

---

### Task 3.15: 最終驗證

**狀態：** ⬜ 待辦

**說明：** 完成所有任務的最終驗證

**驗證清單：**

```bash
# 1. TypeScript 編譯
npm run typecheck

# 2. 執行測試
npm run test

# 3. Lint 檢查
npm run lint

# 4. 本地開發服務器
npm run dev

# 5. 測試 OAuth 流程
curl http://localhost:8787/auth/facebook
```

**預期結果：**

- ✅ TypeScript 編譯無錯誤
- ✅ 所有測試通過
- ✅ Lint 無警告
- ✅ OAuth 端點可訪問
- ✅ JWT 生成和驗證正常

---

## 🎯 階段 3 完成標準

當以下所有項目都完成時，階段 3 視為完成：

- [ ] 所有 15 個任務已完成
- [ ] JWT 系統完整實現
- [ ] OAuth 登入功能正常
- [ ] Session 管理功能正常
- [ ] 認證 Middleware 正常工作
- [ ] 所有測試通過
- [ ] 測試覆蓋率 > 80%

---

## 📝 備註

1. **Session 存儲**: 使用 D1 而非 KV，因為 D1 支持更複雜的查詢
2. **Token 旋轉**: 刷新 token 時會生成新的 refresh token
3. **安全考慮**:
   - JWT Secret 必須至少 32 個字符
   - Refresh token 存儲在資料庫中
   - 過期 session 自動清理

---

## 🚀 下一階段

完成階段 3 後，可以進入：

**階段 4：API 路由實現**

- Admin 路由
- User 路由
- Organizer 路由
- Review 路由

---

**更新日期：** 2026-01-16
**當前進度：** 15/15 任務完成 ✅
**狀態：** 已完成

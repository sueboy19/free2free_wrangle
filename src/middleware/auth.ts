import type { Context, Next } from 'hono';
import { JWTManager } from '../lib/jwt';
import { Errors } from '../lib/errors';

export const authMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Errors.unauthorized('Authentication required');
    }

    const token = authHeader.substring(7);

    const jwtManager = new JWTManager(c.env.JWT_SECRET);
    const payload = await jwtManager.verifyAccessToken(token);

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(Number(payload.user_id))
      .first();

    if (!user) {
      throw Errors.notFound('User');
    }

    c.set('user' as never, {
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
    // 如果錯誤訊息包含 'token'，返回無效 token 錯誤
    if (error instanceof Error && error.message.includes('token')) {
      throw Errors.invalidToken();
    }
    throw error;
  }
};

export const adminAuthMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  await authMiddleware(c, async () => {});

  const user = c.get('user' as never);

  if (!user || !(user as any).is_admin) {
    throw new Error('Admin access required');
  }

  await next();
};

export const organizerAuthMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  await authMiddleware(c, async () => {});
  await next();
};

export const reviewAuthMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  await authMiddleware(c, async () => {});
  await next();
};

export const optionalAuthMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const jwtManager = new JWTManager(c.env.JWT_SECRET);
      const payload = await jwtManager.verifyAccessToken(token);

      const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
        .bind(Number(payload.user_id))
        .first();

      if (user) {
        c.set('user' as never, {
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
  } catch {
    // Ignore errors in optional auth
  }

  await next();
};

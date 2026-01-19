import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import userRoutes from './routes/user';
import organizerRoutes from './routes/organizer';
import reviewRoutes from './routes/review';

/**
 * 自定義 logger - 只記錄請求，不記錄可控錯誤
 */
function customLogger() {
  return async (c: any, next: any) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;

    // 檢查是否為可控錯誤（validation/business logic errors）
    // 這些錯誤返回 200 並在 body 中有 error 欄位
    const resClone = c.res.clone();
    const body = await resClone.text();
    const isValidationError = c.res.status === 200 && body.includes('"error"');

    // 只有非錯誤響應才記錄
    if (!isValidationError) {
      const status = c.res.status;
      const method = c.req.method;
      const url = c.req.url;
      console.log(`${status} ${method} ${url} ${ms}ms`);
    }
  };
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', customLogger());
app.use('*', async (c, next) => {
  const corsOrigins = c.env.CORS_ORIGINS || 'http://localhost:3000';
  const corsConfig = cors({
    origin: corsOrigins.split(','),
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
    maxAge: 86400,
  });
  return corsConfig(c, next);
});

// Custom error handler
app.onError((err, c) => {
  return c.json({
    error: err.message,
    code: 'ERROR',
  });
});

app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'Free2Free API is running',
    timestamp: new Date().toISOString(),
  });
});

app.route('/', authRoutes);
app.route('/', adminRoutes);
app.route('/', userRoutes);
app.route('/', organizerRoutes);
app.route('/', reviewRoutes);

export default app;

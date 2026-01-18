import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
  test: {
    root: './',
    include: ['test/**/*.test.ts'],
    poolOptions: {
      workers: {
        miniflare: {
          compatibilityDate: '2024-01-01',
          compatibilityFlags: ['nodejs_compat'],
          bindings: {
            DB: {
              type: 'd1',
              path: './.mf/d1/miniflare-D1DatabaseObject',
            },
            KV: {
              type: 'kv',
            },
          },
          vars: {
            ENVIRONMENT: 'development',
            CORS_ORIGINS: 'http://localhost:3000,http://localhost:5173',
            BASE_URL: 'http://localhost',
            FRONTEND_URL: 'http://localhost:3000',
            JWT_SECRET: 'test-secret-key-at-least-32-characters-long',
            SESSION_KEY: 'test-session-key-at-least-32-characters-long',
            FACEBOOK_KEY: 'test',
            FACEBOOK_SECRET: 'test',
            INSTAGRAM_KEY: 'test',
            INSTAGRAM_SECRET: 'test',
          },
        },
      },
    },
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});

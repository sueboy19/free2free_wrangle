import { it, expect } from 'vitest';

it('env should be defined', async () => {
  // 尝试从 cloudflare:test 获取 env
  let SELF: any;
  try {
    SELF = await import('cloudflare:test');
  } catch (e) {
    console.log('Cannot import cloudflare:test:', e);
  }

  console.log('=== Test SELF ===');
  console.log('SELF:', SELF);
  console.log('SELF.env type:', typeof SELF.env);
  console.log('SELF.env:', SELF.env);

  // Try calling it
  let env: any;
  try {
    env = SELF.env();
  } catch (e) {
    console.log('Cannot call SELF.env():', e);
  }

  console.log('=== Test env ===');
  console.log('env:', env);
  console.log('env type:', typeof env);

  // Try accessing SELF.env directly
  console.log('=== Test SELF.env direct access ===');
  console.log('SELF.env.DB:', SELF.env?.DB);
  console.log('SELF.env.KV:', SELF.env?.KV);
  console.log('SELF.env.CORS_ORIGINS:', SELF.env?.CORS_ORIGINS);

  expect(SELF).toBeDefined();
});

import { Hono } from 'hono';
import { adminAuthMiddleware } from '../middleware/auth';
import type { CoffeePromoResponse } from '../types';

const router = new Hono<{ Bindings: Env }>();

const COFFEE_PROMO_API = 'https://coffee-promo-api-prod.ffbizs.com/promotions';
const GENERIC_STORE_LOCATION = { name: '便利商店門市', address: '各門市', latitude: 0, longitude: 0 };

// Public endpoint to get all activities (no auth required)
router.get('/activities', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT a.*, l.name as location_name, l.address as location_address, l.latitude as location_latitude, l.longitude as location_longitude,
            u.name as creator_name
     FROM activities a
     LEFT JOIN locations l ON a.location_id = l.id
     LEFT JOIN users u ON a.created_by = u.id
     ORDER BY a.id DESC`
  ).all();
  return c.json({ data: result.results || [] });
});

router.get('/activities/:id', async (c) => {
  const id = c.req.param('id');
  const activity = await c.env.DB.prepare(
    `SELECT a.*, l.name as location_name, l.address as location_address, l.latitude as location_latitude, l.longitude as location_longitude
     FROM activities a
     LEFT JOIN locations l ON a.location_id = l.id
     WHERE a.id = ?`
  )
    .bind(id)
    .first();

  if (!activity) {
    throw new Error('Activity not found');
  }

  return c.json({ data: activity });
});

// Public endpoint to get all locations (no auth required)
router.get('/locations', async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM locations ORDER BY id DESC').all();
  return c.json({ data: result.results || [] });
});

router.get('/locations/:id', async (c) => {
  const id = c.req.param('id');
  const location = await c.env.DB.prepare('SELECT * FROM locations WHERE id = ?').bind(id).first();

  if (!location) {
    throw new Error('Location not found');
  }

  return c.json({ data: location });
});

router.post('/admin/locations', adminAuthMiddleware, async (c) => {
  const body = await c.req.json();
  const { name, address, latitude, longitude } = body;

  if (!name || !address || latitude === undefined || longitude === undefined) {
    throw new Error('Missing required fields');
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO locations (name, address, latitude, longitude) VALUES (?, ?, ?, ?)`
  )
    .bind(name, address, latitude, longitude)
    .run();

  const location = await c.env.DB.prepare('SELECT * FROM locations WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return c.json({ data: location });
});

router.get('/admin/locations', adminAuthMiddleware, async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM locations ORDER BY id DESC').all();
  return c.json({ data: result.results || [], total: result.results?.length || 0 });
});

router.get('/admin/locations/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const location = await c.env.DB.prepare('SELECT * FROM locations WHERE id = ?').bind(id).first();

  if (!location) {
    throw new Error('Location not found');
  }

  return c.json({ data: location });
});

router.put('/admin/locations/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const updates: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(body)) {
    updates.push(`${key} = ?`);
    values.push(value);
  }

  if (updates.length > 0) {
    await c.env.DB.prepare(`UPDATE locations SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values, id)
      .run();
  }

  const location = await c.env.DB.prepare('SELECT * FROM locations WHERE id = ?').bind(id).first();

  return c.json({ data: location });
});

router.delete('/admin/locations/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const result = await c.env.DB.prepare('DELETE FROM locations WHERE id = ?').bind(id).run();

  return c.json({ success: (result.meta.changes || 0) > 0 });
});

router.post('/admin/activities', adminAuthMiddleware, async (c) => {
  const body = await c.req.json();
  const { title, target_count, location_id, description, store_brand, metadata } = body;

  if (!title || !target_count || !location_id) {
    throw new Error('Missing required fields');
  }

  const user = c.get('user' as never);

  const result = await c.env.DB.prepare(
    `INSERT INTO activities (title, target_count, location_id, description, created_by, store_brand, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(title, target_count, location_id, description || null, (user as any).id, store_brand || null, metadata || null)
    .run();

  const activity = await c.env.DB.prepare('SELECT * FROM activities WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return c.json({ data: activity });
});

router.get('/admin/activities', adminAuthMiddleware, async (c) => {
  const result = await c.env.DB.prepare('SELECT * FROM activities ORDER BY id DESC').all();
  return c.json({ data: result.results || [], total: result.results?.length || 0 });
});

router.get('/admin/activities/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const activity = await c.env.DB.prepare('SELECT * FROM activities WHERE id = ?').bind(id).first();

  if (!activity) {
    throw new Error('Activity not found');
  }

  return c.json({ data: activity });
});

router.put('/admin/activities/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  const updates: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(body)) {
    updates.push(`${key} = ?`);
    values.push(value);
  }

  if (updates.length > 0) {
    await c.env.DB.prepare(`UPDATE activities SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values, id)
      .run();
  }

  const activity = await c.env.DB.prepare('SELECT * FROM activities WHERE id = ?').bind(id).first();

  return c.json({ data: activity });
});

router.delete('/admin/activities/:id', adminAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const result = await c.env.DB.prepare('DELETE FROM activities WHERE id = ?').bind(id).run();

  return c.json({ success: (result.meta.changes || 0) > 0 });
});

// 批次刪除活動
router.post('/admin/activities/batch-delete', adminAuthMiddleware, async (c) => {
  const { ids } = await c.req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('請提供要刪除的活動 ID 列表');
  }

  const placeholders = ids.map(() => '?').join(',');
  await c.env.DB.prepare(`DELETE FROM match_participants WHERE match_id IN (SELECT id FROM matches WHERE activity_id IN (${placeholders}))`)
    .bind(...ids).run();
  await c.env.DB.prepare(`DELETE FROM matches WHERE activity_id IN (${placeholders})`)
    .bind(...ids).run();
  const result = await c.env.DB.prepare(`DELETE FROM activities WHERE id IN (${placeholders})`)
    .bind(...ids).run();

  return c.json({ success: true, deleted: result.meta.changes || 0 });
});

// 匯入咖啡促銷
router.post('/admin/import-coffee-promotions', adminAuthMiddleware, async (c) => {
  const user = c.get('user' as never);

  // 1. 從外部 API 取得資料
  const response = await fetch(COFFEE_PROMO_API);
  if (!response.ok) {
    throw new Error('無法取得咖啡促銷資料');
  }
  const promoData = (await response.json()) as CoffeePromoResponse;

  // 2. 確保通用門市 Location 存在
  let locationResult = await c.env.DB.prepare(
    'SELECT id FROM locations WHERE name = ? LIMIT 1'
  ).bind(GENERIC_STORE_LOCATION.name).first<{ id: number }>();

  let locationId: number;
  if (!locationResult) {
    const insertResult = await c.env.DB.prepare(
      'INSERT INTO locations (name, address, latitude, longitude) VALUES (?, ?, ?, ?)'
    ).bind(
      GENERIC_STORE_LOCATION.name,
      GENERIC_STORE_LOCATION.address,
      GENERIC_STORE_LOCATION.latitude,
      GENERIC_STORE_LOCATION.longitude
    ).run();
    locationId = insertResult.meta.last_row_id;
  } else {
    locationId = locationResult.id;
  }

  // 3. 提取所有咖啡類別 items（只匯入含「送」的優惠）
  const items: { store_brand: string; item: any }[] = [];
  for (const [storeBrand, categories] of Object.entries(promoData.data)) {
    const coffeeCategory = categories['coffee'];
    if (coffeeCategory?.items) {
      for (const item of coffeeCategory.items) {
        const name = item.product_name || '';
        const dealType = item.deal_type || '';
        if (name.includes('送') || dealType.includes('送')) {
          items.push({ store_brand: storeBrand, item });
        }
      }
    }
  }

  // 4. 逐筆建立 Activity（跳過已存在的）
  let created = 0;
  let skipped = 0;

  for (const { store_brand, item } of items) {
    // 檢查是否已存在
    const existing = await c.env.DB.prepare(
      `SELECT id FROM activities WHERE store_brand = ? AND JSON_EXTRACT(metadata, '$.product_name') = ? LIMIT 1`
    ).bind(store_brand, item.product_name).first();

    if (existing) {
      skipped++;
      continue;
    }

    const title = `[${store_brand}] ${item.product_name}`;
    const metadata = JSON.stringify({
      product_name: item.product_name,
      deal_type: item.deal_type,
      deal_category: item.deal_category,
      source_url: item.source_url,
      product_category: item.product_category,
      external_id: item.id,
    });

    await c.env.DB.prepare(
      `INSERT INTO activities (title, target_count, location_id, description, created_by, store_brand, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      title,
      2,
      locationId,
      item.product_name,
      (user as any).id,
      store_brand,
      metadata
    ).run();

    created++;
  }

  return c.json({
    data: {
      total: items.length,
      created,
      skipped,
    }
  });
});

export default router;

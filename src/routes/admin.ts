import { Hono } from 'hono';
import { adminAuthMiddleware } from '../middleware/auth';

const router = new Hono<{ Bindings: Env }>();

// Public endpoint to get all activities (no auth required)
router.get('/activities', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT a.*, l.name as location_name, l.address as location_address, l.latitude as location_latitude, l.longitude as location_longitude
     FROM activities a
     LEFT JOIN locations l ON a.location_id = l.id
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
  const { title, target_count, location_id, description } = body;

  if (!title || !target_count || !location_id) {
    throw new Error('Missing required fields');
  }

  const user = c.get('user' as never);

  const result = await c.env.DB.prepare(
    `INSERT INTO activities (title, target_count, location_id, description, created_by)
       VALUES (?, ?, ?, ?, ?)`
  )
    .bind(title, target_count, location_id, description || null, (user as any).id)
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

export default router;

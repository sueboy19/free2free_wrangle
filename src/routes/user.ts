import { Hono } from 'hono';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import type { Env } from '../types';

const router = new Hono<{ Bindings: Env }>();

router.get('/matches', optionalAuthMiddleware, async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT * FROM matches WHERE status = ? AND match_time > datetime('now') ORDER BY match_time ASC`
  )
    .bind('open')
    .all();

  return c.json({ data: result.results || [] });
});

router.get('/user/matches', authMiddleware, async (c) => {
  const user = c.get('user' as never);
  const status = c.req.query('status') || 'completed';

  const result = await c.env.DB.prepare(
    `SELECT DISTINCT m.* FROM matches m
     JOIN match_participants mp ON m.id = mp.match_id
     WHERE mp.user_id = ? AND m.status = ?
     ORDER BY m.match_time DESC`
  )
    .bind((user as any).id, status)
    .all();

  return c.json({ data: result.results || [] });
});

router.get('/matches/:id', optionalAuthMiddleware, async (c) => {
  const id = c.req.param('id');

  const currentUser = (c as any).get('user');

  const row = await c.env.DB.prepare(
    `
    SELECT
      m.*,
      a.title as activity_title,
      a.description as activity_description,
      a.target_count as activity_target_count,
      l.id as location_id,
      l.name as location_name,
      l.address as location_address,
      l.latitude as location_latitude,
      l.longitude as location_longitude,
      u.name as organizer_name
    FROM matches m
    JOIN activities a ON m.activity_id = a.id
    LEFT JOIN locations l ON a.location_id = l.id
    JOIN users u ON m.organizer_id = u.id
    WHERE m.id = ?
    `
  )
    .bind(id)
    .first();

  if (!row) {
    throw new Error('Match not found');
  }

  let userParticipation = null;
  if (currentUser) {
    const participation = await c.env.DB.prepare(
      'SELECT * FROM match_participants WHERE match_id = ? AND user_id = ?'
    )
      .bind(id, currentUser.id)
      .first();
    userParticipation = participation;
  }

  const match = {
    id: row.id,
    activity_id: row.activity_id,
    organizer_id: row.organizer_id,
    match_time: row.match_time,
    status: row.status,
    activity: {
      id: row.activity_id,
      title: row.activity_title,
      description: row.activity_description,
      target_count: row.activity_target_count,
      location: row.location_id
        ? {
            id: row.location_id,
            name: row.location_name,
            address: row.location_address,
            latitude: row.location_latitude,
            longitude: row.location_longitude,
          }
        : null,
    },
    organizer: {
      id: row.organizer_id,
      name: row.organizer_name,
    },
    user_participation: userParticipation
      ? {
          id: userParticipation.id,
          status: userParticipation.status,
        }
      : null,
  };

  return c.json({ data: match });
});

router.get('/matches/:id/participants', async (c) => {
  const id = c.req.param('id');

  const currentUser = (c as any).get('user');

  const result = await c.env.DB.prepare(
    `
    SELECT
      mp.*,
      m.organizer_id as match_organizer_id,
      u.name as user_name,
      u.email as user_email,
      u.avatar_url as user_avatar_url
    FROM match_participants mp
    JOIN users u ON mp.user_id = u.id
    JOIN matches m ON mp.match_id = m.id
    WHERE mp.match_id = ?
    ORDER BY mp.id DESC
    `
  )
    .bind(id)
    .all();

  const match = await c.env.DB.prepare('SELECT organizer_id FROM matches WHERE id = ?')
    .bind(id)
    .first();

  const isOrganizer = currentUser && match ? currentUser.id === (match as any).organizer_id : false;

  const participants = (result.results || []).map((row: any) => ({
    id: row.id,
    match_id: row.match_id,
    user_id: row.user_id,
    status: row.status,
    joined_at: row.joined_at,
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      avatar_url: row.user_avatar_url,
    },
  }));

  return c.json({
    data: isOrganizer ? participants : participants.filter((p: any) => p.status === 'pending'),
    is_organizer: isOrganizer,
  });
});

router.get('/matches/:id/reviews', async (c) => {
  const id = c.req.param('id');
  const result = await c.env.DB.prepare(
    'SELECT * FROM reviews WHERE match_id = ? ORDER BY created_at DESC'
  )
    .bind(id)
    .all();

  return c.json({ data: result.results || [] });
});

router.get('/matches/:id/participation-status', optionalAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const currentUser = (c as any).get('user');

  if (!currentUser) {
    return c.json({ has_participated: false, participation_status: null });
  }

  const participation = await c.env.DB.prepare(
    'SELECT * FROM match_participants WHERE match_id = ? AND user_id = ?'
  )
    .bind(id, currentUser.id)
    .first();

  return c.json({
    has_participated: !!participation,
    participation_status: participation?.status || null,
  });
});

export default router;

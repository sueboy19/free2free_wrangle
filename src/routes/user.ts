import { Hono } from 'hono';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import type { Env } from '../types';

const router = new Hono<{ Bindings: Env }>();

router.get('/matches', optionalAuthMiddleware, async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT
       m.id as id,
       m.activity_id,
       m.organizer_id,
       m.match_time,
       m.status,
       a.id as activity_db_id,
       a.title,
       a.target_count,
       a.description,
       a.created_by,
       a.location_id,
       l.id as location_db_id,
       l.name as location_name,
       l.address as location_address,
       l.latitude as location_latitude,
       l.longitude as location_longitude,
       u.name as organizer_name
     FROM matches m
     LEFT JOIN activities a ON m.activity_id = a.id
     LEFT JOIN locations l ON a.location_id = l.id
     LEFT JOIN users u ON m.organizer_id = u.id
     WHERE m.status = ? AND m.match_time > datetime('now')
     ORDER BY m.match_time ASC`
  )
    .bind('open')
    .all();

  // Flatten result to include activity object
  const flattenedMatches = (result.results || []).map((match: any) => ({
    id: match.id,
    activity_id: match.activity_id,
    organizer_id: match.organizer_id,
    match_time: match.match_time,
    status: match.status,
    activity: {
      id: match.activity_db_id,
      title: match.title,
      target_count: match.target_count,
      description: match.description,
      location: {
        id: match.location_db_id,
        name: match.location_name,
        address: match.location_address,
        latitude: match.location_latitude,
        longitude: match.location_longitude,
      },
      created_by: match.created_by,
    },
    organizer: match.organizer_name
      ? {
          id: match.organizer_id,
          name: match.organizer_name,
        }
      : undefined,
  }));

  return c.json({ data: flattenedMatches });
});

router.get('/user/matches', authMiddleware, async (c) => {
  const user = c.get('user' as never) as any;
  if (!user?.id) {
    throw new Error('User not found');
  }
  const status = c.req.query('status') || 'completed';

  const result = await c.env.DB.prepare(
    `SELECT DISTINCT
       m.id as id,
       m.activity_id,
       m.organizer_id,
       m.match_time,
       m.status,
       a.id as activity_db_id,
       a.title,
       a.target_count,
       a.description,
       a.created_by,
       a.location_id,
       l.id as location_db_id,
       l.name as location_name,
       l.address as location_address,
       l.latitude as location_latitude,
       l.longitude as location_longitude,
       u.name as organizer_name
      FROM matches m
      JOIN match_participants mp ON m.id = mp.match_id
      LEFT JOIN activities a ON m.activity_id = a.id
      LEFT JOIN locations l ON a.location_id = l.id
      LEFT JOIN users u ON m.organizer_id = u.id
      WHERE mp.user_id = ? AND m.status = ?
      ORDER BY m.match_time DESC`
  )
    .bind(user.id, status)
    .all();

  // Flatten result to include nested activity object
  const flattenedMatches = (result.results || []).map((match: any) => ({
    id: match.id,
    activity_id: match.activity_id,
    organizer_id: match.organizer_id,
    match_time: match.match_time,
    status: match.status,
    activity: {
      id: match.activity_db_id,
      title: match.title,
      target_count: match.target_count,
      description: match.description,
      location: {
        id: match.location_db_id,
        name: match.location_name,
        address: match.location_address,
        latitude: match.location_latitude,
        longitude: match.location_longitude,
      },
      created_by: match.created_by,
    },
    organizer: match.organizer_name
      ? {
          id: match.organizer_id,
          name: match.organizer_name,
        }
      : undefined,
  }));

  return c.json({ data: flattenedMatches });
});

router.get('/matches/:id', optionalAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const result = await c.env.DB.prepare(
    `SELECT
       m.id as id,
       m.activity_id,
       m.organizer_id,
       m.match_time,
       m.status,
       a.id as activity_db_id,
       a.title,
       a.target_count,
       a.description,
       a.created_by,
       a.location_id,
       l.id as location_db_id,
       l.name as location_name,
       l.address as location_address,
       l.latitude as location_latitude,
       l.longitude as location_longitude,
       u.name as organizer_name
     FROM matches m
     LEFT JOIN activities a ON m.activity_id = a.id
     LEFT JOIN locations l ON a.location_id = l.id
     LEFT JOIN users u ON m.organizer_id = u.id
     WHERE m.id = ?`
  )
    .bind(id)
    .first();

  if (!result) {
    throw new Error('Match not found');
  }

  // Flatten result to include nested activity object
  const flattenedMatch = {
    id: result.id,
    activity_id: result.activity_id,
    organizer_id: result.organizer_id,
    match_time: result.match_time,
    status: result.status,
    target_count: result.target_count,
    location_id: result.location_db_id,
    location_name: result.location_name,
    location_address: result.location_address,
    location_latitude: result.location_latitude,
    location_longitude: result.location_longitude,
    created_by: result.created_by,
    organizer_name: result.organizer_name,
    activity: {
      id: result.activity_db_id,
      title: result.title,
      description: result.description,
      target_count: result.target_count,
      location: {
        id: result.location_db_id,
        name: result.location_name,
        address: result.location_address,
      },
    },
  };

  return c.json({ data: flattenedMatch });
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

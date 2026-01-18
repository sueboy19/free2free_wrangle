import { Hono } from 'hono';
import { authMiddleware, organizerAuthMiddleware } from '../middleware/auth';
import type { Env } from '../types';

const router = new Hono<{ Bindings: Env }>();

router.post('/matches', authMiddleware, async (c) => {
  const user = c.get('user' as never);
  const body = await c.req.json();
  const { activity_id, match_time } = body;

  if (!activity_id || !match_time) {
    throw new Error('Missing required fields');
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO matches (activity_id, organizer_id, match_time, status)
     VALUES (?, ?, ?, 'open')`
  )
    .bind(activity_id, (user as any).id, match_time)
    .run();

  const match = await c.env.DB.prepare('SELECT * FROM matches WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return c.json({ data: match });
});

router.put('/matches/:id/status', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { status } = body;

  if (!['open', 'completed', 'cancelled'].includes(status)) {
    throw new Error('Invalid status');
  }

  await c.env.DB.prepare('UPDATE matches SET status = ? WHERE id = ?').bind(status, id).run();

  const match = await c.env.DB.prepare('SELECT * FROM matches WHERE id = ?').bind(id).first();

  return c.json({ data: match });
});

router.post('/matches/:id/join', authMiddleware, async (c) => {
  const user = c.get('user' as never);
  const matchIdParam = c.req.param('id');
  const matchId = parseInt(matchIdParam);

  if (!matchId || isNaN(matchId)) {
    throw new Error('無效的配對 ID');
  }

  const userId = (user as any).id;

  // Check match exists and get details (JOIN with activities to get target_count)
  const match = await c.env.DB.prepare(
    `SELECT m.*, a.target_count FROM matches m
     JOIN activities a ON m.activity_id = a.id
     WHERE m.id = ?`
  )
    .bind(matchId)
    .first();

  if (!match) {
    throw new Error('配對不存在');
  }

  if ((match as any).status !== 'open') {
    throw new Error('配對未開放，無法參與');
  }

  if ((match as any).organizer_id === userId) {
    throw new Error('開局者不能參與自己的配對');
  }

  // Check if user already participated
  const existingParticipant = await c.env.DB.prepare(
    'SELECT * FROM match_participants WHERE match_id = ? AND user_id = ?'
  )
    .bind(matchId, userId)
    .first();

  if (existingParticipant) {
    throw new Error('您已經參與過此配對');
  }

  // Check capacity (target_count)
  const currentParticipants = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM match_participants WHERE match_id = ? AND status != ?'
  )
    .bind(matchId, 'rejected')
    .first();

  const maxParticipants = (match as any).target_count || 0;
  const currentCount = (currentParticipants as any)?.count || 0;

  if (currentCount >= maxParticipants) {
    throw new Error(`配對已滿員（${maxParticipants}人）`);
  }

  // Insert participant (no transaction support in D1, but check again to prevent duplicates)
  const result = await c.env.DB.prepare(
    `INSERT INTO match_participants (match_id, user_id, status, joined_at)
       VALUES (?, ?, 'pending', datetime('now'))`
  )
    .bind(matchId, userId)
    .run();

  const participant = await c.env.DB.prepare('SELECT * FROM match_participants WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return c.json({ data: participant });
});

router.put('/matches/:matchId/participants/:participantId', organizerAuthMiddleware, async (c) => {
  const participantId = c.req.param('participantId');
  const matchIdParam = c.req.param('matchId');
  const matchId = parseInt(matchIdParam);
  const body = await c.req.json();
  const { status } = body;

  if (!['approved', 'rejected'].includes(status)) {
    throw new Error('Invalid status');
  }

  // Verify match exists and is still open (JOIN with activities to get target_count)
  const match = await c.env.DB.prepare(
    `SELECT m.*, a.target_count FROM matches m
     JOIN activities a ON m.activity_id = a.id
     WHERE m.id = ?`
  )
    .bind(matchId)
    .first();

  if (!match) {
    throw new Error('配對不存在');
  }

  if ((match as any).status !== 'open') {
    throw new Error('配對已關閉或已完成，無法審核');
  }

  // Verify participant exists
  const participant = await c.env.DB.prepare(
    'SELECT * FROM match_participants WHERE id = ? AND match_id = ?'
  )
    .bind(participantId, matchId)
    .first();

  if (!participant) {
    throw new Error('參與者不存在');
  }

  // Check capacity before approving
  if (status === 'approved') {
    const currentApproved = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM match_participants WHERE match_id = ? AND status = ?'
    )
      .bind(matchId, 'approved')
      .first();

    const maxParticipants = (match as any).target_count || 0;
    const currentApprovedCount = (currentApproved as any)?.count || 0;

    if (currentApprovedCount >= maxParticipants) {
      throw new Error(`配對已滿員，無法批准更多參與者（最大${maxParticipants}人）`);
    }
  }

  await c.env.DB.prepare('UPDATE match_participants SET status = ? WHERE id = ?')
    .bind(status, participantId)
    .run();

  const updatedParticipant = await c.env.DB.prepare('SELECT * FROM match_participants WHERE id = ?')
    .bind(participantId)
    .first();

  return c.json({ data: updatedParticipant });
});

router.delete('/matches/:id/join', authMiddleware, async (c) => {
  const user = c.get('user' as never);
  const matchId = c.req.param('id');

  const result = await c.env.DB.prepare(
    'DELETE FROM match_participants WHERE match_id = ? AND user_id = ?'
  )
    .bind(matchId, (user as any).id)
    .run();

  return c.json({ success: (result.meta.changes || 0) > 0 });
});

export default router;

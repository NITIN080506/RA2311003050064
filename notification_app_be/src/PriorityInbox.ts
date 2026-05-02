import './env'
import { Pool } from 'pg'
import express from 'express'
import Log from 'logging-middleware'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const router = express.Router()

router.get('/notifications/priority', async (req, res) => {
  const studentId = req.query.studentId
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100)

  if (!studentId) {
    return res.status(400).json({ error: 'studentId required' })
  }

  try {
    const client = await pool.connect()
    try {
      const query = `
        SELECT id, notification_type, title, message, is_read, priority, metadata, created_at,
          (
            CASE notification_type
              WHEN 'Placement' THEN 3
              WHEN 'Result' THEN 2
              WHEN 'Event' THEN 1
              ELSE 0
            END
            + (1.0 / (EXTRACT(EPOCH FROM (now() - created_at))/3600 + 1))
          ) AS score
        FROM notifications
        WHERE student_id = $1
          AND is_read = false
        ORDER BY score DESC, created_at DESC
        LIMIT $2
      `
      const result = await client.query(query, [studentId, limit])
      await Log('backend', 'info', 'service', `fetched priority inbox for student ${studentId}: ${result.rowCount} rows`)
      res.status(200).json({
        notifications: result.rows.map((row) => ({
          id: row.id,
          studentId: row.student_id,
          type: row.notification_type,
          title: row.title,
          message: row.message,
          isRead: row.is_read,
          priority: row.priority,
          metadata: row.metadata,
          createdAt: row.created_at,
          score: parseFloat(row.score)
        }))
      })
    } finally {
      client.release()
    }
  } catch (err) {
    await Log('backend', 'error', 'service', `priority inbox query failed: ${(err as any).message}`)
    res.status(500).json({ error: 'internal' })
  }
})

export default router

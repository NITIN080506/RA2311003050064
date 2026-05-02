import { Pool } from 'pg'
import express from 'express'
import Log from 'logging-middleware'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const router = express.Router()

router.get('/notifications', async (req, res) => {
  const studentId = req.query.studentId
  const page = parseInt(req.query.page as string) || 1
  const pageSize = parseInt(req.query.pageSize as string) || 20
  const onlyUnread = req.query.onlyUnread === 'true'

  if (!studentId) {
    return res.status(400).json({ error: 'studentId required' })
  }

  try {
    const client = await pool.connect()
    try {
      const offset = (page - 1) * pageSize

      let whereClause = 'WHERE student_id = $1'
      const params: any[] = [studentId]
      if (onlyUnread) {
        whereClause += ' AND is_read = false'
      }

      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
        params
      )
      const total = parseInt(countResult.rows[0].total)

      const result = await client.query(
        `SELECT id, notification_type, title, message, is_read, priority, metadata, created_at
         FROM notifications ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, pageSize, offset]
      )

      await Log('backend', 'info', 'service', `listed notifications for student ${studentId}: page ${page}`)
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
          createdAt: row.created_at
        })),
        page,
        pageSize,
        total
      })
    } finally {
      client.release()
    }
  } catch (err) {
    await Log('backend', 'error', 'service', `list notifications failed: ${(err as any).message}`)
    res.status(500).json({ error: 'internal' })
  }
})

router.get('/notifications/:id', async (req, res) => {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ error: 'id required' })
  }

  try {
    const client = await pool.connect()
    try {
      const result = await client.query(
        'SELECT id, student_id, notification_type, title, message, is_read, priority, metadata, created_at FROM notifications WHERE id = $1',
        [id]
      )

      if (result.rowCount === 0) {
        await Log('backend', 'warn', 'service', `notification not found: ${id}`)
        return res.status(404).json({ error: 'not found' })
      }

      const row = result.rows[0]
      res.status(200).json({
        id: row.id,
        studentId: row.student_id,
        type: row.notification_type,
        title: row.title,
        message: row.message,
        isRead: row.is_read,
        priority: row.priority,
        metadata: row.metadata,
        createdAt: row.created_at
      })
    } finally {
      client.release()
    }
  } catch (err) {
    await Log('backend', 'error', 'service', `get notification failed: ${(err as any).message}`)
    res.status(500).json({ error: 'internal' })
  }
})

router.patch('/notifications/:id/read', async (req, res) => {
  const { id } = req.params
  const { isRead } = req.body

  if (!id || isRead === undefined) {
    return res.status(400).json({ error: 'id and isRead required' })
  }

  try {
    const client = await pool.connect()
    try {
      const result = await client.query(
        'UPDATE notifications SET is_read = $1, updated_at = now() WHERE id = $2 RETURNING id, student_id, notification_type, title, message, is_read, priority, metadata, created_at',
        [isRead, id]
      )

      if (result.rowCount === 0) {
        await Log('backend', 'warn', 'service', `notification not found for update: ${id}`)
        return res.status(404).json({ error: 'not found' })
      }

      const row = result.rows[0]
      await Log('backend', 'info', 'service', `marked notification ${id} as ${isRead ? 'read' : 'unread'}`)
      res.status(200).json({
        id: row.id,
        studentId: row.student_id,
        type: row.notification_type,
        title: row.title,
        message: row.message,
        isRead: row.is_read,
        priority: row.priority,
        metadata: row.metadata,
        createdAt: row.created_at
      })
    } finally {
      client.release()
    }
  } catch (err) {
    await Log('backend', 'error', 'service', `mark read failed: ${(err as any).message}`)
    res.status(500).json({ error: 'internal' })
  }
})

router.post('/notifications', async (req, res) => {
  const { studentId, type, title, message, metadata, priority } = req.body

  if (!studentId || !type || !title || !message) {
    return res.status(400).json({ error: 'studentId, type, title, message required' })
  }

  try {
    const client = await pool.connect()
    try {
      const result = await client.query(
        'INSERT INTO notifications (student_id, notification_type, title, message, priority, metadata) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at',
        [studentId, type, title, message, priority || 0, metadata || null]
      )

      const row = result.rows[0]
      await Log('backend', 'info', 'service', `created notification ${row.id} for student ${studentId}`)
      res.status(201).json({
        id: row.id,
        createdAt: row.created_at
      })
    } finally {
      client.release()
    }
  } catch (err) {
    await Log('backend', 'error', 'service', `create notification failed: ${(err as any).message}`)
    res.status(500).json({ error: 'internal' })
  }
})

export default router

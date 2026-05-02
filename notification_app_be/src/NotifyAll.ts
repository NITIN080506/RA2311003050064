import { Pool } from 'pg'
import express from 'express'
import Log from 'logging-middleware'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const router = express.Router()

router.post('/notify_all', async (req, res) => {
  const { studentIds, type, title, message, metadata } = req.body
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'studentIds required' })
  }
  try {
    const payload = { studentIds, type, title, message, metadata }
    const client = await pool.connect()
    try {
      const r = await client.query(
        'INSERT INTO notify_jobs (payload) VALUES ($1) RETURNING id',
        [payload]
      )
      const jobId = r.rows[0].id
      await Log('backend', 'info', 'handler', `enqueued notify_all job ${jobId}`)
      res.status(202).json({ jobId })
    } finally {
      client.release()
    }
  } catch (err) {
    await Log('backend', 'error', 'handler', `failed to enqueue notify_all: ${(err as any).message}`)
    res.status(500).json({ error: 'internal' })
  }
})

export default router

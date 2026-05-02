import { Pool } from 'pg'
import Log from 'logging-middleware'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const MAX_ATTEMPTS = 5
const CHUNK_SIZE_DEFAULT = 500

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function processJob(job: any) {
  const client = await pool.connect()
  try {
    const payload = job.payload
    const studentIds: number[] = payload.studentIds || []
    const batchSize = job.batch_size || CHUNK_SIZE_DEFAULT
    for (let i = 0; i < studentIds.length; i += batchSize) {
      const chunk = studentIds.slice(i, i + batchSize)
      const values: any[] = []
      const placeholders: string[] = []
      let idx = 1
      for (const sid of chunk) {
        values.push(sid, payload.type || 'Event', payload.title || '', payload.message || '', 0, payload.metadata || null)
        placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`)
      }
      const insertSql = `INSERT INTO notifications (student_id, notification_type, title, message, priority, metadata) VALUES ${placeholders.join(', ')} RETURNING id, student_id, created_at`
      try {
        await client.query('BEGIN')
        const r = await client.query(insertSql, values)
        await client.query('COMMIT')
        for (const row of r.rows) {
          await Log('backend', 'info', 'service', `created notification ${row.id} for ${row.student_id}`)
        }
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
    }
    const now = new Date()
    await client.query('UPDATE notify_jobs SET status = $1, finished_at = $2, updated_at = $2 WHERE id = $3', ['completed', now.toISOString(), job.id])
  } finally {
    client.release()
  }
}

async function workerLoop() {
  const client = await pool.connect()
  try {
    while (true) {
      const q = `SELECT id, payload, attempts, batch_size FROM notify_jobs WHERE status = 'pending' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED`
      await client.query('BEGIN')
      const r = await client.query(q)
      if (r.rowCount === 0) {
        await client.query('COMMIT')
        await sleep(1000)
        continue
      }
      const job = r.rows[0]
      await client.query('UPDATE notify_jobs SET status = $1, started_at = now(), updated_at = now() WHERE id = $2', ['processing', job.id])
      await client.query('COMMIT')
      try {
        await processJob(job)
      } catch (err) {
        await Log('backend', 'error', 'service', `job ${job.id} failed: ${(err as any).message}`)
        const attempts = (job.attempts || 0) + 1
        const client2 = await pool.connect()
        try {
          if (attempts >= MAX_ATTEMPTS) {
            await client2.query('BEGIN')
            await client2.query('UPDATE notify_jobs SET status = $1, attempts = $2, updated_at = now() WHERE id = $3', ['failed', attempts, job.id])
            await client2.query('INSERT INTO notify_job_errors (job_id, error) VALUES ($1, $2)', [job.id, (err as any).message])
            await client2.query('COMMIT')
          } else {
            await client2.query('BEGIN')
            await client2.query('UPDATE notify_jobs SET attempts = $1, status = $2, updated_at = now() WHERE id = $3', [attempts, 'pending', job.id])
            await client2.query('COMMIT')
            const backoffMs = Math.min(60000, 1000 * Math.pow(2, attempts))
            await sleep(backoffMs)
          }
        } finally {
          client2.release()
        }
      }
    }
  } finally {
    client.release()
  }
}

if (require.main === module) {
  Log('backend', 'info', 'service', 'starting notify_all worker').catch(() => {})
  workerLoop().catch(async (err) => {
    await Log('backend', 'fatal', 'service', `worker crashed: ${(err as any).message}`)
    process.exit(1)
  })
}

import './env'
import express from 'express'
import Log from 'logging-middleware'
import notifyAllRouter from './NotifyAll'
import priorityInboxRouter from './PriorityInbox'
import notificationsRouter from './Notifications'

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

app.use(notificationsRouter)
app.use(notifyAllRouter)
app.use(priorityInboxRouter)

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`notifications service started on port ${PORT}`)
  Log('backend', 'info', 'service', `notifications service started on port ${PORT}`).catch(() => {})
})

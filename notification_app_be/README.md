# Notification System Backend

Campus notification microservice with logging middleware integration, async job processing, and Priority Inbox.

## Setup

Install dependencies:

```bash
npm install
```

Configure environment:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/notifications_db"
export LOG_ENDPOINT="http://20.207.122.201/evaluation-service/logs"
export LOG_API_KEY="your_token_here"
```

Create database and run migrations:

```bash
psql -U postgres -c "CREATE DATABASE notifications_db;"
psql -U postgres -d notifications_db -f migrations/JobsNotify.sql
```

Optional: Add score column for Priority Inbox optimization:

```bash
psql -U postgres -d notifications_db -f migrations/ScoreColumn.sql
```

## Build

```bash
npm run build
```

## Run

Start API server:

```bash
npm start
```

Start background worker:

```bash
npm run worker
```

## Endpoints

- GET `/notifications?studentId=<id>&page=<n>&pageSize=<m>&onlyUnread=true|false` — list notifications
- GET `/notifications/:id` — get single notification
- PATCH `/notifications/:id/read` — mark read/unread
- POST `/notifications` — create notification
- POST `/notify_all` — enqueue bulk job (returns 202 with jobId)
- GET `/notifications/priority?studentId=<id>&limit=10` — top-N by priority score

## Logging

All endpoints integrate the reusable logging middleware from `logging_middleware` package. Every request and error is logged to the test server.

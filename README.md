# Campus Notifications System - Backend Track

Complete notification microservice with logging middleware, async job processing, and Priority Inbox implementation.

## Project Structure

```
.
├── logging_middleware/
│   ├── src/
│   │   ├── index.ts           # Reusable logging middleware
│   │   └── example.ts         # Usage example
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── notification_app_be/
│   ├── src/
│   │   ├── app.ts             # Express server
│   │   ├── Notifications.ts   # CRUD endpoints (GET, POST, PATCH)
│   │   ├── NotifyAll.ts       # Async job enqueue endpoint
│   │   ├── PriorityInbox.ts   # Top-N priority endpoint
│   │   └── worker.ts          # Background job processor
│   ├── migrations/
│   │   ├── JobsNotify.sql     # Database tables and schema
│   │   └── ScoreColumn.sql    # Optional score optimization
│   ├── package.json
│   ├── tsconfig.json
│   └── README.md
├── notification_system_design.md  # Complete system design (6 stages)
└── .gitignore
```

## Quick Start

### 1. Setup Logging Middleware

```bash
cd logging_middleware
npm install
npm run build
npm run example
```

### 2. Setup Notification Backend

```bash
cd ../notification_app_be
npm install
```

Configure database:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/notifications_db"
psql -U postgres -c "CREATE DATABASE notifications_db;"
psql -U postgres -d notifications_db -f migrations/JobsNotify.sql
```

### 3. Start Services

In one terminal (API server):

```bash
npm start
```

In another terminal (background worker):

```bash
npm run worker
```

## Stages overview

- **Stage 1**: REST API contract, real-time delivery (WebSocket), headers, endpoints, error handling.
- **Stage 2**: PostgreSQL schema design, table structure, indexes for efficient querying.
- **Stage 3**: Query optimization analysis, index recommendations, in-query scoring for Priority Inbox.
- **Stage 4**: Caching strategies (Redis), denormalization, partitioning, WebSocket scaling, observability.
- **Stage 5**: Reliable async notify_all using job table, batching, retries with exponential backoff, poison handling.
- **Stage 6**: Priority Inbox top-N endpoint using in-query scoring; future denormalized optimization path.

See `notification_system_design.md` for detailed guidance on each stage.

## Logging middleware

The `Log` function is a reusable package that posts logs to the test server on every call:

```typescript
import Log from '../../../logging_middleware/src/index'

await Log('backend', 'error', 'handler', 'received string, expected bool')
```

Parameters:
- `stack`: 'backend' or 'frontend'
- `level`: 'debug', 'info', 'warn', 'error', 'fatal'
- `package`: backend packages (cache, controller, cron_job, db, domain, handler, repository, route, service) or frontend packages (api, component, hook, page, state, style) or shared (auth, config, middleware, utils)
- `message`: descriptive log message

All handlers and worker already integrate logging calls for observability.

## Key files explained

- **logging_middleware/src/index.ts**: Reusable logging middleware that validates inputs (lowercase, allowed values) and posts to test server via axios.
- **notification_app_be/src/Notifications.ts**: CRUD endpoints (GET list, GET single, POST create, PATCH read).
- **notification_app_be/src/NotifyAll.ts**: Express handler for POST /notify_all that inserts a job row and returns 202.
- **notification_app_be/src/worker.ts**: Polling background process that picks up jobs, inserts notifications in batches (500 per batch), implements retries with exponential backoff, and logs all activity.
- **notification_app_be/src/PriorityInbox.ts**: Express handler for GET /notifications/priority that returns top-N unread notifications ranked by type weight + recency using in-query scoring.
- **notification_system_design.md**: End-to-end system design documenting API, schema, performance considerations, and implementation strategies.

## Example workflow

1. Client calls POST /notify_all with `{ studentIds: [1,2,...5000], type: "Placement", title: "...", message: "..." }`.
2. Handler inserts a job row into `notify_jobs` and returns 202 with jobId.
3. Worker picks up the job, inserts 5000 notifications in 10 batches of 500 each, with retries.
4. Client calls GET /notifications/priority?studentId=1042&limit=10 to get top-10 unread.
5. Handler computes priority score (type weight + recency) and returns sorted list.
6. All operations log via the `Log` middleware to the test server for observability.

## API Endpoints

**Notifications CRUD:**
- `GET /notifications?studentId=1042&page=1&pageSize=20&onlyUnread=false`
- `GET /notifications/:id`
- `POST /notifications` (body: studentId, type, title, message, metadata, priority)
- `PATCH /notifications/:id/read` (body: isRead)

**Async Bulk Operations:**
- `POST /notify_all` (body: studentIds, type, title, message, metadata)

**Priority Inbox:**
- `GET /notifications/priority?studentId=1042&limit=10`

**Health Check:**
- `GET /health`

## Testing with Postman/Insomnia

1. Open Postman or Insomnia
2. Set base URL: `http://localhost:3000`
3. Example requests shown in notification_app_be/README.md

## Production-Grade Code

- Proper naming conventions (PascalCase for classes/exports, camelCase for variables)
- Type-safe TypeScript with strict mode
- Comprehensive error handling and logging
- Database transactions for data consistency
- Connection pooling for scalability
- Parameterized SQL queries for security
# Logging Middleware

Reusable logging middleware package that validates log inputs and posts to a test server.

## Install

```bash
npm install
npm run build
```

## Usage

```typescript
import Log from './src/index'

await Log('backend', 'error', 'handler', 'received string, expected bool')
```

## Parameters

- `stack`: 'backend' or 'frontend'
- `level`: 'debug', 'info', 'warn', 'error', 'fatal'
- `package`: backend (cache, controller, cron_job, db, domain, handler, repository, route, service), frontend (api, component, hook, page, state, style), or shared (auth, config, middleware, utils)
- `message`: descriptive log message
- `options`: optional { apiKey, endpoint }

## Environment

- `LOG_ENDPOINT`: test server URL (default: http://20.207.122.201/evaluation-service/logs)
- `LOG_API_KEY`: bearer token for authentication

## Example

```bash
npm run example
```

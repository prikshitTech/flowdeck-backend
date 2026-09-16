# FlowDeck

A small collaboration SaaS backend: workspaces hold nested **pages** (Notion), kanban
**boards** (Trello) and **channels** (Slack), behind one authentication and permission model.

TypeScript on Node 22, Express, MongoDB, Redis, BullMQ and Socket.io. 75 REST endpoints, 81 tests.

- API reference: `http://localhost:4000/docs` (Swagger UI, spec at `/docs/openapi.json`)
- [Architecture and request flow](docs/architecture.md)
- [Data model, indexes and transactions](docs/data-model.md)

## Running it

You need MongoDB and Redis. Transactions need MongoDB as a replica set or Atlas; a plain
standalone `mongod` works too, the code detects it and skips sessions.

### With Docker

```bash
cp .env.example .env          # set the two JWT secrets
docker compose up --build
```

Mongo initialises itself as a single node replica set through its healthcheck, so
transactions behave the same as they do on Atlas. The API and the worker run as separate
containers from one image.

### Without Docker

```bash
npm install
cp .env.example .env          # point MONGO_URI and REDIS_URL at Atlas / Upstash
npm run dev                   # api + realtime + workers, run through tsx
```

To split the worker out, set `RUN_WORKERS_IN_API=false` and run `npm run worker` alongside.

### Tests

```bash
npm test                      # 81 tests
npm run test:coverage         # statements 82%, lines 83%
```

Tests run against a real in-memory MongoDB replica set, so transactions, aggregations and
indexes are exercised rather than mocked. They need no Redis: the cache layer degrades and
queued jobs run inline, which is the same path production takes during a Redis outage.

## Configuration

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | |
| `MONGO_URI` | — | Required |
| `REDIS_URL` | — | Required, but the API survives it being unreachable |
| `JWT_ACCESS_SECRET` | — | Required, minimum 24 characters |
| `JWT_REFRESH_SECRET` | — | Required, minimum 24 characters |
| `ACCESS_TOKEN_TTL` | `900` | Seconds |
| `REFRESH_TOKEN_TTL` | `604800` | Seconds |
| `CORS_ORIGINS` | `*` | Comma separated |
| `RATE_LIMIT_MAX` | `240` | Per window, per address |
| `LOGIN_MAX_ATTEMPTS` | `6` | Before an account is locked out |
| `LOGIN_LOCK_SECONDS` | `300` | Lockout length |
| `IP_BLOCK_THRESHOLD` | `25` | Failures before the address itself is blocked |
| `MAX_UPLOAD_MB` | `50` | Rejected mid-stream, not after buffering |
| `RUN_WORKERS_IN_API` | `true` | Set false when running the worker separately |

Startup validates all of these with zod and refuses to boot on a bad value, so a typo in a
secret fails immediately instead of at the first login.

## How the code is arranged

```
src/
  config/       env, logger, mongo and redis connections
  constants/    status codes, messages, roles, cache keys, queue and event names
  helpers/      small pure functions: tokens, slugs, pagination, transactions, patterns
  middlewares/  authenticate, authorize, workspaceAccess, validate, responder,
                errorHandler, auditTrail, rateLimiter, ipGuard, upload
  models/       mongoose schemas and their indexes
  validators/   zod schemas per module, also the source of the OpenAPI spec
  services/     business rules, the only layer that talks to the database
  controllers/  read the request, call a service, hand the result to a responder
  routes/       one file per module
  queues/       BullMQ queues and workers
  sockets/      realtime gateway and the emitter services publish through
  docs/         OpenAPI document built from the validators
  types/        express request and response extensions
```

The code is strict TypeScript (`strict`, `noUnusedLocals`, `isolatedModules`). Request types
are inferred from the zod validators, so a service parameter and the schema that guards the
route cannot disagree. Imports keep the `.js` suffix because the compiled output is native ESM.

Controllers never touch a model and services never touch `req` or `res`, so business rules
are testable and the HTTP layer stays thin.

### Responses

No controller calls `res.status().json()`. A `responder` middleware attaches
`res.ok`, `res.created`, `res.list` and `res.noContent`, so every success looks the same:

```json
{ "success": true, "message": "Fetched successfully", "data": {}, "meta": { "pagination": {} } }
```

and every failure comes from one `errorHandler` that translates zod, mongoose cast,
validation and duplicate key errors into the same shape with a machine readable `code`.
The one deliberate exception is file download, which streams bytes rather than an envelope.

## Decisions worth explaining

**Refresh tokens rotate, and replay kills the family.** A refresh token is a JWT whose
sha256 is stored server side. Using one revokes it and issues a replacement in the same
lineage. Presenting a token that verifies but is no longer stored means it was stolen or
replayed, so the whole family is revoked and the user has to sign in again.

**Sessions carry a version, not a timestamp.** The first attempt compared the JWT `iat`
against `passwordChangedAt`, and a token minted in the same second as a password change
stayed valid because `iat` only has second resolution. `tokenVersion` on the user is bumped
whenever sessions are revoked and is checked on every request, which has no clock ambiguity.

**Rate limits key on the IPv6 prefix.** A single IPv6 allocation hands out billions of
addresses. Keying on the full address let one client walk its own prefix and sidestep every
limit, so login guards and rate limits collapse an address onto its /64.

**Card order stays contiguous.** Moving a card decrements positions after the old slot and
increments positions at or after the new one in a transaction, excluding the card itself.
Positions are always `0..n-1`, so the board renders from one sorted read with no gaps to
reconcile on the client.

**Pages use a materialised path.** Each page stores its ancestor ids, so a subtree is one
indexed query rather than a recursive walk, and moving a branch rewrites the descendants'
paths in a single transaction. Moves into the page's own descendant are rejected.

**Search is one aggregation, not three.** `$unionWith` runs the text search over pages,
cards and messages in a single pipeline and returns one ranked list with per-kind counts.
Messages are pre-filtered to channels the caller can actually see, so a private channel
never leaks through search.

**User input never becomes a pattern.** Full-text queries go through MongoDB's `$text`
index. Type-ahead needs a prefix match, so the input is escaped character by character
before it reaches `RegExp` — searching for `.*` matches nothing rather than everything.

**Uploads stream.** Busboy pipes the request straight to disk while hashing the same pass,
so a large file never lands in memory and the size limit aborts mid-stream instead of after
the whole body arrives. Downloads support range requests.

**Recurring jobs use job schedulers.** Converting the queue layer to TypeScript showed that
BullMQ 6 dropped the `repeat` option on `queue.add`, so the hourly due-soon sweep and the
nightly purge had been queued once and never again. They now register with
`upsertJobScheduler`, which is also idempotent across restarts.

**Redis is optional at runtime.** Every Redis call goes through one service that logs and
returns a neutral value on failure, and job producers fall back to running the handler
inline. A Redis outage costs throughput, not correctness — the
[table in the architecture notes](docs/architecture.md#degrading-without-redis) says what
each feature does.

**The spec is generated from the validators.** `z.toJSONSchema` turns the same zod schemas
the router enforces into the OpenAPI request bodies and query parameters, so the docs
cannot drift. A test walks every documented endpoint to prove it is routed and that
everything outside the public auth routes answers 401 without a token.

## Security

- bcrypt at 12 rounds, password never selected by default
- Short-lived access tokens, rotating refresh tokens with replay detection
- Four workspace roles ranked owner > admin > member > viewer, enforced by one middleware
- Login lockout per account and per address, then an outright block for a persistent address
- Per-route rate limits: tighter on auth, uploads and search than on ordinary reads
- helmet, CORS allow list, `express-mongo-sanitize`, `hpp`, 1MB body cap
- Every request validated by zod before a handler runs; unknown fields are stripped
- Upload type allow list, size cap and generated storage names, so a filename can never
  escape its directory
- Audit log of every successful mutation with actor, entity, address and user agent

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | API, realtime and workers from source with file watching |
| `npm run typecheck` | Strict type check of `src` and `tests` |
| `npm run build` | Compile `src` to `dist` |
| `npm start` | Production API from `dist` |
| `npm run worker` | Queue workers only, from `dist` |
| `npm test` | Jest against an in-memory replica set |
| `npm run test:coverage` | The same with a coverage report |

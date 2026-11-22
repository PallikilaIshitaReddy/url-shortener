# URL Shortener

Node.js, Express, PostgreSQL, and Redis URL shortener with JWT auth, custom aliases, link expiration, and link management.

## Endpoints
- GET /health — Health check
- POST /api/auth/register — Register (email, password min 8 chars)
- POST /api/auth/login — Login and receive 1-day JWT (token)
- POST /api/links — Create link (Bearer token required; supports url, optional alias, optional future ISO expiresAt)
- GET /api/links — List links owned by the authenticated user (Bearer token required)
- DELETE /api/links/:id — Delete a link owned by the user (403 if not owner)
- GET /:code — Redirect (302) or return 410 Gone if expired / 404 if not found

## Run & Test
1. docker compose up -d
2. cd server
3. npm install
4. npm run dev
5. npm test

## Caching and Rate Limiting (Week 3)

- **Redis Redirect Cache (`src/services/linkCacheService.js`):** Caches active, non-expired `GET /:code` lookups in Redis (`shortener-redis`) with TTL capped at link expiry, invalidating cached keys on `DELETE /api/links/:id` and gracefully falling back to PostgreSQL if Redis is unavailable.
- **Fixed-Window Rate Limiting (`src/middleware/rateLimiter.js`):** Enforces per-user limits on `POST /api/links` (`20` req/min) and per-IP limits on `GET /:code` (`120` req/min) using Redis `INCR` + `EXPIRE`, returning `429 Too Many Requests` with `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Remaining` headers.
- **k6 Redirect Load Test (`20` VUs, `10s`, `GET /my-github`):**
  - Without Redis cache: `1,247.00 req/s` (`12,485` requests)
  - With Redis cache: `1,277.14 req/s` (`12,786` requests), `p95 = 20.15ms`

## Caching and Rate Limiting (Week 3)

- **Redis Redirect Cache (`src/services/linkCacheService.js`):** Caches active, non-expired `GET /:code` lookups in Redis (`shortener-redis`) with TTL capped at link expiry, invalidating cached keys on `DELETE /api/links/:id` and gracefully falling back to PostgreSQL if Redis is unavailable.
- **Fixed-Window Rate Limiting (`src/middleware/rateLimiter.js`):** Enforces per-user limits on `POST /api/links` (`20` req/min) and per-IP limits on `GET /:code` (`120` req/min) using Redis `INCR` + `EXPIRE`, returning `429 Too Many Requests` with `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Remaining` headers.
- **k6 Redirect Load Test (`20` VUs, `10s`, `GET /my-github`):**
  - Without Redis cache: `1,247.00 req/s` (`12,485` requests)
  - With Redis cache: `1,277.14 req/s` (`12,786` requests), `p95 = 20.15ms`

## Click Analytics & React Dashboard (Week 4)

- Asynchronous click tracking records `link_id`, `referrer`, `device`, and `country` on both Redis cache hits and PostgreSQL cache misses without blocking redirects.
- Batched writes flush buffered clicks to PostgreSQL every 5 seconds, at 100 events, or gracefully on `SIGTERM`.
- `GET /api/links/:id/analytics` enforces authentication and link ownership, returning `totalClicks`, `clicksLast30Days`, `byDevice`, `topReferrers`, and `topCountries` indexed by `idx_clicks_link_time`.
- React dashboard in `client/` provides Login/Register, link creation with Copy/Delete actions, and Recharts analytics visualizations.

### Screenshots
- Dashboard: `docs/dashboard.png`
- Link analytics: `docs/analytics.png`

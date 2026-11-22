# URL Shortener & Click Analytics

High-throughput URL shortener with JWT auth, custom aliases, link expiry, Redis caching and rate limiting, batched click analytics, and a React dashboard. **Live Demo:** `<your-frontend-url>` (API: `<your-backend-url>`)

## Dashboard & Analytics

- **Dashboard View:** `docs/dashboard.png`
- **Link Analytics View:** `docs/analytics.png`

## Features

- User registration and login with `bcrypt` password hashing and JWT authentication.
- Short link creation with optional custom aliases, Base62 encoding, and optional expiration timestamps (`expires_at`, returning `410` once expired).
- Fast `302` redirects backed by Redis caching (including `id` in cached payloads) with cache invalidation on link deletion.
- Redis-backed rate limiting (`429` + `Retry-After`) on link creation.
- Asynchronous click tracking (`device` via `ua-parser-js`, `referrer`, `country` via `geoip-lite`, `clicked_at`) for both cache hits and cache misses.
- Batched PostgreSQL writes flushing every 5 seconds, at 100 queued events, or on `SIGTERM`.
- Authenticated, owner-only analytics API (`GET /api/links/:id/analytics`) indexed via `idx_clicks_link_time (link_id, clicked_at DESC)`.
- React dashboard (`client/`) with `/login`, link management (`/`), and Recharts analytics (`/links/:id`).

## Performance Results (k6)

> **Note on Free-Tier Hosting:** Free cloud tiers may spin down after idle periods, so the first request after inactivity can experience cold-start delay.

| Scenario | Workload | Throughput / Iterations | p95 Latency | Notes |
| --- | --- | --- | --- | --- |
| Redirect (`loadtest/redirect.js`) | 20 VUs, 10s (with Redis) | 38,609 iterations (~3.86k/s) | `<record p95 ms>` | Cache hit path + async click queue |
| Redirect (`loadtest/redirect.js`) | 20 VUs, 10s (without Redis) | `<record RPS / result>` | `<record p95 ms>` | Direct DB fallback benchmark |
| Create Link (`loadtest/create-link.js`) | 10 VUs, 10s | 14,676 iterations (~1.42k/s) | `<record p95 ms>` | Includes `201` / `429` rate-limit responses |

- **Test Machine:** `<CPU & RAM specs>`

## Architecture Diagram

```text
  React Dashboard (Vite) ---> Express API ---> Redis (Link Cache + Rate Limiter)
                                   |
                        async/batched| sync reads & link/auth writes
                                   v
                              PostgreSQL (users, links, clicks)
```

## Tech Stack

- **Backend:** Node.js, Express, `pg` (PostgreSQL), `ioredis` (Redis), `jsonwebtoken`, `bcrypt`, `cors`, `ua-parser-js`, `geoip-lite`
- **Frontend:** React, Vite, `axios`, `react-router-dom`, `recharts`
- **Infrastructure & Testing:** Docker / Docker Compose, `node:test`, `supertest`, `k6`

## Setup Instructions

### Using Docker Compose
```bash
docker compose up -d
```

### Local Development (`npm run dev`)
```bash
cd server && npm install && npm run dev
```
In a second terminal for the React dashboard:
```bash
cd client && npm install && npm run dev
```
Run backend tests:
```bash
cd server && npm test
```

## API Endpoints

- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Authenticate and receive a JWT token
- `GET /api/links` — List links for the authenticated user
- `POST /api/links` — Create a short link (rate-limited)
- `DELETE /api/links/:id` — Delete an owned link and invalidate Redis cache
- `GET /api/links/:id/analytics` — Owner-only click analytics (`totalClicks`, `clicksLast30Days`, `byDevice`, `topReferrers`, `topCountries`)
- `GET /:code` — Redirect (`302`) to target URL and record click asynchronously

## Design Document

- Read the full architecture and scaling notes in [docs/design-doc.md](docs/design-doc.md).

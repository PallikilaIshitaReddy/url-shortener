# System Design Document: Full-Stack URL Shortener & Click Analytics

## 1. Requirements & Scale Assumptions

### Functional Requirements
- User registration and JWT authentication with bcrypt password hashing.
- Short link creation with optional custom aliases and optional expiration timestamps (`expires_at`).
- Fast `302` redirects (`/:code`) with expiration checks (`410`) and rate limiting (`429`).
- Asynchronous click tracking (`device`, `referrer`, `country`, `clicked_at`) for both cache hits and misses.
- Authenticated, owner-only analytics endpoint (`GET /api/links/:id/analytics`) and React dashboard (`client/`).

### Non-Functional & Scale Assumptions
- **Scale Target:** 100M links with a **10:1 read-to-write ratio**.
- **Latency:** Redirects serve from Redis cache without blocking on synchronous DB click writes.
- **Resilience:** Buffered clicks flush every 5s, at 100 events, or on `SIGTERM`.

## 2. Architecture Diagram

```text
  React Dashboard (Vite) ---> Express API ---> Redis (Cache + Rate Limit)
                                   |
                        async/batched| sync reads & link/auth writes
                                   v
                              PostgreSQL (users, links, clicks)
```

## 3. ID Generation
- **Base62 Counter:** Encodes numeric IDs into `0-9a-zA-Z` for compact, URL-safe codes.
- **Reducing Guessability:** Permute/cipher/shuffle IDs before Base62 encoding or support random/custom aliases rather than exposing raw sequential counters.
- **Multi-Server Generation:** Use pre-allocated ID ranges per server instance or Snowflake-style IDs (timestamp + worker ID + sequence) to avoid coordination bottlenecks.

## 4. Caching Strategy
- **TTLs:** Default TTL (e.g., 3600s), bounded by remaining time until `expires_at`, storing `id` (`link_id`) alongside target URL data.
- **Invalidation:** Delete Redis cache key on link deletion (`DELETE /api/links/:id`) and re-verify expiry before redirecting.
- **Redis Failure & Stampede:** Fall back to PostgreSQL on cache errors (with fast fail-open behavior on outages); mitigate cache stampedes with single-flight coalescing, jittered TTLs, or distributed locks.

## 5. Rate Limiting
- **Algorithm:** Redis counter-based rate limiting with `Retry-After` and `429` responses for abusive/burst traffic (such as `POST /api/links`), chosen for atomic sub-millisecond operations across API instances.

## 6. Analytics Pipeline
- **Async + Batched:** Captures user-agent/referrer/GeoIP metadata off the critical redirect path and batch-inserts into PostgreSQL using composite index `idx_clicks_link_time (link_id, clicked_at DESC)`.
- **Scaling with Kafka:** Stream click events to a Kafka topic partitioned by link/event and consume in worker batches into PostgreSQL or an OLAP store.

## 7. What Breaks at 100x Scale
- High-volume click inserts and large `clicks` tables -> partition/offload to an analytical store (e.g., ClickHouse).
- Heavy read load -> add PostgreSQL read replicas and edge/CDN caching where appropriate.
- Large `links` table / write throughput -> shard `links` by short code or ID range.

## 8. Trade-Offs & What I Would Do Differently
- An in-process click buffer is simple and fast for a single Node process with `SIGTERM` flushing, though a crash/hard kill before flush can drop buffered events—a durable queue improves durability.
- Fixed windows are simple to implement, while sliding-window/token-bucket approaches handle boundary bursts more smoothly.

## 9. Load Test Benchmark Summary (Day 1)
- **Machine:** <CPU & RAM>
- **Redirect (with Redis):** <RPS> req/s, p95 = <ms>
- **Redirect (without Redis):** <RPS> req/s, p95 = <ms>
- **Create Link:** <RPS> req/s, p95 = <ms>

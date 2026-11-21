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

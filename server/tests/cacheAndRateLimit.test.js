require('dotenv').config();
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const redis = require('../src/config/redis');

async function clearRateLimitKeys() {
  const keys = await redis.keys('rl:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

describe('Week 3: Redis caching and rate limiting', () => {
  let token;
  let testEmail;

  before(async () => {
    await clearRateLimitKeys();
    testEmail = `week3_${Date.now()}@example.com`;
    const password = 'password123';

    await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password });

    assert.equal(loginRes.status, 200);
    token = loginRes.body.token;
  });

  after(async () => {
    await clearRateLimitKeys();
    if (testEmail) {
      await pool.query('DELETE FROM links WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [testEmail]);
      await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
    }
    await redis.quit();
    await pool.end();
  });

  it('caches redirects in Redis and invalidates cache on DELETE', async () => {
    const alias = `w3cache${Date.now().toString().slice(-6)}`;
    const createRes = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${token}`)
      .send({ url: 'https://example.com/docs', alias });

    assert.equal(createRes.status, 201);
    const { id, shortCode } = createRes.body;

    const firstRedirect = await request(app).get(`/${shortCode}`);
    assert.equal(firstRedirect.status, 302);
    assert.equal(firstRedirect.headers.location, 'https://example.com/docs');

    const cachedValue = await redis.get(`link:${shortCode}`);
    assert.ok(cachedValue, 'Expected redirect payload to be cached in Redis');

    const secondRedirect = await request(app).get(`/${shortCode}`);
    assert.equal(secondRedirect.status, 302);
    assert.equal(secondRedirect.headers.location, 'https://example.com/docs');

    const delRes = await request(app)
      .delete(`/api/links/${id}`)
      .set('Authorization', `Bearer ${token}`);
    assert.equal(delRes.status, 200);

    const afterDeleteCache = await redis.get(`link:${shortCode}`);
    assert.equal(afterDeleteCache, null);

    const afterDeleteRedirect = await request(app).get(`/${shortCode}`);
    assert.equal(afterDeleteRedirect.status, 404);
  });

  it('enforces rate limit with 429 and Retry-After header on POST /api/links', async () => {
    await clearRateLimitKeys();

    let blockedRes = null;
    for (let i = 1; i <= 21; i += 1) {
      const res = await request(app)
        .post('/api/links')
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'https://example.com/rl' });

      if (i <= 20) {
        assert.equal(res.status, 201);
      } else {
        blockedRes = res;
      }
    }

    assert.ok(blockedRes, 'Expected 21st request to be rate limited');
    assert.equal(blockedRes.status, 429);
    assert.ok(blockedRes.headers['retry-after'], 'Expected Retry-After header');
    assert.equal(blockedRes.headers['x-ratelimit-limit'], '20');
    assert.equal(blockedRes.headers['x-ratelimit-remaining'], '0');
  });
});

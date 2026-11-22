require('dotenv').config();
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const redis = require('../src/config/redis');
const { flushClicks } = require('../src/services/clickService');

describe('Click Analytics API & Async Tracking', () => {
  let tokenA;
  let tokenB;
  let linkId;
  let shortCode;
  let emailA;
  let emailB;

  before(async () => {
    const suffix = Date.now();
    emailA = `an_a_${suffix}@example.com`;
    emailB = `an_b_${suffix}@example.com`;
    const pass = 'Password123!';

    await request(app).post('/api/auth/register').send({ email: emailA, password: pass });
    const loginA = await request(app).post('/api/auth/login').send({ email: emailA, password: pass });
    tokenA = loginA.body.token;
    assert.ok(tokenA, 'Expected tokenA from /api/auth/login');

    await request(app).post('/api/auth/register').send({ email: emailB, password: pass });
    const loginB = await request(app).post('/api/auth/login').send({ email: emailB, password: pass });
    tokenB = loginB.body.token;
    assert.ok(tokenB, 'Expected tokenB from /api/auth/login');

    const alias = `an-${suffix}`;
    const created = await request(app)
      .post('/api/links')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ url: 'https://example.com/analytics-target', alias });

    assert.equal(created.status, 201);
    linkId = created.body.id;
    shortCode = created.body.short_code || created.body.shortCode || alias;
  });

  after(async () => {
    await flushClicks();
    if (linkId) {
      await pool.query('DELETE FROM links WHERE id = $1', [linkId]);
    }
    if (emailA || emailB) {
      await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [emailA, emailB]);
    }
    await redis.quit();
    await pool.end();
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get(`/api/links/${linkId}/analytics`);
    assert.equal(res.status, 401);
  });

  it('returns 400 for invalid id and 404 for missing link', async () => {
    const badId = await request(app)
      .get('/api/links/abc/analytics')
      .set('Authorization', `Bearer ${tokenA}`);
    assert.equal(badId.status, 400);

    const missing = await request(app)
      .get('/api/links/999999999/analytics')
      .set('Authorization', `Bearer ${tokenA}`);
    assert.equal(missing.status, 404);
  });

  it('returns 403 when requested by non-owner', async () => {
    const res = await request(app)
      .get(`/api/links/${linkId}/analytics`)
      .set('Authorization', `Bearer ${tokenB}`);
    assert.equal(res.status, 403);
  });

  it('records clicks asynchronously across cache miss and cache hit and returns analytics', async () => {
    const hit1 = await request(app)
      .get(`/${shortCode}`)
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')
      .set('Referer', 'https://news.ycombinator.com/');
    assert.equal(hit1.status, 302);

    const hit2 = await request(app)
      .get(`/${shortCode}`)
      .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
      .set('Referer', 'https://news.ycombinator.com/');
    assert.equal(hit2.status, 302);

    await new Promise((r) => setTimeout(r, 50));
    await flushClicks();

    const res = await request(app)
      .get(`/api/links/${linkId}/analytics`)
      .set('Authorization', `Bearer ${tokenA}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.totalClicks, 2);
    assert.ok(Array.isArray(res.body.clicksLast30Days));
    assert.ok(Array.isArray(res.body.byDevice));
    assert.ok(Array.isArray(res.body.topReferrers));
    assert.ok(Array.isArray(res.body.topCountries));
  });
});

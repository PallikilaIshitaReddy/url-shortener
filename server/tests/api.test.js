const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
require('dotenv').config();
const app = require('../src/app');
const pool = require('../src/config/db');
const redis = require('../src/config/redis');

describe('Week 2 API', () => {
  const emailA = `ua_${Date.now()}@example.com`;
  const emailB = `ub_${Date.now()}@example.com`;
  const pass = 'Password123!';
  let tokenA = '', tokenB = '', linkId = '';

  before(async () => {
    assert.equal((await request(app).post('/api/auth/register').send({ email: emailA, password: pass })).status, 201);
    assert.equal((await request(app).post('/api/auth/register').send({ email: emailA, password: pass })).status, 409);
    assert.equal((await request(app).post('/api/auth/login').send({ email: emailA, password: 'Wrong!' })).status, 401);
    tokenA = (await request(app).post('/api/auth/login').send({ email: emailA, password: pass })).body.token;
    await request(app).post('/api/auth/register').send({ email: emailB, password: pass });
    tokenB = (await request(app).post('/api/auth/login').send({ email: emailB, password: pass })).body.token;
  });

  after(async () => {
    await pool.query('DELETE FROM links WHERE user_id IN (SELECT id FROM users WHERE email IN ($1, $2))', [emailA, emailB]);
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [emailA, emailB]);
});

  it('401 without token, 201 with token', async () => {
    assert.equal((await request(app).post('/api/links').send({ url: 'https://example.com' })).status, 401);
    const res = await request(app).post('/api/links').set('Authorization', `Bearer ${tokenA}`).send({ url: 'https://example.com' });
    assert.equal(res.status, 201);
    linkId = res.body.id;
  });

  it('409 on duplicate alias', async () => {
    const alias = `a-${Date.now()}`;
    assert.equal((await request(app).post('/api/links').set('Authorization', `Bearer ${tokenA}`).send({ url: 'https://example.com', alias })).status, 201);
    assert.equal((await request(app).post('/api/links').set('Authorization', `Bearer ${tokenA}`).send({ url: 'https://example.org', alias })).status, 409);
  });

  it('410 on expired link', async () => {
    const alias = `e-${Date.now()}`;
    const soon = new Date(Date.now() + 700).toISOString();
    assert.equal((await request(app).post('/api/links').set('Authorization', `Bearer ${tokenA}`).send({ url: 'https://example.com', alias, expiresAt: soon })).status, 201);
    await new Promise((r) => setTimeout(r, 800));
    assert.equal((await request(app).get(`/${alias}`)).status, 410);
  });

  it('403 for non-owner delete, 200 for owner', async () => {
    assert.equal((await request(app).delete(`/api/links/${linkId}`).set('Authorization', `Bearer ${tokenB}`)).status, 403);
    assert.equal((await request(app).delete(`/api/links/${linkId}`).set('Authorization', `Bearer ${tokenA}`)).status, 200);
  });
});

after(async () => {
  await redis.quit();
  await pool.end();
});

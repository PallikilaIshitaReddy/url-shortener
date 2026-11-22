import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || '10s',
};

export function setup() {
  const email = `k6_${Date.now()}@example.com`;
  const password = 'Password123!';

  http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  return { token: loginRes.json('token') };
}

export default function (data) {
  const payload = JSON.stringify({
    url: 'https://example.com/k6-benchmark',
  });

  const res = http.post(`${BASE_URL}/api/links`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
    },
  });

  check(res, {
    'status is 201 or 429': (r) => r.status === 201 || r.status === 429,
  });
}

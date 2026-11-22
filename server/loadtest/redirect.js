import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const CODE = __ENV.CODE || 'my-github';

export const options = {
  vus: Number(__ENV.VUS || 20),
  duration: __ENV.DURATION || '10s',
};

export default function () {
  const res = http.get(`${BASE_URL}/${CODE}`, { redirects: 0 });
  check(res, {
    'status is 302': (r) => r.status === 302,
  });
}

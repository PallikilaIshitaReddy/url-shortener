import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 20,
  duration: '10s',
};

export default function () {
  const res = http.get('http://localhost:3000/my-github', { redirects: 0 });
  check(res, { 'status is 302': (r) => r.status === 302 });
}

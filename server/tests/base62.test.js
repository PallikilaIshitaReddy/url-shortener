const test = require('node:test');
const assert = require('node:assert');
const { encode, decode } = require('../src/utils/base62');

test('encodes small numbers', () => {
  assert.strictEqual(encode(0), '0');
  assert.strictEqual(encode(61), 'Z');
  assert.strictEqual(encode(62), '10');
});

test('decode reverses encode', () => {
  for (const n of [1, 999, 1000000, 123456789]) {
    assert.strictEqual(decode(encode(n)), n);
  }
});

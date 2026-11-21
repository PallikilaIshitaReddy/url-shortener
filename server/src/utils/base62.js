const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function encode(num) {
  if (num === 0) return CHARS[0];
  let out = '';
  while (num > 0) {
    out = CHARS[num % 62] + out;
    num = Math.floor(num / 62);
  }
  return out;
}

function decode(str) {
  return [...str].reduce((n, c) => n * 62 + CHARS.indexOf(c), 0);
}

module.exports = { encode, decode };

const RESERVED_ALIASES = new Set([
  'api',
  'health',
  'login',
  'register',
  'auth',
  'links',
  'logout',
  'admin',
  'static',
  'assets',
]);

const ALIAS_REGEX = /^[a-zA-Z0-9-]{3,30}$/;

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateAlias(alias) {
  if (typeof alias !== 'string' || !ALIAS_REGEX.test(alias)) {
    return {
      valid: false,
      error: 'Alias must be 3-30 characters using only letters, numbers, and hyphens',
    };
  }

  if (RESERVED_ALIASES.has(alias.toLowerCase())) {
    return {
      valid: false,
      error: 'That alias is reserved',
    };
  }

  return { valid: true };
}

module.exports = { isValidUrl, validateAlias };

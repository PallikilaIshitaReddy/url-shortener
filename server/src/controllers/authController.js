const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userService = require('../services/userService');

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

async function register(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await userService.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userService.createUser(email, passwordHash);

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await userService.findByEmail(email);
    const isMatch = user ? await bcrypt.compare(password, user.password_hash) : false;

    if (!user || !isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login };

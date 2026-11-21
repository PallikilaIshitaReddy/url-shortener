const express = require('express');
const authRoutes = require('./routes/auth');
const linkRoutes = require('./routes/links');
const redirectRoutes = require('./routes/redirect');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/links', linkRoutes);
app.use('/', redirectRoutes);   // keep this LAST, because '/:code' matches almost anything

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;

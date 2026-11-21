const linkService = require('../services/linkService');
const { isValidUrl } = require('../utils/validators');

async function create(req, res, next) {
  try {
    const { url } = req.body;

    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ error: 'A valid http/https URL is required' });
    }

    const link = await linkService.createLink(url);

    res.status(201).json({
      shortCode: link.short_code,
      shortUrl: `${process.env.BASE_URL}/${link.short_code}`,
      originalUrl: link.original_url,
      createdAt: link.created_at,
    });
  } catch (err) {
    next(err);
  }
}

async function redirect(req, res, next) {
  try {
    const link = await linkService.findByCode(req.params.code);

    if (!link || !link.is_active) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // 302 (temporary) so browsers don't cache it and every click reaches us
    res.redirect(302, link.original_url);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, redirect };

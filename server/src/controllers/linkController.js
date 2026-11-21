const linkService = require('../services/linkService');
const { isValidUrl, validateAlias } = require('../utils/validators');

async function create(req, res, next) {
  try {
    const { url, alias, expiresAt } = req.body;

    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ error: 'A valid http/https URL is required' });
    }

    let normalizedAlias = null;
    if (alias !== undefined && alias !== null && alias !== '') {
      const aliasCheck = validateAlias(alias);
      if (!aliasCheck.valid) {
        return res.status(400).json({ error: aliasCheck.error });
      }
      normalizedAlias = alias;
    }

    let parsedExpiry = null;
    if (expiresAt !== undefined && expiresAt !== null) {
      const date = new Date(expiresAt);
      if (Number.isNaN(date.getTime())) {
        return res.status(400).json({ error: 'expiresAt must be a valid ISO date' });
      }
      if (date.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'expiresAt must be in the future' });
      }
      parsedExpiry = date.toISOString();
    }

    const link = await linkService.createLink(
      url,
      req.user.id,
      normalizedAlias,
      parsedExpiry
    );

    res.status(201).json({
      id: link.id,
      shortCode: link.short_code,
      shortUrl: `${process.env.BASE_URL}/${link.short_code}`,
      originalUrl: link.original_url,
      expiresAt: link.expires_at,
      createdAt: link.created_at,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Alias is already taken' });
    }
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const links = await linkService.listByUser(req.user.id);
    res.json({
      links: links.map((link) => ({
        id: link.id,
        shortCode: link.short_code,
        shortUrl: `${process.env.BASE_URL}/${link.short_code}`,
        originalUrl: link.original_url,
        expiresAt: link.expires_at,
        isActive: link.is_active,
        createdAt: link.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const linkId = Number(req.params.id);
    if (!Number.isInteger(linkId) || linkId <= 0) {
      return res.status(400).json({ error: 'Invalid link id' });
    }

    const link = await linkService.findById(linkId);
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    if (String(link.user_id) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await linkService.deleteById(linkId);
    res.status(200).json({ deleted: true, id: linkId });
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

    if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) {
      return res.status(410).json({ error: 'Link has expired' });
    }

    // 302 (temporary) so browsers don't cache it and every click reaches us
    res.redirect(302, link.original_url);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, remove, redirect };

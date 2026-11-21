const linkService = require('../services/linkService');
const linkCache = require('../services/linkCacheService');
const { isValidUrl, validateAlias } = require('../utils/validators');

async function create(req, res, next) {
  try {
    const { url, alias, expiresAt } = req.body;
    if (!url || !isValidUrl(url)) return res.status(400).json({ error: 'Valid http/https URL required' });
    let normalizedAlias = null;
    if (alias) {
      const chk = validateAlias(alias);
      if (!chk.valid) return res.status(400).json({ error: chk.error });
      normalizedAlias = alias;
    }
    let parsedExpiry = null;
    if (expiresAt) {
      const d = new Date(expiresAt);
      if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) {
        return res.status(400).json({ error: 'expiresAt must be a valid future ISO date' });
      }
      parsedExpiry = d.toISOString();
    }
    const link = await linkService.createLink(url, req.user.id, normalizedAlias, parsedExpiry);
    res.status(201).json({
      id: link.id, shortCode: link.short_code,
      shortUrl: `${process.env.BASE_URL}/${link.short_code}`,
      originalUrl: link.original_url, expiresAt: link.expires_at, createdAt: link.created_at,
    });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Alias is already taken' });
    next(err);
  }
}

async function list(req, res, next) {
  try { res.json({ links: await linkService.listByUser(req.user.id) }); } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const linkId = Number(req.params.id);
    if (!Number.isInteger(linkId) || linkId <= 0) return res.status(400).json({ error: 'Invalid id' });
    const link = await linkService.findById(linkId);
    if (!link) return res.status(404).json({ error: 'Link not found' });
    if (String(link.user_id) !== String(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
    await linkService.deleteById(linkId);
    await linkCache.deleteCachedLink(link.short_code);
    res.status(200).json({ deleted: true, id: linkId });
  } catch (err) { next(err); }
}

async function redirect(req, res, next) {
  try {
    const code = req.params.code;
    let link = await linkCache.getCachedLink(code);
    if (!link) {
      link = await linkService.findByCode(code);
      if (link && link.is_active) {
        const notExpired = !link.expires_at || new Date(link.expires_at).getTime() > Date.now();
        if (notExpired) await linkCache.setCachedLink(code, link);
      }
    }
    if (!link || !link.is_active) return res.status(404).json({ error: 'Link not found' });
    if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) {
      await linkCache.deleteCachedLink(code);
      return res.status(410).json({ error: 'Link has expired' });
    }
    res.redirect(302, link.original_url);
  } catch (err) { next(err); }
}

module.exports = { create, list, remove, redirect };

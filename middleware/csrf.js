const crypto = require('crypto');

function csrfProtection(req, res, next) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  res.locals.csrfToken = req.session.csrfToken;

  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const submitted = req.get('x-csrf-token') || req.body._csrf || '';
  const expected = req.session.csrfToken;
  const valid = submitted.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(expected));

  if (!valid) {
    if (req.originalUrl.startsWith('/api/')) return res.status(403).json({ error: 'Invalid CSRF token.' });
    return res.status(403).render('error', { title: 'Request blocked', message: 'Refresh the page and try again.' });
  }
  next();
}

module.exports = csrfProtection;
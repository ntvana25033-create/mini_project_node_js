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
    return res.status(403).json({ error: 'Invalid CSRF token.' });
  }
  next();
}

module.exports = csrfProtection;
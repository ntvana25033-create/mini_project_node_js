function requireAuth(req, res, next) {
  if (!req.session.user) {
    if (req.originalUrl.startsWith('/api/')) return res.status(401).json({ error: 'Authentication required.' });
    return res.redirect('/login');
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return requireAuth(req, res, next);
    if (!roles.includes(req.session.user.role)) {
      if (req.originalUrl.startsWith('/api/')) return res.status(403).json({ error: 'Permission denied.' });
      return res.status(403).render('error', { title: 'Not allowed', message: 'This area is not available for your account.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
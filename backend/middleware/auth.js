function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) return requireAuth(req, res, next);
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Permission denied.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
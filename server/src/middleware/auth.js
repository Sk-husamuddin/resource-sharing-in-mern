/**
 * Require authenticated session.
 * Rejects requests without a valid user session with 401.
 */
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Authentication required. Please log in.' });
  }
  next();
};

/**
 * Require admin role.
 * Must be used AFTER requireAuth.
 */
const requireAdmin = (req, res, next) => {
  if (!req.session || req.session.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden. Administrator access required.' });
  }
  next();
};

module.exports = { requireAuth, requireAdmin };

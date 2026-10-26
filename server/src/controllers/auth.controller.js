const User = require('../models/User');

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Duplicate email check
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const user = new User({
      username,
      email,
      passwordHash: password, // pre-save hook will hash this
    });
    await user.save();

    // Auto-login after registration
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user._id.toString();
      req.session.role = user.role;
      return res.status(201).json({
        message: 'Account created successfully.',
        user: user.toSafeObject(),
      });
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Need passwordHash for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Regenerate session to prevent session fixation
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user._id.toString();
      req.session.role = user.role;
      return res.status(200).json({
        message: 'Logged in successfully.',
        user: user.toSafeObject(),
      });
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: 'Session user not found.' });
    }

    // Sync session role from DB so role changes (e.g. admin promotion)
    // take effect on the next page refresh without requiring re-login.
    if (req.session.role !== user.role) {
      req.session.role = user.role;
      // Persist updated role back to session store
      req.session.save((err) => { if (err) console.error('[session save]', err); });
    }

    return res.status(200).json({ user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
const logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('resource_hub.sid', { path: '/' });
    return res.status(200).json({ message: 'Logged out successfully.' });
  });
};

module.exports = { register, login, getMe, logout };

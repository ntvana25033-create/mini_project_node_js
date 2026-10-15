const express = require('express');
const rateLimit = require('express-rate-limit');
const auth = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });

router.get('/login', (req, res) => res.render('login', { title: 'Sign in', notice: req.query.reset ? 'Password updated. Sign in with your new password.' : '' }));
router.post('/login', authLimiter, auth.login);
router.get('/register', (req, res) => res.render('register', { title: 'Create an account' }));
router.post('/register', authLimiter, auth.register);
router.get('/forgot-password', (req, res) => res.render('forgot-password', { title: 'Reset password' }));
router.post('/forgot-password', authLimiter, auth.recoverPassword);
router.get('/setup-admin', async (req, res, next) => {
  try {
    const User = require('../models/User');
    if (await User.exists({ role: 'admin' })) return res.status(404).render('error', { title: 'Not found', message: 'This page is not available.' });
    res.render('setup-admin', { title: 'Create administrator' });
  } catch (error) { next(error); }
});
router.post('/setup-admin', authLimiter, auth.bootstrapAdmin);
router.get('/change-password', requireAuth, (req, res) => res.render('change-password', { title: 'Change password' }));
router.post('/logout', requireAuth, (req, res, next) => {
  req.session.destroy((error) => error ? next(error) : res.redirect('/'));
});
router.post('/change-password', requireAuth, auth.changePassword);

module.exports = router;
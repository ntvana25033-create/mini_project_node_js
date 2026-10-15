const express = require('express');
const rateLimit = require('express-rate-limit');
const api = require('../controllers/apiController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });

router.get('/csrf-token', (req, res) => res.json({ csrfToken: req.session.csrfToken }));
router.post('/auth/register', authLimiter, api.register);
router.post('/auth/login', authLimiter, api.login);
router.post('/auth/forgot-password', authLimiter, api.recoverPassword);
router.post('/auth/change-password', requireAuth, api.changePassword);
router.post('/auth/logout', requireAuth, (req, res, next) => req.session.destroy((error) => error ? next(error) : res.status(204).end()));
router.get('/books', api.listBooks);
router.get('/books/categories', api.categories);
router.get('/books/:id', api.bookDetail);
router.post('/books', requireRole('publisher'), api.submitBook);
router.get('/publisher/books', requireRole('publisher'), api.publisherBooks);
router.patch('/publisher/books/:id', requireRole('publisher'), api.updatePublisherBook);
router.post('/books/:id/reviews', requireRole('reader'), api.submitReview);
router.get('/books/:id/forum', api.listForum);
router.post('/books/:id/forum', requireRole('reader'), api.submitForum);
router.post('/books/:id/feedback', requireRole('reader'), api.submitFeedback);
router.get('/admin/users', requireRole('admin'), api.adminUsers);
router.get('/admin/feedback', requireRole('admin'), api.adminFeedback);
router.get('/admin/analysis', requireRole('admin'), api.adminAnalysis);
router.patch('/admin/books/:id', requireRole('admin'), api.moderateBook);

module.exports = router;
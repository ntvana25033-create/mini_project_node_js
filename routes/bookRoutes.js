const express = require('express');
const books = require('../controllers/bookController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', books.home);
router.get('/books/:id', books.showBook);
router.post('/publisher/books', requireRole('publisher'), books.submitBook);
router.get('/publisher/feedback', requireRole('publisher'), require('../controllers/dashboardController').publisherFeedback);
router.post('/books/:id/reviews', requireRole('reader'), books.submitReview);
router.post('/books/:id/forum', requireRole('reader'), books.submitForumPost);
router.post('/books/:id/feedback', requireRole('reader'), books.submitFeedback);
router.get('/dashboard', requireAuth, requireRole('reader', 'publisher', 'admin'), require('../controllers/dashboardController').dashboard);

module.exports = router;
const express = require('express');
const { requireRole } = require('../middleware/auth');
const dashboard = require('../controllers/dashboardController');
const router = express.Router();

router.use(requireRole('admin'));
router.get('/users', dashboard.userDetails);
router.get('/publishers', dashboard.publisherDetails);
router.get('/feedback', dashboard.viewFeedback);
router.post('/books/:id/moderate', dashboard.moderateBook);

module.exports = router;
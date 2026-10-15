const User = require('../models/User');
const Book = require('../models/Book');
const Review = require('../models/Review');
const Feedback = require('../models/Feedback');

async function dashboard(req, res) {
  const { id, role } = req.session.user;
  if (role === 'admin') {
    const [users, pendingBooks, publishedBooks, reviewCount, feedbackCount, analysis] = await Promise.all([
      User.find({}).select('displayName userId role createdAt').sort({ createdAt: -1 }).limit(100),
      Book.find({ status: 'pending' }).populate('publisher', 'displayName userId').sort({ createdAt: 1 }),
      Book.countDocuments({ status: 'published' }),
      Review.countDocuments(),
      Feedback.countDocuments(),
      Book.aggregate([
        { $match: { status: 'published' } },
        { $lookup: { from: 'reviews', localField: '_id', foreignField: 'book', as: 'reviews' } },
        { $group: {
          _id: '$category',
          books: { $sum: 1 },
          averageRating: { $avg: { $avg: '$reviews.rating' } }
        } },
        { $sort: { books: -1 } }
      ])
    ]);
    return res.render('dashboard-admin', {
      title: 'Admin desk', users, pendingBooks, publishedBooks, reviewCount, feedbackCount, analysis
    });
  }

  if (role === 'publisher') {
    const books = await Book.find({ publisher: id }).sort({ createdAt: -1 });
    return res.render('dashboard-publisher', { title: 'Publisher desk', books });
  }

  const [user, recommendations] = await Promise.all([
    User.findById(id).select('interests'),
    Book.find({ status: 'published' }).sort({ publishedAt: -1, createdAt: -1 }).limit(8)
  ]);
  const interests = user?.interests || [];
  const recommended = interests.length ? recommendations.filter((book) => interests.includes(book.category)) : recommendations;
  res.render('dashboard-reader', { title: 'Your reading desk', recommendations: recommended });
}

async function userDetails(req, res) {
  const users = await User.find({}).select('displayName userId email role zipCode mobile createdAt').sort({ createdAt: -1 });
  res.render('user-details', { title: 'User directory', users });
}

async function publisherDetails(req, res) {
  const publishers = await User.find({ role: 'publisher' }).select('displayName userId email createdAt').sort({ createdAt: -1 });
  res.render('publisher-details', { title: 'Publisher directory', publishers });
}

async function viewFeedback(req, res) {
  const feedback = await Feedback.find({}).populate('book', 'title').populate('user', 'displayName userId').sort({ createdAt: -1 });
  res.render('feedback-list', { title: 'Reader feedback', feedback });
}

async function publisherFeedback(req, res) {
  const books = await Book.find({ publisher: req.session.user.id }).select('_id title');
  const feedback = await Feedback.find({ book: { $in: books.map((book) => book._id) } })
    .populate('book', 'title')
    .populate('user', 'displayName userId')
    .sort({ createdAt: -1 });
  res.render('feedback-list', { title: 'Reader feedback', feedback });
}

async function moderateBook(req, res) {
  const { status } = req.body;
  if (!['published', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid book status.' });
  const update = { status, publishedAt: status === 'published' ? new Date() : null };
  const book = await Book.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  res.redirect('/dashboard');
}

module.exports = { dashboard, userDetails, publisherDetails, viewFeedback, publisherFeedback, moderateBook };
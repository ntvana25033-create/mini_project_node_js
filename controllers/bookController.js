const Book = require('../models/Book');
const Review = require('../models/Review');
const ForumPost = require('../models/ForumPost');
const Feedback = require('../models/Feedback');

const categories = ['Fiction', 'Science', 'Technology', 'Mystery', 'History', 'Business', 'Other'];

async function home(req, res) {
  const { q = '', category = '' } = req.query;
  const filter = { status: 'published' };
  if (category && categories.includes(category)) filter.category = category;
  if (q.trim()) {
    filter.$or = [
      { title: { $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      { author: { $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }
    ];
  }
  const books = await Book.find(filter).populate('publisher', 'displayName').sort({ publishedAt: -1, createdAt: -1 }).limit(60);
  const ratings = await Review.aggregate([
    { $group: { _id: '$book', average: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  const ratingByBook = new Map(ratings.map((item) => [String(item._id), item]));
  res.render('home', { title: 'Book reviews before the shelves', books, categories, q, category, ratingByBook });
}

async function showBook(req, res) {
  const book = await Book.findById(req.params.id).populate('publisher', 'displayName');
  const canPreview = book && book.status !== 'published'
    && (req.session.user?.role === 'admin' || String(book.publisher?._id) === req.session.user?.id);
  if (book && book.status !== 'published' && !canPreview) {
    return res.status(404).render('error', { title: 'Book not found', message: 'This book is not available.' });
  }
  if (!book) return res.status(404).render('error', { title: 'Book not found', message: 'This book is not available.' });
  const [reviews, posts, feedback] = await Promise.all([
    Review.find({ book: book.id }).populate('user', 'displayName').sort({ createdAt: -1 }),
    ForumPost.find({ book: book.id }).populate('user', 'displayName').sort({ createdAt: -1 }).limit(40),
    Feedback.find({ book: book.id }).populate('user', 'displayName').sort({ createdAt: -1 }).limit(20)
  ]);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  res.render('book-detail', { title: book.title, book, reviews, posts, feedback, average });
}

async function submitBook(req, res) {
  const { title, author, category, description, coverUrl } = req.body;
  if (!title || !author || !categories.includes(category) || !description) {
    return res.status(400).render('error', { title: 'Check book details', message: 'Complete the required fields and choose a category.' });
  }
  await Book.create({ title, author, category, description, coverUrl, publisher: req.session.user.id });
  res.redirect('/dashboard?submitted=1');
}

async function submitReview(req, res) {
  const book = await Book.findOne({ _id: req.params.id, status: 'published' });
  if (!book) return res.status(404).render('error', { title: 'Book not found', message: 'This book is not available.' });
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) {
    return res.status(400).render('error', { title: 'Check your review', message: 'Choose a rating from 1 to 5 and add a comment.' });
  }
  try {
    await Review.create({ book: req.params.id, user: req.session.user.id, rating, comment });
  } catch (error) {
    if (error.code === 11000) return res.status(409).render('error', { title: 'Already reviewed', message: 'You can leave one review per book.' });
    throw error;
  }
  res.redirect(`/books/${req.params.id}#reviews`);
}

async function submitForumPost(req, res) {
  const book = await Book.findOne({ _id: req.params.id, status: 'published' });
  if (!book) return res.status(404).render('error', { title: 'Book not found', message: 'This book is not available.' });
  const message = String(req.body.message || '').trim();
  if (!message) return res.status(400).render('error', { title: 'Write a message', message: 'Forum messages cannot be empty.' });
  await ForumPost.create({ book: req.params.id, user: req.session.user.id, message });
  res.redirect(`/books/${req.params.id}#forum`);
}

async function submitFeedback(req, res) {
  const book = await Book.findOne({ _id: req.params.id, status: 'published' });
  if (!book) return res.status(404).render('error', { title: 'Book not found', message: 'This book is not available.' });
  const message = String(req.body.message || '').trim();
  if (!message) return res.status(400).render('error', { title: 'Write feedback', message: 'Feedback cannot be empty.' });
  await Feedback.create({ book: req.params.id, user: req.session.user.id, message });
  res.redirect(`/books/${req.params.id}#feedback`);
}

module.exports = { home, showBook, submitBook, submitReview, submitForumPost, submitFeedback, categories };
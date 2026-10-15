const Book = require('../models/Book');
const User = require('../models/User');
const Review = require('../models/Review');
const ForumPost = require('../models/ForumPost');
const Feedback = require('../models/Feedback');

function establishSession(req, user) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      req.session.user = { id: user.id, displayName: user.displayName, userId: user.userId, role: user.role };
      resolve();
    });
  });
}

async function register(req, res) {
  const { displayName, userId, email, password, zipCode, mobile, role, interests } = req.body;
  if (!displayName || !userId || !password || password.length < 8 || !zipCode || !mobile || !['reader', 'publisher'].includes(role)) {
    return res.status(400).json({ error: 'Complete all required fields; passwords must contain at least 8 characters.' });
  }
  const normalizedId = String(userId).toLowerCase();
  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(userId)) return res.status(400).json({ error: 'Invalid user ID.' });
  if (await User.exists({ userId: normalizedId })) return res.status(409).json({ error: 'USER ID ALREADY EXISTS' });
  const allowedInterests = ['Fiction', 'Science', 'Technology', 'Mystery', 'History', 'Business', 'Other'];
  const selectedInterests = (Array.isArray(interests) ? interests : interests ? [interests] : []).filter((item) => allowedInterests.includes(item));
  const user = await User.create({ displayName, userId: normalizedId, email, password, zipCode, mobile, role, interests: role === 'reader' ? selectedInterests : [] });
  await establishSession(req, user);
  res.status(201).json({ id: user.id, displayName: user.displayName, userId: user.userId, role: user.role });
}

async function login(req, res) {
  const user = await User.findOne({ userId: String(req.body.userId || '').toLowerCase() });
  if (!user || !(await user.checkPassword(req.body.password || ''))) {
    return res.status(401).json({ error: 'NOT A VALID USERNAME' });
  }
  await establishSession(req, user);
  res.json({ id: user.id, displayName: user.displayName, userId: user.userId, role: user.role });
}

async function recoverPassword(req, res) {
  const { userId, zipCode, mobile, newPassword, confirmPassword } = req.body;
  const user = await User.findOne({ userId: String(userId || '').toLowerCase(), zipCode, mobile });
  if (!user) return res.status(404).json({ error: 'The account details could not be verified.' });
  if (!newPassword || newPassword.length < 8 || newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Use a matching password of at least 8 characters.' });
  }
  user.password = newPassword;
  await user.save();
  res.json({ status: 'password_updated' });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = await User.findById(req.session.user.id);
  if (!user || !(await user.checkPassword(currentPassword || ''))) return res.status(400).json({ error: 'OLD PASSWORD DOES NOT MATCH WITH THE NEW PASSWORD' });
  if (!newPassword || newPassword.length < 8 || newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Use a matching password of at least 8 characters.' });
  }
  user.password = newPassword;
  await user.save();
  res.json({ status: 'password_updated' });
}

async function listBooks(req, res) {
  const filter = { status: 'published' };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.search) {
    const term = String(req.query.search).trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ title: { $regex: term, $options: 'i' } }, { author: { $regex: term, $options: 'i' } }];
  }
  const books = await Book.find(filter).populate('publisher', 'displayName').sort({ publishedAt: -1 }).limit(60);
  res.json(books);
}

async function bookDetail(req, res) {
  const book = await Book.findOne({ _id: req.params.id, status: 'published' }).populate('publisher', 'displayName');
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  const [rating, reviews] = await Promise.all([
    Review.aggregate([{ $match: { book: book._id } }, { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }]),
    Review.find({ book: book.id }).populate('user', 'displayName').sort({ createdAt: -1 })
  ]);
  res.json({ book, rating: rating[0] || { average: 0, count: 0 }, reviews });
}

async function submitBook(req, res) {
  const { title, author, category, description, coverUrl } = req.body;
  const categories = ['Fiction', 'Science', 'Technology', 'Mystery', 'History', 'Business', 'Other'];
  if (!title || !author || !categories.includes(category) || !description) return res.status(400).json({ error: 'Invalid book details.' });
  const book = await Book.create({ title, author, category, description, coverUrl, publisher: req.session.user.id });
  res.status(201).json(book);
}

async function publisherBooks(req, res) {
  res.json(await Book.find({ publisher: req.session.user.id }).sort({ createdAt: -1 }));
}

async function updatePublisherBook(req, res) {
  const book = await Book.findOne({
    _id: req.params.id,
    publisher: req.session.user.id,
    status: { $in: ['pending', 'rejected'] }
  });
  if (!book) return res.status(404).json({ error: 'Book not found or it can no longer be edited.' });
  const { title, author, category, description, coverUrl } = req.body;
  const categories = ['Fiction', 'Science', 'Technology', 'Mystery', 'History', 'Business', 'Other'];
  if (!title || !author || !categories.includes(category) || !description) return res.status(400).json({ error: 'Invalid book details.' });
  Object.assign(book, { title, author, category, description, coverUrl, status: 'pending', publishedAt: null });
  await book.save();
  res.json(book);
}

async function submitReview(req, res) {
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim();
  const book = await Book.findOne({ _id: req.params.id, status: 'published' });
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) return res.status(400).json({ error: 'Provide a rating from 1 to 5 and a comment.' });
  try {
    const review = await Review.create({ book: book.id, user: req.session.user.id, rating, comment });
    res.status(201).json(review);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'You can leave one review per book.' });
    throw error;
  }
}

async function listForum(req, res) {
  const posts = await ForumPost.find({ book: req.params.id }).populate('user', 'displayName').sort({ createdAt: -1 }).limit(40);
  res.json(posts);
}

async function submitForum(req, res) {
  const book = await Book.findOne({ _id: req.params.id, status: 'published' });
  const message = String(req.body.message || '').trim();
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  if (!message) return res.status(400).json({ error: 'Message cannot be empty.' });
  res.status(201).json(await ForumPost.create({ book: book.id, user: req.session.user.id, message }));
}

async function submitFeedback(req, res) {
  const book = await Book.findOne({ _id: req.params.id, status: 'published' });
  const message = String(req.body.message || '').trim();
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  if (!message) return res.status(400).json({ error: 'Feedback cannot be empty.' });
  res.status(201).json(await Feedback.create({ book: book.id, user: req.session.user.id, message }));
}

async function categories(req, res) {
  res.json(await Book.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: '$category', books: { $sum: 1 } } },
    { $sort: { books: -1 } }
  ]));
}

async function adminUsers(req, res) {
  res.json(await User.find({}).select('displayName userId email role createdAt').sort({ createdAt: -1 }));
}

async function adminFeedback(req, res) {
  res.json(await Feedback.find({}).populate('book', 'title').populate('user', 'displayName userId').sort({ createdAt: -1 }).limit(200));
}

async function adminAnalysis(req, res) {
  res.json(await Book.aggregate([
    { $match: { status: 'published' } },
    { $lookup: { from: 'reviews', localField: '_id', foreignField: 'book', as: 'reviews' } },
    { $group: { _id: '$category', books: { $sum: 1 }, reviews: { $sum: { $size: '$reviews' } }, averageRating: { $avg: { $avg: '$reviews.rating' } } } },
    { $sort: { books: -1 } }
  ]));
}

async function moderateBook(req, res) {
  const { status } = req.body;
  if (!['published', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid book status.' });
  const book = await Book.findByIdAndUpdate(req.params.id, {
    status,
    publishedAt: status === 'published' ? new Date() : null
  }, { new: true });
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  res.json(book);
}

module.exports = { register, login, recoverPassword, changePassword, listBooks, bookDetail, submitBook, publisherBooks, updatePublisherBook, submitReview, listForum, submitForum, submitFeedback, categories, adminUsers, adminFeedback, adminAnalysis, moderateBook };
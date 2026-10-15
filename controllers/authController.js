const User = require('../models/User');

function pageError(res, title, message, status = 400) {
  return res.status(status).render('error', { title, message });
}

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
  const { displayName, userId, email, password, confirmPassword, zipCode, mobile, role, interests } = req.body;
  if (!displayName || !userId || !password || !zipCode || !mobile) {
    return pageError(res, 'Missing details', 'Please complete all required fields.');
  }
  if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(userId)) {
    return pageError(res, 'Invalid user ID', 'Use 3 to 40 letters, numbers, dots, dashes or underscores.');
  }
  if (password.length < 8 || password !== confirmPassword) {
    return pageError(res, 'Check your password', 'Use at least 8 characters and make both password fields match.');
  }
  if (!['reader', 'publisher'].includes(role)) {
    return pageError(res, 'Invalid role', 'Choose reader or publisher.');
  }
  const exists = await User.exists({ userId: userId.toLowerCase() });
  if (exists) return pageError(res, 'User ID already exists', 'USER ID ALREADY EXISTS');

  const allowedInterests = ['Fiction', 'Science', 'Technology', 'Mystery', 'History', 'Business', 'Other'];
  const selectedInterests = (Array.isArray(interests) ? interests : interests ? [interests] : []).filter((item) => allowedInterests.includes(item));
  const user = await User.create({ displayName, userId, email, password, zipCode, mobile, role, interests: role === 'reader' ? selectedInterests : [] });
  await establishSession(req, user);
  res.redirect('/dashboard');
}

async function login(req, res) {
  const { userId, password } = req.body;
  const user = await User.findOne({ userId: String(userId || '').toLowerCase() });
  if (!user || !(await user.checkPassword(password || ''))) {
    return pageError(res, 'Sign in failed', 'NOT A VALID USERNAME', 401);
  }
  await establishSession(req, user);
  res.redirect('/dashboard');
}

async function recoverPassword(req, res) {
  const { userId, zipCode, mobile, newPassword, confirmPassword } = req.body;
  const user = await User.findOne({ userId: String(userId || '').toLowerCase(), zipCode, mobile });
  if (!user) return pageError(res, 'Details did not match', 'The account details could not be verified.', 404);
  if (!newPassword || newPassword.length < 8 || newPassword !== confirmPassword) {
    return pageError(res, 'Choose a new password', 'Use at least 8 characters and make both password fields match.');
  }
  user.password = newPassword;
  await user.save();
  res.redirect('/login?reset=1');
}

async function changePassword(req, res) {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = await User.findById(req.session.user.id);
  if (!user || !(await user.checkPassword(currentPassword || ''))) {
    return pageError(res, 'Password not changed', 'OLD PASSWORD DOES NOT MATCH WITH THE NEW PASSWORD');
  }
  if (!newPassword || newPassword.length < 8 || newPassword !== confirmPassword) {
    return pageError(res, 'Choose a new password', 'Use at least 8 characters and make both password fields match.');
  }
  user.password = newPassword;
  await user.save();
  res.redirect('/dashboard?password=changed');
}

async function bootstrapAdmin(req, res) {
  const adminExists = await User.exists({ role: 'admin' });
  if (adminExists) return res.status(404).render('error', { title: 'Not found', message: 'This page is not available.' });
  const { displayName, userId, email, password, confirmPassword, zipCode, mobile } = req.body;
  if (!displayName || !userId || !password || password.length < 12 || password !== confirmPassword || !zipCode || !mobile) {
    return pageError(res, 'Check the details', 'Complete all fields, match both password fields, and use at least 12 characters.');
  }
  if (await User.exists({ userId: userId.toLowerCase() })) return pageError(res, 'User ID already exists', 'USER ID ALREADY EXISTS');
  const admin = await User.create({ displayName, userId, email, password, zipCode, mobile, role: 'admin' });
  await establishSession(req, admin);
  res.redirect('/dashboard');
}

module.exports = { register, login, recoverPassword, changePassword, bootstrapAdmin };
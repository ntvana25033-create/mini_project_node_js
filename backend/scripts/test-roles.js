const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/database');
const appConfig = require('../../app.config.cjs');
const User = require('../models/User');
const Book = require('../models/Book');
const Review = require('../models/Review');
const ForumPost = require('../models/ForumPost');
const Feedback = require('../models/Feedback');

const baseUrl = process.env.TEST_BASE_URL || `http://${appConfig.backend.host}:${appConfig.backend.port}`;
const runId = Date.now().toString(36);
const prefix = `e2e-${runId}`;
const ids = {
  admin: `${prefix}-admin`,
  publisher: `${prefix}-publisher`,
  reader: `${prefix}-reader`
};
const passwords = {
  admin: 'E2E-Admin-Password-2026!',
  publisher: 'E2E-Publisher-Password-2026!',
  reader: 'E2E-Reader-Password-2026!',
  recovered: 'E2E-Recovered-Password-2026!',
  changed: 'E2E-Changed-Password-2026!'
};
const sessions = new Map();
let checks = 0;

async function request(role, route, options = {}) {
  const headers = new Headers(options.headers || {});
  if (sessions.has(role)) headers.set('cookie', sessions.get(role));
  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof URLSearchParams)) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(body);
  }
  const response = await fetch(`${baseUrl}${route}`, {
    method: options.method || 'GET',
    headers,
    body,
    redirect: 'manual'
  });
  const cookie = response.headers.get('set-cookie');
  if (cookie) sessions.set(role, cookie.split(';', 1)[0]);
  return response;
}

async function json(response) {
  const text = await response.text();
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

async function expectStatus(response, expected, label) {
  const payload = await json(response);
  assert.equal(response.status, expected, `${label}: expected HTTP ${expected}, got ${response.status}; response=${JSON.stringify(payload)}`);
  checks += 1;
  console.log(`PASS ${label}`);
  return payload;
}

async function csrf(role) {
  const response = await request(role, '/api/csrf-token');
  const payload = await expectStatus(response, 200, `${role} CSRF token`);
  assert.equal(payload.csrfToken.length, 64);
  return payload.csrfToken;
}

async function post(role, route, body, method = 'POST') {
  return request(role, route, {
    method,
    headers: { 'x-csrf-token': await csrf(role) },
    body
  });
}

async function removeTestData() {
  const users = await User.find({ userId: { $in: Object.values(ids) } }).select('_id');
  const userIds = users.map((user) => user._id);
  const books = await Book.find({ publisher: { $in: userIds } }).select('_id');
  const bookIds = books.map((book) => book._id);
  await Promise.all([
    Review.deleteMany({ $or: [{ user: { $in: userIds } }, { book: { $in: bookIds } }] }),
    ForumPost.deleteMany({ $or: [{ user: { $in: userIds } }, { book: { $in: bookIds } }] }),
    Feedback.deleteMany({ $or: [{ user: { $in: userIds } }, { book: { $in: bookIds } }] }),
    Book.deleteMany({ publisher: { $in: userIds } }),
    User.deleteMany({ _id: { $in: userIds } })
  ]);
  await mongoose.connection.db.collection('sessions').deleteMany({ session: { $regex: prefix } });
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  try {
    await expectStatus(await request('guest', '/api/health'), 200, 'REST API health endpoint');
    const existingAdmin = await User.exists({ role: 'admin' });
    assert.equal(existingAdmin, null, 'Role E2E requires the one-time admin setup to be unused.');
    assert.equal(await User.exists({ userId: { $in: Object.values(ids) } }), null);

    const setup = await post('admin', '/api/auth/setup-admin', {
      displayName: 'E2E Administrator',
      userId: ids.admin,
      email: `${ids.admin}@example.test`,
      zipCode: '10001',
      mobile: '5550101',
      password: passwords.admin,
      confirmPassword: passwords.admin
    });
    await expectStatus(setup, 201, 'first administrator setup API');
    const adminSession = await expectStatus(await request('admin', '/api/auth/session'), 200, 'admin session API');
    assert.equal(adminSession.user.role, 'admin');
    const setupStatus = await expectStatus(await request('guest', '/api/auth/setup-admin'), 200, 'administrator setup status');
    assert.equal(setupStatus.available, false);
    const secondAdmin = await post('guest', '/api/auth/setup-admin', {
      displayName: 'Second Administrator', userId: `${prefix}-second-admin`,
      password: passwords.admin, confirmPassword: passwords.admin, zipCode: '10001', mobile: '5550101'
    });
    await expectStatus(secondAdmin, 409, 'second administrator setup blocked');

    const publisherRegistration = await post('publisher', '/api/auth/register', {
      displayName: 'E2E Publisher', userId: ids.publisher, email: `${ids.publisher}@example.test`,
      password: passwords.publisher, zipCode: '20002', mobile: '5550102', role: 'publisher'
    });
    await expectStatus(publisherRegistration, 201, 'publisher registration');
    const publisherSession = await expectStatus(await request('publisher', '/api/auth/session'), 200, 'publisher session API');
    assert.equal(publisherSession.user.role, 'publisher');
    const bookResponse = await post('publisher', '/api/books', {
      title: 'E2E Test Book', author: 'Test Author', category: 'Technology', description: 'A temporary book for role testing.'
    });
    const book = await expectStatus(bookResponse, 201, 'publisher submits book');
    assert.equal(book.status, 'pending');
    const adminPreview = await expectStatus(await request('admin', `/api/admin/books/${book._id}`), 200, 'admin previews pending book');
    assert.equal(adminPreview.book.status, 'pending');
    await expectStatus(await request('publisher', `/api/admin/books/${book._id}`), 403, 'publisher cannot use admin preview');
    const editPending = await post('publisher', `/api/publisher/books/${book._id}`, {
      title: 'E2E Test Book Revised', author: 'Test Author', category: 'Technology',
      description: 'An updated temporary book for role testing.'
    }, 'PATCH');
    const revisedBook = await expectStatus(editPending, 200, 'publisher edits pending book');
    assert.equal(revisedBook.title, 'E2E Test Book Revised');
    const publisherBooks = await expectStatus(await request('publisher', '/api/publisher/books'), 200, 'publisher book list API');
    assert.equal(publisherBooks[0].title, 'E2E Test Book Revised');
    await expectStatus(await request('publisher', '/api/admin/users'), 403, 'publisher blocked from admin API');

    const readerRegistration = await post('reader', '/api/auth/register', {
      displayName: 'E2E Reader', userId: ids.reader, email: `${ids.reader}@example.test`,
      password: passwords.reader, zipCode: '30003', mobile: '5550103', role: 'reader', interests: ['Technology']
    });
    await expectStatus(readerRegistration, 201, 'reader registration');
    await expectStatus(await request('reader', '/api/publisher/books'), 403, 'reader blocked from publisher API');
    await expectStatus(await request('reader', '/api/admin/users'), 403, 'reader blocked from admin API');
    const publicBooksBeforeApproval = await json(await request('reader', '/api/books'));
    assert.equal(publicBooksBeforeApproval.length, 0);
    checks += 1;
    console.log('PASS pending book hidden from readers');
    await expectStatus(await post('reader', `/api/books/${book._id}/reviews`, { rating: 5, comment: 'Before approval' }), 404, 'reader cannot review pending book');
    await expectStatus(await post('reader', `/api/books/${book._id}/forum`, { message: 'Before approval' }), 404, 'reader cannot post to pending book forum');
    await expectStatus(await post('reader', `/api/books/${book._id}/feedback`, { message: 'Before approval' }), 404, 'reader cannot send feedback for pending book');

    const reject = await post('admin', `/api/admin/books/${book._id}`, { status: 'rejected' }, 'PATCH');
    const rejectedBook = await expectStatus(reject, 200, 'admin rejects book');
    assert.equal(rejectedBook.status, 'rejected');
    const editRejected = await post('publisher', `/api/publisher/books/${book._id}`, {
      title: 'E2E Test Book Revised', author: 'Test Author', category: 'Technology',
      description: 'Updated after moderator feedback.'
    }, 'PATCH');
    const resubmittedBook = await expectStatus(editRejected, 200, 'publisher edits rejected book');
    assert.equal(resubmittedBook.status, 'pending');

    const approve = await post('admin', `/api/admin/books/${book._id}`, { status: 'published' }, 'PATCH');
    const publishedBook = await expectStatus(approve, 200, 'admin approves book');
    assert.equal(publishedBook.status, 'published');
    const publicBooks = await json(await request('reader', '/api/books?search=E2E%20Test%20Book%20Revised&category=Technology'));
    assert.equal(publicBooks.length, 1);
    checks += 1;
    console.log('PASS reader searches approved book');
    const detail = await json(await request('reader', `/api/books/${book._id}`));
    assert.equal(detail.book.title, 'E2E Test Book Revised');
    checks += 1;
    console.log('PASS reader opens published book detail');

    await expectStatus(await post('reader', `/api/books/${book._id}/reviews`, { rating: 5, comment: 'A thoughtful first review.' }), 201, 'reader submits rating and review');
    await expectStatus(await post('reader', `/api/books/${book._id}/reviews`, { rating: 4, comment: 'A duplicate review.' }), 409, 'duplicate review rejected');
    await expectStatus(await post('reader', `/api/books/${book._id}/forum`, { message: 'A temporary forum post.' }), 201, 'reader posts in book forum');
    await expectStatus(await post('reader', `/api/books/${book._id}/feedback`, { message: 'A private note for the publisher.' }), 201, 'reader sends publisher feedback');
    const publisherFeedback = await expectStatus(await request('publisher', '/api/publisher/feedback'), 200, 'publisher views own feedback API');
    assert.equal(publisherFeedback[0].message, 'A private note for the publisher.');

    const analysis = await expectStatus(await request('admin', '/api/admin/analysis'), 200, 'admin category analysis API');
    assert.equal(analysis.find((item) => item._id === 'Technology')?.books, 1);
    const feedback = await expectStatus(await request('admin', '/api/admin/feedback'), 200, 'admin views feedback API');
    assert.equal(feedback.length, 1);
    await expectStatus(await request('admin', '/api/admin/users'), 200, 'admin views users API');
    assert.equal(analysis.some((item) => item._id === 'Technology'), true);

    const duplicateRegistration = await post('guest', '/api/auth/register', {
      displayName: 'Duplicate Reader', userId: ids.reader, password: passwords.reader,
      zipCode: '30003', mobile: '5550103', role: 'reader'
    });
    const duplicateResult = await expectStatus(duplicateRegistration, 409, 'duplicate user ID rejected');
    assert.equal(duplicateResult.error, 'USER ID ALREADY EXISTS');
    const wrongLogin = await post('guest', '/api/auth/login', { userId: 'not-a-user', password: 'wrong-password' });
    const wrongLoginResult = await expectStatus(wrongLogin, 401, 'invalid login rejected');
    assert.equal(wrongLoginResult.error, 'NOT A VALID USERNAME');

    const recovery = await post('guest', '/api/auth/forgot-password', {
      userId: ids.reader, zipCode: '30003', mobile: '5550103',
      newPassword: passwords.recovered, confirmPassword: passwords.recovered
    });
    await expectStatus(recovery, 200, 'password recovery verifies ZIP and mobile');
    const wrongOldPassword = await post('reader', '/api/auth/change-password', {
      currentPassword: passwords.reader, newPassword: passwords.changed, confirmPassword: passwords.changed
    });
    const wrongOldPasswordResult = await expectStatus(wrongOldPassword, 400, 'incorrect current password rejected');
    assert.equal(wrongOldPasswordResult.error, 'OLD PASSWORD DOES NOT MATCH WITH THE NEW PASSWORD');
    await expectStatus(await post('reader', '/api/auth/change-password', {
      currentPassword: passwords.recovered, newPassword: passwords.changed, confirmPassword: passwords.changed
    }), 200, 'reader changes password');
    const oldPasswordLogin = await post('guest', '/api/auth/login', { userId: ids.reader, password: passwords.reader });
    await expectStatus(oldPasswordLogin, 401, 'previous password no longer works');
    await expectStatus(await post('guest', '/api/auth/login', { userId: ids.reader, password: passwords.changed }), 200, 'updated password logs in');

    for (const role of ['admin', 'publisher', 'reader']) {
      await expectStatus(await post(role, '/api/auth/logout', {}), 204, `${role} logout`);
      const loggedOut = await expectStatus(await request(role, '/api/auth/session'), 200, `${role} session cleared`);
      assert.equal(loggedOut.user, null);
    }
    console.log(`\nAll ${checks} role and workflow checks passed.`);
  } finally {
    await removeTestData();
    await mongoose.disconnect();
    console.log('Temporary E2E accounts and records removed.');
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
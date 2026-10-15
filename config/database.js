const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/book_review_portal';

async function connectDatabase() {
  await mongoose.connect(MONGODB_URI);
  const collections = await mongoose.connection.db.listCollections({ name: 'users' }, { nameOnly: true }).toArray();
  if (!collections.length) await mongoose.connection.db.createCollection('users');
  console.log('Connected to MongoDB: book_review_portal');
}

module.exports = { connectDatabase, MONGODB_URI };
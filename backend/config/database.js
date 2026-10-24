const mongoose = require('mongoose');
const appConfig = require('../../app.config.cjs');

const MONGODB_URI = process.env.MONGODB_URI || appConfig.database.uri;

async function connectDatabase() {
  await mongoose.connect(MONGODB_URI);
  const collections = await mongoose.connection.db.listCollections({ name: 'users' }, { nameOnly: true }).toArray();
  if (!collections.length) await mongoose.connection.db.createCollection('users');
  console.log(`Connected to MongoDB: ${mongoose.connection.name}`);
}

module.exports = { connectDatabase, MONGODB_URI };
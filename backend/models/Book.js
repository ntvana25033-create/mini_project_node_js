const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  author: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, enum: ['Fiction', 'Science', 'Technology', 'Mystery', 'History', 'Business', 'Other'] },
  description: { type: String, required: true, trim: true, maxlength: 4000 },
  coverUrl: { type: String, trim: true, maxlength: 1000, default: '' },
  publisher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'published', 'rejected'], default: 'pending' },
  publishedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

bookSchema.index({ title: 'text', author: 'text', description: 'text' });

module.exports = mongoose.model('Book', bookSchema);
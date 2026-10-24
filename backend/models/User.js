const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  displayName: { type: String, required: true, trim: true, maxlength: 80 },
  userId: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 40 },
  email: { type: String, trim: true, lowercase: true, maxlength: 120 },
  password: { type: String, required: true, minlength: 8 },
  role: { type: String, enum: ['reader', 'publisher', 'admin'], default: 'reader' },
  zipCode: { type: String, required: true, trim: true, maxlength: 16 },
  mobile: { type: String, required: true, trim: true, maxlength: 24 },
  interests: [{ type: String, trim: true }],
  createdAt: { type: Date, default: Date.now }
});

userSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: 'admin' } });

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.checkPassword = function checkPassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
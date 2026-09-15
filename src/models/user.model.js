import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import serialize from './plugins/serialize.js';
import { ACCOUNT_STATUS, SYSTEM_ROLE } from '../constants/roles.js';

const HASH_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    avatarUrl: { type: String, default: null },
    role: { type: String, enum: Object.values(SYSTEM_ROLE), default: SYSTEM_ROLE.USER },
    status: { type: String, enum: Object.values(ACCOUNT_STATUS), default: ACCOUNT_STATUS.ACTIVE },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

userSchema.index({ name: 'text', email: 'text' }, { weights: { name: 4, email: 1 }, name: 'user_search_idx' });
userSchema.index({ status: 1, createdAt: -1 });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await bcrypt.hash(this.password, HASH_ROUNDS);
  this.passwordChangedAt = new Date();
});

userSchema.methods.verifyPassword = function verifyPassword(plainText) {
  return bcrypt.compare(plainText, this.password);
};

userSchema.methods.isActive = function isActive() {
  return this.status === ACCOUNT_STATUS.ACTIVE;
};

userSchema.plugin(serialize);

export default mongoose.model('User', userSchema);

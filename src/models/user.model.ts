import bcrypt from 'bcryptjs';
import mongoose, { type HydratedDocument, type Model } from 'mongoose';

import serialize from './plugins/serialize.js';
import { ACCOUNT_STATUS, SYSTEM_ROLE, type AccountStatus, type SystemRole } from '../constants/roles.js';

const HASH_ROUNDS = 12;

export interface UserFields {
  name: string;
  email: string;
  password: string;
  avatarUrl: string | null;
  role: SystemRole;
  status: AccountStatus;
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

interface UserMethods {
  verifyPassword(plainText: string): Promise<boolean>;
  isActive(): boolean;
}

type UserModel = Model<UserFields, object, UserMethods>;

export type UserDocument = HydratedDocument<UserFields, UserMethods>;

const userSchema = new mongoose.Schema<UserFields, UserModel, UserMethods>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    avatarUrl: { type: String, default: null },
    role: { type: String, enum: Object.values(SYSTEM_ROLE), default: SYSTEM_ROLE.USER },
    status: { type: String, enum: Object.values(ACCOUNT_STATUS), default: ACCOUNT_STATUS.ACTIVE },
    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 }
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

userSchema.method('verifyPassword', function verifyPassword(this: UserDocument, plainText: string) {
  return bcrypt.compare(plainText, this.password);
});

userSchema.method('isActive', function isActive(this: UserDocument) {
  return this.status === ACCOUNT_STATUS.ACTIVE;
});

userSchema.plugin(serialize);

export default mongoose.model<UserFields, UserModel>('User', userSchema);

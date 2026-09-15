import mongoose from 'mongoose';

import serialize from './plugins/serialize.js';

const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true },
    userAgent: { type: String, default: null },
    ip: { type: String, default: null },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

refreshTokenSchema.index({ user: 1, revokedAt: 1 });
refreshTokenSchema.index({ family: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

refreshTokenSchema.methods.isUsable = function isUsable() {
  return !this.revokedAt && this.expiresAt.getTime() > Date.now();
};

refreshTokenSchema.plugin(serialize);

export default mongoose.model('RefreshToken', refreshTokenSchema);

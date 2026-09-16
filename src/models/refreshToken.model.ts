import mongoose, { type HydratedDocument, type Model, type Types } from 'mongoose';

import serialize from './plugins/serialize.js';

export interface RefreshTokenFields {
  user: Types.ObjectId;
  tokenHash: string;
  family: string;
  userAgent: string | null;
  ip: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RefreshTokenMethods {
  isUsable(): boolean;
}

type RefreshTokenModel = Model<RefreshTokenFields, object, RefreshTokenMethods>;

export type RefreshTokenDocument = HydratedDocument<RefreshTokenFields, RefreshTokenMethods>;

const refreshTokenSchema = new mongoose.Schema<RefreshTokenFields, RefreshTokenModel, RefreshTokenMethods>(
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

refreshTokenSchema.method('isUsable', function isUsable(this: RefreshTokenDocument) {
  return !this.revokedAt && this.expiresAt.getTime() > Date.now();
});

refreshTokenSchema.plugin(serialize);

export default mongoose.model<RefreshTokenFields, RefreshTokenModel>('RefreshToken', refreshTokenSchema);

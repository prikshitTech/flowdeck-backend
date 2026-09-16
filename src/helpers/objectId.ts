import mongoose from 'mongoose';

export type Id = string | mongoose.Types.ObjectId;

export function toObjectId(value: unknown): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(String(value));
}

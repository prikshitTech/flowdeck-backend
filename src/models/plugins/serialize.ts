import type { Schema } from 'mongoose';

const HIDDEN_FIELDS = ['password', 'tokenHash', '__v'];

export default function serialize(schema: Schema): void {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret: Record<string, unknown>) {
      ret.id = String(ret._id);
      delete ret._id;

      for (const field of HIDDEN_FIELDS) {
        delete ret[field];
      }

      return ret;
    }
  });
}

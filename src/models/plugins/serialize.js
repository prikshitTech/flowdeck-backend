const HIDDEN_FIELDS = ['password', 'tokenHash', '__v'];

export default function serialize(schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;

      for (const field of HIDDEN_FIELDS) {
        delete ret[field];
      }

      return ret;
    }
  });
}

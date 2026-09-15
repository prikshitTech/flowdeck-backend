const STRIPPED = ['__v', 'password', 'tokenHash'];

export function withId(document) {
  if (!document || typeof document !== 'object') {
    return document;
  }

  const { _id, ...rest } = document;

  for (const field of STRIPPED) {
    delete rest[field];
  }

  return _id === undefined ? rest : { id: String(_id), ...rest };
}

export function withIds(documents) {
  return documents.map(withId);
}

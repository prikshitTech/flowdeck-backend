const STRIPPED = ['__v', 'password', 'tokenHash'];

export type Plain = Record<string, unknown>;

export function withId(document: unknown): Plain {
  if (!document || typeof document !== 'object') {
    return document as Plain;
  }

  const { _id, ...rest } = document as Plain;

  for (const field of STRIPPED) {
    delete rest[field];
  }

  return _id === undefined ? rest : { id: String(_id), ...rest };
}

export function withIds(documents: unknown[]): Plain[] {
  return documents.map((document) => withId(document));
}

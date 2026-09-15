const TARGETS = ['params', 'query', 'body'];

export default function validate(schemas) {
  return (req, res, next) => {
    for (const target of TARGETS) {
      const schema = schemas[target];

      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[target] ?? {});

      if (!result.success) {
        return next(result.error);
      }

      req[target] = result.data;
    }

    return next();
  };
}

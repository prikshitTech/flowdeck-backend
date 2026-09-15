import { z } from 'zod';

const PATH_PARAM_PREFIX = ':';

export function toSchema(zodSchema) {
  const { $schema, ...rest } = z.toJSONSchema(zodSchema, { io: 'input', unrepresentable: 'any' });

  return rest;
}

export function toOpenApiPath(expressPath) {
  return expressPath
    .split('/')
    .map((segment) => (segment.startsWith(PATH_PARAM_PREFIX) ? `{${segment.slice(1)}}` : segment))
    .join('/');
}

export function pathParameters(expressPath) {
  return expressPath
    .split('/')
    .filter((segment) => segment.startsWith(PATH_PARAM_PREFIX))
    .map((segment) => ({
      name: segment.slice(1),
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: 'Resource identifier'
    }));
}

export function queryParameters(zodSchema) {
  if (!zodSchema) {
    return [];
  }

  const { properties = {}, required = [] } = toSchema(zodSchema);

  return Object.entries(properties).map(([name, schema]) => ({
    name,
    in: 'query',
    required: required.includes(name),
    schema
  }));
}

export function requestBody(zodSchema) {
  if (!zodSchema) {
    return undefined;
  }

  return {
    required: true,
    content: { 'application/json': { schema: toSchema(zodSchema) } }
  };
}

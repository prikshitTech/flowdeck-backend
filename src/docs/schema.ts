import { z, type ZodType } from 'zod';

const PATH_PARAM_PREFIX = ':';

export type JsonSchema = Record<string, unknown>;

export interface Parameter {
  name: string;
  in: 'path' | 'query';
  required: boolean;
  schema: unknown;
  description?: string;
}

export function toSchema(zodSchema: ZodType): JsonSchema {
  const { $schema, ...rest } = z.toJSONSchema(zodSchema, { io: 'input', unrepresentable: 'any' });

  return rest;
}

export function toOpenApiPath(expressPath: string): string {
  return expressPath
    .split('/')
    .map((segment) => (segment.startsWith(PATH_PARAM_PREFIX) ? `{${segment.slice(1)}}` : segment))
    .join('/');
}

export function pathParameters(expressPath: string): Parameter[] {
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

export function queryParameters(zodSchema?: ZodType): Parameter[] {
  if (!zodSchema) {
    return [];
  }

  const { properties = {}, required = [] } = toSchema(zodSchema) as {
    properties?: Record<string, unknown>;
    required?: string[];
  };

  return Object.entries(properties).map(([name, schema]) => ({
    name,
    in: 'query',
    required: required.includes(name),
    schema
  }));
}

export function requestBody(zodSchema?: ZodType) {
  if (!zodSchema) {
    return undefined;
  }

  return {
    required: true,
    content: { 'application/json': { schema: toSchema(zodSchema) } }
  };
}

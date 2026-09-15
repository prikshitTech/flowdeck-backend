import { ENDPOINTS, TAGS } from './endpoints.js';
import { pathParameters, queryParameters, requestBody, toOpenApiPath } from './schema.js';

const API_PREFIX = '/api/v1';

const envelope = (dataSchema) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    message: { type: 'string' },
    data: dataSchema,
    meta: { type: 'object', additionalProperties: true }
  }
});

const errorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string' },
    code: { type: 'string' },
    details: { type: 'array', items: { type: 'object', additionalProperties: true }, nullable: true }
  }
};

const FAILURES = {
  400: 'Request rejected by a business rule',
  401: 'Missing, expired or revoked access token',
  403: 'Authenticated but not allowed at this role',
  404: 'Resource does not exist in this workspace',
  409: 'Conflicts with an existing record',
  422: 'Request payload failed validation',
  429: 'Rate limit or brute force guard tripped'
};

function failureResponses(endpoint) {
  const codes = [422, 429];

  if (endpoint.auth !== false) {
    codes.push(401, 403, 404);
  }

  return Object.fromEntries(
    codes
      .sort()
      .map((code) => [
        code,
        { description: FAILURES[code], content: { 'application/json': { schema: errorSchema } } }
      ])
  );
}

function successResponse(endpoint) {
  if (endpoint.binary) {
    return {
      description: 'File stream, 206 when a Range header is supplied',
      content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } }
    };
  }

  return {
    description: endpoint.summary,
    content: {
      'application/json': { schema: envelope({ type: 'object', additionalProperties: true, nullable: true }) }
    }
  };
}

function operationBody(endpoint) {
  if (endpoint.multipart) {
    return {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            required: ['file'],
            properties: {
              file: { type: 'string', format: 'binary' },
              entityType: { type: 'string' },
              entityId: { type: 'string' }
            }
          }
        }
      }
    };
  }

  return requestBody(endpoint.schema?.body);
}

function describe(endpoint) {
  const notes = [];

  if (endpoint.role) {
    notes.push(`Requires the workspace role **${endpoint.role}** or higher.`);
  }

  if (endpoint.auth === false) {
    notes.push('Open endpoint, no access token required.');
  }

  return notes.join(' ');
}

function buildOperation(endpoint) {
  const operation = {
    tags: [endpoint.tag],
    summary: endpoint.summary,
    description: describe(endpoint),
    parameters: [...pathParameters(endpoint.path), ...queryParameters(endpoint.schema?.query)],
    responses: {
      [endpoint.ok ?? 200]: successResponse(endpoint),
      ...failureResponses(endpoint)
    }
  };

  const body = operationBody(endpoint);

  if (body) {
    operation.requestBody = body;
  }

  if (endpoint.auth === false) {
    operation.security = [];
  }

  return operation;
}

export function buildDocument() {
  const paths = {};

  for (const endpoint of ENDPOINTS) {
    const route = `${API_PREFIX}${toOpenApiPath(endpoint.path)}`;

    paths[route] = paths[route] ?? {};
    paths[route][endpoint.method] = buildOperation(endpoint);
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'FlowDeck API',
      version: '1.0.0',
      description:
        'Workspaces, nested pages, kanban boards and channels for a small collaboration SaaS. ' +
        'Every response uses the same envelope and every request schema below is generated from ' +
        'the zod validators the server actually runs, so the documentation cannot drift from behaviour.'
    },
    servers: [{ url: 'http://localhost:4000', description: 'Local' }],
    tags: TAGS,
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        Envelope: envelope({ type: 'object', additionalProperties: true }),
        Error: errorSchema
      }
    },
    paths
  };
}

export default buildDocument();

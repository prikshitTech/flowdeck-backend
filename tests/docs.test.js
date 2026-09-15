import { ENDPOINTS, TAGS } from '../src/docs/endpoints.js';
import { api } from './helpers/factory.js';
import { buildDocument } from '../src/docs/openapi.js';

const SAMPLE_ID = '000000000000000000000000';
const MISSING_ROUTE_PREFIX = 'The requested route does not exist';

function concreteUrl(endpoint) {
  const path = endpoint.path
    .split('/')
    .map((segment) => (segment.startsWith(':') ? (segment === ':version' ? '1' : SAMPLE_ID) : segment))
    .join('/');

  return `/api/v1${path}`;
}

describe('api documentation', () => {
  const document = buildDocument();

  it('publishes a spec and a browsable ui', async () => {
    const spec = await api().get('/docs/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toBe('3.0.3');
    expect(spec.body.components.securitySchemes.bearerAuth.scheme).toBe('bearer');

    const ui = await api().get('/docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
  });

  it('documents one operation for every registered endpoint', () => {
    const operations = Object.values(document.paths).reduce(
      (total, methods) => total + Object.keys(methods).length,
      0
    );

    expect(operations).toBe(ENDPOINTS.length);
  });

  it('gives every operation a tag that exists and a success response', () => {
    const known = new Set(TAGS.map((tag) => tag.name));

    for (const [route, methods] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        const label = `${method.toUpperCase()} ${route}`;

        expect(known.has(operation.tags[0])).toBe(true);
        expect(operation.summary.length).toBeGreaterThan(0);
        expect(Object.keys(operation.responses).some((code) => code.startsWith('2'))).toBe(true);
        expect(label).toBe(label);
      }
    }
  });

  it('declares every path parameter that appears in a route', () => {
    for (const [route, methods] of Object.entries(document.paths)) {
      const expected = route
        .split('/')
        .filter((segment) => segment.startsWith('{'))
        .map((segment) => segment.slice(1, -1));

      for (const operation of Object.values(methods)) {
        const declared = operation.parameters.filter((item) => item.in === 'path').map((item) => item.name);

        expect(declared.sort()).toEqual(expected.sort());
      }
    }
  });

  it('routes every documented endpoint, so the spec cannot list something that does not exist', async () => {
    for (const endpoint of ENDPOINTS) {
      const response = await api()[endpoint.method](concreteUrl(endpoint));
      const message = String(response.body?.message ?? '');

      expect({ endpoint: `${endpoint.method} ${endpoint.path}`, missing: message.startsWith(MISSING_ROUTE_PREFIX) }).toEqual(
        { endpoint: `${endpoint.method} ${endpoint.path}`, missing: false }
      );
    }
  });

  it('protects every endpoint that is not explicitly public', async () => {
    const guarded = ENDPOINTS.filter((endpoint) => endpoint.auth !== false);

    for (const endpoint of guarded) {
      const response = await api()[endpoint.method](concreteUrl(endpoint));

      expect({ endpoint: `${endpoint.method} ${endpoint.path}`, status: response.status }).toEqual({
        endpoint: `${endpoint.method} ${endpoint.path}`,
        status: 401
      });
    }
  });
});

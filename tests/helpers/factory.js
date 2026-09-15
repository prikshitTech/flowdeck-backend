import supertest from 'supertest';

import app from '../../src/app.js';

export const api = () => supertest(app);

export const strongPassword = 'Str0ng!Passw0rd';

let sequence = 0;

export function uniqueEmail(prefix = 'user') {
  sequence += 1;
  return `${prefix}.${sequence}.${Date.now()}@flowdeck.test`;
}

export async function registerUser(overrides = {}) {
  const payload = {
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? uniqueEmail(),
    password: overrides.password ?? strongPassword
  };

  const response = await api().post('/api/v1/auth/register').send(payload);

  return {
    ...payload,
    id: response.body.data.user.id,
    accessToken: response.body.data.accessToken,
    refreshToken: response.body.data.refreshToken,
    headers: { Authorization: `Bearer ${response.body.data.accessToken}` }
  };
}

export async function createWorkspace(owner, overrides = {}) {
  const response = await api()
    .post('/api/v1/workspaces')
    .set(owner.headers)
    .send({ name: overrides.name ?? 'Test Workspace', description: overrides.description ?? 'For testing' });

  return response.body.data;
}

export async function addMember(owner, workspaceId, member, role = 'member') {
  return api()
    .post(`/api/v1/workspaces/${workspaceId}/members`)
    .set(owner.headers)
    .send({ email: member.email, role });
}

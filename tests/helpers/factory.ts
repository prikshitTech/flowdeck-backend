import supertest from 'supertest';

import app from '../../src/app.js';

export const api = () => supertest(app);

export type Row = Record<string, any>;

export const strongPassword = 'Str0ng!Passw0rd';

export interface TestUser {
  name: string;
  email: string;
  password: string;
  id: string;
  accessToken: string;
  refreshToken: string;
  headers: { Authorization: string };
}

export interface TestWorkspace {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
}

interface UserOverrides {
  name?: string;
  email?: string;
  password?: string;
}

let sequence = 0;

export function uniqueEmail(prefix = 'user'): string {
  sequence += 1;
  return `${prefix}.${sequence}.${Date.now()}@flowdeck.test`;
}

export async function registerUser(overrides: UserOverrides = {}): Promise<TestUser> {
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

export async function createWorkspace(
  owner: TestUser,
  overrides: { name?: string; description?: string } = {}
): Promise<TestWorkspace> {
  const response = await api()
    .post('/api/v1/workspaces')
    .set(owner.headers)
    .send({ name: overrides.name ?? 'Test Workspace', description: overrides.description ?? 'For testing' });

  return response.body.data;
}

export async function addMember(owner: TestUser, workspaceId: string, member: TestUser, role = 'member') {
  return api()
    .post(`/api/v1/workspaces/${workspaceId}/members`)
    .set(owner.headers)
    .send({ email: member.email, role });
}

export function workspaceUrl(workspaceId: string, suffix = ''): string {
  return `/api/v1/workspaces/${workspaceId}${suffix}`;
}

export async function setupWorkspace({ memberRole = 'member' }: { memberRole?: string } = {}) {
  const owner = await registerUser({ name: 'Owner' });
  const member = await registerUser({ name: 'Member' });
  const outsider = await registerUser({ name: 'Outsider' });
  const workspace = await createWorkspace(owner);

  await addMember(owner, workspace.id, member, memberRole);

  return {
    owner,
    member,
    outsider,
    workspace,
    url: (suffix: string) => workspaceUrl(workspace.id, suffix)
  };
}

export async function createBoardWithLists(owner: TestUser, workspaceId: string, name = 'Test Board') {
  const created = await api().post(workspaceUrl(workspaceId, '/boards')).set(owner.headers).send({ name });
  const snapshot = await api()
    .get(workspaceUrl(workspaceId, `/boards/${created.body.data.id}`))
    .set(owner.headers);

  return {
    board: created.body.data as { id: string; name: string },
    lists: snapshot.body.data.lists as { id: string; name: string; cards: unknown[] }[]
  };
}

export async function createChannel(
  owner: TestUser,
  workspaceId: string,
  overrides: { name?: string; visibility?: string } = {}
): Promise<{ id: string; name: string }> {
  const response = await api()
    .post(workspaceUrl(workspaceId, '/channels'))
    .set(owner.headers)
    .send({ name: overrides.name ?? 'General', visibility: overrides.visibility ?? 'public' });

  return response.body.data;
}

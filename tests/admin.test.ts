import { addMember, api, createBoardWithLists, registerUser, strongPassword, uniqueEmail, type Row } from './helpers/factory.js';

async function claimSuperAdmin() {
  const email = uniqueEmail('root');
  const response = await api()
    .post('/api/v1/admin/setup')
    .send({ name: 'Platform Root', email, password: strongPassword });

  return {
    status: response.status,
    email,
    id: response.body.data?.user?.id as string,
    role: response.body.data?.user?.role as string,
    headers: { Authorization: `Bearer ${response.body.data?.accessToken}` }
  };
}

describe('super admin setup', () => {
  it('offers the setup while no super admin exists and hands back a session', async () => {
    const before = await api().get('/api/v1/admin/setup');
    expect(before.status).toBe(200);
    expect(before.body.data).toEqual({ available: true, requiresKey: false });

    const admin = await claimSuperAdmin();
    expect(admin.status).toBe(201);
    expect(admin.role).toBe('super_admin');

    const profile = await api().get('/api/v1/auth/me').set(admin.headers);
    expect(profile.body.data.role).toBe('super_admin');

    const after = await api().get('/api/v1/admin/setup');
    expect(after.body.data.available).toBe(false);
  });

  it('closes the door once the seat is taken', async () => {
    await claimSuperAdmin();
    const second = await claimSuperAdmin();

    expect(second.status).toBe(409);
  });

  it('keeps the password rules and rejects a duplicate email', async () => {
    const weak = await api()
      .post('/api/v1/admin/setup')
      .send({ name: 'Root', email: uniqueEmail('root'), password: 'short' });
    expect(weak.status).toBe(422);

    const person = await registerUser();
    const clash = await api()
      .post('/api/v1/admin/setup')
      .send({ name: 'Root', email: person.email, password: strongPassword });
    expect(clash.status).toBe(409);
  });
});

describe('super admin access', () => {
  it('lists every workspace, including ones it does not belong to', async () => {
    const owner = await registerUser();
    await api().post('/api/v1/workspaces').set(owner.headers).send({ name: 'Private Co' });
    await api().post('/api/v1/workspaces').set(owner.headers).send({ name: 'Second Co' });

    const admin = await claimSuperAdmin();
    const listed = await api().get('/api/v1/workspaces').set(admin.headers);

    expect(listed.status).toBe(200);
    expect(listed.body.data.map((row: Row) => row.name).sort()).toEqual(['Private Co', 'Second Co']);
    expect(listed.body.data.every((row: Row) => row.role === 'owner')).toBe(true);
  });

  it('opens a workspace it is not a member of, down to private channels and the audit log', async () => {
    const owner = await registerUser();
    const stranger = await registerUser();
    const created = await api().post('/api/v1/workspaces').set(owner.headers).send({ name: 'Closed Co' });
    const workspaceId = created.body.data.id;
    const secret = await api()
      .post(`/api/v1/workspaces/${workspaceId}/channels`)
      .set(owner.headers)
      .send({ name: 'Leadership', visibility: 'private' });
    await api()
      .post(`/api/v1/workspaces/${workspaceId}/channels/${secret.body.data.id}/messages`)
      .set(owner.headers)
      .send({ body: 'board pack attached' });

    const admin = await claimSuperAdmin();

    const blocked = await api().get(`/api/v1/workspaces/${workspaceId}`).set(stranger.headers);
    expect(blocked.status).toBe(403);

    const detail = await api().get(`/api/v1/workspaces/${workspaceId}`).set(admin.headers);
    expect(detail.status).toBe(200);
    expect(detail.body.data.role).toBe('owner');

    const channels = await api().get(`/api/v1/workspaces/${workspaceId}/channels`).set(admin.headers);
    expect(channels.body.data.map((row: Row) => row.name)).toContain('Leadership');

    const history = await api()
      .get(`/api/v1/workspaces/${workspaceId}/channels/${secret.body.data.id}/messages`)
      .set(admin.headers);
    expect(history.status).toBe(200);
    expect(history.body.data[0].body).toBe('board pack attached');

    const audit = await api().get(`/api/v1/workspaces/${workspaceId}/audit-logs`).set(admin.headers);
    expect(audit.status).toBe(200);
    expect(audit.body.data.length).toBeGreaterThan(0);

    const search = await api()
      .get(`/api/v1/workspaces/${workspaceId}/search`)
      .set(admin.headers)
      .query({ q: 'board pack' });
    expect(search.body.data.length).toBe(1);
  });

  it('can change anything in a workspace it does not belong to', async () => {
    const owner = await registerUser();
    const created = await api().post('/api/v1/workspaces').set(owner.headers).send({ name: 'Closed Co' });
    const workspaceId = created.body.data.id;
    const admin = await claimSuperAdmin();
    const ownerContext = { ...owner, headers: owner.headers };
    const { board, lists } = await createBoardWithLists(ownerContext, workspaceId);

    const card = await api()
      .post(`/api/v1/workspaces/${workspaceId}/boards/${board.id}/cards`)
      .set(admin.headers)
      .send({ list: lists[0].id, title: 'Added by the platform admin' });
    expect(card.status).toBe(201);

    const renamed = await api().patch(`/api/v1/workspaces/${workspaceId}`).set(admin.headers).send({ name: 'Renamed Co' });
    expect(renamed.status).toBe(200);

    const archived = await api().delete(`/api/v1/workspaces/${workspaceId}`).set(admin.headers);
    expect(archived.status).toBe(200);
  });

  it('never receives notifications of its own', async () => {
    const owner = await registerUser();
    const member = await registerUser();
    const created = await api().post('/api/v1/workspaces').set(owner.headers).send({ name: 'Busy Co' });
    const workspaceId = created.body.data.id;
    await addMember(owner, workspaceId, member);

    const admin = await claimSuperAdmin();
    const page = await api()
      .post(`/api/v1/workspaces/${workspaceId}/pages`)
      .set(admin.headers)
      .send({ title: 'Platform notes' });

    await api()
      .patch(`/api/v1/workspaces/${workspaceId}/pages/${page.body.data.id}`)
      .set(owner.headers)
      .send({ body: 'edited by the workspace owner' });

    const adminInbox = await api().get('/api/v1/notifications').set(admin.headers);
    expect(adminInbox.body.data).toHaveLength(0);

    const memberInbox = await api().get('/api/v1/notifications').set(member.headers);
    expect(memberInbox.body.data.length).toBeGreaterThan(0);
  });
});

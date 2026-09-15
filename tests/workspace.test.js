import { addMember, api, createWorkspace, registerUser } from './helpers/factory.js';

describe('workspaces', () => {
  it('creates a workspace, slugifies the name and enrols the creator as owner', async () => {
    const owner = await registerUser();
    const response = await api()
      .post('/api/v1/workspaces')
      .set(owner.headers)
      .send({ name: 'Déjà Product Team', description: 'Roadmap and docs' });

    expect(response.status).toBe(201);
    expect(response.body.data.slug.startsWith('deja-product-team-')).toBe(true);
    expect(response.body.data.memberCount).toBe(1);

    const listed = await api().get('/api/v1/workspaces').set(owner.headers);
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);
    expect(listed.body.data[0].role).toBe('owner');
    expect(listed.body.data[0].id).toBe(response.body.data.id);
    expect(listed.body.meta.pagination.total).toBe(1);
  });

  it('hides a workspace from people who are not members', async () => {
    const owner = await registerUser();
    const stranger = await registerUser();
    const workspace = await createWorkspace(owner);

    const response = await api().get(`/api/v1/workspaces/${workspace.id}`).set(stranger.headers);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('You are not a member of this workspace');
  });

  it('adds members, refuses duplicates and refuses the owner role', async () => {
    const owner = await registerUser();
    const mate = await registerUser();
    const workspace = await createWorkspace(owner);

    const added = await addMember(owner, workspace.id, mate);
    expect(added.status).toBe(201);

    const duplicate = await addMember(owner, workspace.id, mate);
    expect(duplicate.status).toBe(409);

    const asOwner = await addMember(owner, workspace.id, await registerUser(), 'owner');
    expect(asOwner.status).toBe(422);
  });

  it('enforces the role hierarchy on workspace updates', async () => {
    const owner = await registerUser();
    const mate = await registerUser();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, mate);

    const asMember = await api()
      .patch(`/api/v1/workspaces/${workspace.id}`)
      .set(mate.headers)
      .send({ name: 'Hijacked' });
    expect(asMember.status).toBe(403);

    const promoted = await api()
      .patch(`/api/v1/workspaces/${workspace.id}/members/${mate.id}`)
      .set(owner.headers)
      .send({ role: 'admin' });
    expect(promoted.status).toBe(200);

    const asAdmin = await api()
      .patch(`/api/v1/workspaces/${workspace.id}`)
      .set(mate.headers)
      .send({ name: 'Renamed By Admin' });
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.data.name).toBe('Renamed By Admin');
  });

  it('keeps the member count in step when members join and leave', async () => {
    const owner = await registerUser();
    const mate = await registerUser();
    const workspace = await createWorkspace(owner);

    await addMember(owner, workspace.id, mate);
    const afterJoin = await api().get(`/api/v1/workspaces/${workspace.id}`).set(owner.headers);
    expect(afterJoin.body.data.memberCount).toBe(2);

    const left = await api().post(`/api/v1/workspaces/${workspace.id}/leave`).set(mate.headers);
    expect(left.status).toBe(200);

    const afterLeave = await api().get(`/api/v1/workspaces/${workspace.id}`).set(owner.headers);
    expect(afterLeave.body.data.memberCount).toBe(1);
  });

  it('stops the owner leaving and swaps roles on an ownership transfer', async () => {
    const owner = await registerUser();
    const mate = await registerUser();
    const workspace = await createWorkspace(owner);
    await addMember(owner, workspace.id, mate);

    const blocked = await api().post(`/api/v1/workspaces/${workspace.id}/leave`).set(owner.headers);
    expect(blocked.status).toBe(400);

    const transferred = await api()
      .post(`/api/v1/workspaces/${workspace.id}/transfer-ownership`)
      .set(owner.headers)
      .send({ memberId: mate.id });
    expect(transferred.status).toBe(200);

    const repeated = await api()
      .post(`/api/v1/workspaces/${workspace.id}/transfer-ownership`)
      .set(owner.headers)
      .send({ memberId: mate.id });
    expect(repeated.status).toBe(403);

    const members = await api().get(`/api/v1/workspaces/${workspace.id}/members`).set(mate.headers);
    const roles = Object.fromEntries(members.body.data.map((row) => [row.user.id, row.role]));
    expect(roles[mate.id]).toBe('owner');
    expect(roles[owner.id]).toBe('admin');
  });

  it('drops archived workspaces out of the listing', async () => {
    const owner = await registerUser();
    const workspace = await createWorkspace(owner);

    const archived = await api().delete(`/api/v1/workspaces/${workspace.id}`).set(owner.headers);
    expect(archived.status).toBe(200);
    expect(archived.body.data.archivedAt).not.toBeNull();

    const listed = await api().get('/api/v1/workspaces').set(owner.headers);
    expect(listed.body.data).toHaveLength(0);
  });

  it('rejects a malformed workspace identifier', async () => {
    const owner = await registerUser();
    const response = await api().get('/api/v1/workspaces/not-an-id').set(owner.headers);

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });
});

import { api, createBoardWithLists, createChannel, setupWorkspace } from './helpers/factory.js';

describe('notifications', () => {
  it('notifies a mentioned member but never the author', async () => {
    const { owner, member, workspace, url } = await setupWorkspace();
    const channel = await createChannel(owner, workspace.id);
    await api().post(url(`/channels/${channel.id}/join`)).set(member.headers);

    await api()
      .post(url(`/channels/${channel.id}/messages`))
      .set(owner.headers)
      .send({ body: 'can you look at the deploy', mentions: [member.id] });

    await api()
      .post(url(`/channels/${channel.id}/messages`))
      .set(owner.headers)
      .send({ body: 'note to self', mentions: [owner.id] });

    const theirs = await api().get('/api/v1/notifications').set(member.headers);
    expect(theirs.body.data).toHaveLength(1);
    expect(theirs.body.data[0].type).toBe('mention');
    expect(theirs.body.data[0].actor).toBe('Owner');

    const mine = await api().get('/api/v1/notifications').set(owner.headers);
    expect(mine.body.data).toHaveLength(0);
  });

  it('notifies the assignee when a card is created for them', async () => {
    const { owner, member, workspace, url } = await setupWorkspace();
    const { board, lists } = await createBoardWithLists(owner, workspace.id);

    await api()
      .post(url(`/boards/${board.id}/cards`))
      .set(owner.headers)
      .send({ list: lists[0].id, title: 'Rotate credentials', assignees: [member.id] });

    const response = await api().get('/api/v1/notifications').set(member.headers);
    expect(response.body.data[0].type).toBe('card_assigned');
    expect(response.body.data[0].body).toBe('Rotate credentials');
  });

  it('counts unread notifications and clears them', async () => {
    const { owner, member, workspace, url } = await setupWorkspace();
    const channel = await createChannel(owner, workspace.id);
    await api().post(url(`/channels/${channel.id}/join`)).set(member.headers);

    await api()
      .post(url(`/channels/${channel.id}/messages`))
      .set(owner.headers)
      .send({ body: 'first', mentions: [member.id] });
    await api()
      .post(url(`/channels/${channel.id}/messages`))
      .set(owner.headers)
      .send({ body: 'second', mentions: [member.id] });

    const before = await api().get('/api/v1/notifications/unread-count').set(member.headers);
    expect(before.body.data.total).toBe(2);
    expect(before.body.data.byWorkspace[0].count).toBe(2);

    const listed = await api().get('/api/v1/notifications').set(member.headers);
    const first = await api().patch(`/api/v1/notifications/${listed.body.data[0].id}/read`).set(member.headers);
    expect(first.status).toBe(200);

    const repeated = await api().patch(`/api/v1/notifications/${listed.body.data[0].id}/read`).set(member.headers);
    expect(repeated.status).toBe(404);

    const cleared = await api().post('/api/v1/notifications/read-all').set(member.headers).send({});
    expect(cleared.body.data.read).toBe(1);

    const after = await api().get('/api/v1/notifications/unread-count').set(member.headers);
    expect(after.body.data.total).toBe(0);
  });

  it('keeps one member from reading another member notifications', async () => {
    const { owner, member, workspace, url } = await setupWorkspace();
    const channel = await createChannel(owner, workspace.id);
    await api().post(url(`/channels/${channel.id}/join`)).set(member.headers);

    await api()
      .post(url(`/channels/${channel.id}/messages`))
      .set(owner.headers)
      .send({ body: 'ping', mentions: [member.id] });

    const theirs = await api().get('/api/v1/notifications').set(member.headers);
    const stolen = await api()
      .patch(`/api/v1/notifications/${theirs.body.data[0].id}/read`)
      .set(owner.headers);

    expect(stolen.status).toBe(404);
  });
});

describe('audit trail', () => {
  it('records successful mutations and skips rejected ones', async () => {
    const { owner, url, workspace } = await setupWorkspace();

    await api().patch(url('')).set(owner.headers).send({ name: 'Renamed Co' });
    await api().post(url('/pages')).set(owner.headers).send({ title: 'Runbook' });
    await api().patch(url('')).set(owner.headers).send({ name: '' });

    const response = await api().get(url('/audit-logs')).set(owner.headers);
    const actions = response.body.data.map((row) => row.action);

    expect(response.status).toBe(200);
    expect(actions).toEqual(expect.arrayContaining(['workspace.created', 'member.added', 'workspace.updated', 'page.created']));
    expect(actions.filter((action) => action === 'workspace.updated')).toHaveLength(1);
    expect(response.body.data.every((row) => row.entityId !== null)).toBe(true);
    expect(response.body.data[0].actor.id).toBe(owner.id);
    expect(response.body.data.every((row) => row.workspace === undefined || row.workspace === workspace.id)).toBe(true);
  });

  it('is limited to workspace admins', async () => {
    const { member, url } = await setupWorkspace();

    const response = await api().get(url('/audit-logs')).set(member.headers);
    expect(response.status).toBe(403);
  });

  it('filters by action and summarises activity', async () => {
    const { owner, url } = await setupWorkspace();
    await api().post(url('/pages')).set(owner.headers).send({ title: 'One' });
    await api().post(url('/pages')).set(owner.headers).send({ title: 'Two' });

    const filtered = await api().get(url('/audit-logs')).set(owner.headers).query({ action: 'page.created' });
    expect(filtered.body.data).toHaveLength(2);
    expect(filtered.body.data.every((row) => row.action === 'page.created')).toBe(true);

    const summary = await api().get(url('/audit-logs/summary')).set(owner.headers);
    expect(summary.status).toBe(200);
    expect(summary.body.data.total).toBeGreaterThanOrEqual(3);
    expect(summary.body.data.byAction).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: 'page.created', count: 2 })])
    );
    expect(summary.body.data.byDay.length).toBeGreaterThan(0);
  });
});

import { api, createBoardWithLists, createChannel, setupWorkspace, type Row, type TestUser } from './helpers/factory.js';

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
    const mentions = theirs.body.data.filter((row: Row) => row.type === 'mention');
    expect(mentions).toHaveLength(1);
    expect(mentions[0].actor).toBe('Owner');
    expect(mentions[0].title).toBe('Owner mentioned you in #General');

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
    expect(before.body.data.total).toBe(3);
    expect(before.body.data.byWorkspace[0].count).toBe(3);

    const listed = await api().get('/api/v1/notifications').set(member.headers);
    const first = await api().patch(`/api/v1/notifications/${listed.body.data[0].id}/read`).set(member.headers);
    expect(first.status).toBe(200);

    const repeated = await api().patch(`/api/v1/notifications/${listed.body.data[0].id}/read`).set(member.headers);
    expect(repeated.status).toBe(404);

    const cleared = await api().post('/api/v1/notifications/read-all').set(member.headers).send({});
    expect(cleared.body.data.read).toBe(2);

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

describe('activity notifications', () => {
  async function notificationsFor(user: TestUser): Promise<Row[]> {
    const response = await api().get('/api/v1/notifications').set(user.headers).query({ limit: 50 });
    return response.body.data;
  }

  async function boardWithCard(context: Awaited<ReturnType<typeof setupWorkspace>>) {
    const { owner, workspace, url } = context;
    const { board, lists } = await createBoardWithLists(owner, workspace.id);
    const card = await api()
      .post(url(`/boards/${board.id}/cards`))
      .set(owner.headers)
      .send({ list: lists[0].id, title: 'Ship login page' });

    return { board, lists, card: card.body.data as Row };
  }

  it('tells a member when they are assigned through an edit, and stays quiet on a no-op save', async () => {
    const context = await setupWorkspace();
    const { owner, member, url } = context;
    const { board, card } = await boardWithCard(context);
    const cardUrl = url(`/boards/${board.id}/cards/${card.id}`);

    await api().patch(cardUrl).set(owner.headers).send({ assignees: [member.id], title: 'Ship login page' });
    await api().patch(cardUrl).set(owner.headers).send({ assignees: [member.id], title: 'Ship login page' });

    const received = (await notificationsFor(member)).filter((row) => row.type !== 'member_added');
    expect(received.map((row) => row.type)).toEqual(['card_assigned']);
    expect(received[0].title).toBe('Owner assigned you "Ship login page"');
    expect(received[0].link).toBe(`/w/${context.workspace.id}/boards/${board.id}`);
  });

  it('tells the creator and other assignees when a card moves or is completed, never the person acting', async () => {
    const context = await setupWorkspace();
    const { owner, member, url } = context;
    const { board, lists, card } = await boardWithCard(context);
    const cardUrl = url(`/boards/${board.id}/cards/${card.id}`);

    await api().patch(cardUrl).set(owner.headers).send({ assignees: [member.id] });
    await api().post(`${cardUrl}/move`).set(member.headers).send({ list: lists[3].id, position: 0 });
    await api().patch(cardUrl).set(member.headers).send({ completed: true });

    const ownerTypes = (await notificationsFor(owner)).map((row) => row.type);
    expect(ownerTypes).toEqual(expect.arrayContaining(['card_moved', 'card_completed']));

    const memberTypes = (await notificationsFor(member)).map((row) => row.type);
    expect(memberTypes).not.toContain('card_moved');
    expect(memberTypes).not.toContain('card_completed');

    const moved = (await notificationsFor(owner)).find((row) => row.type === 'card_moved');
    expect(moved?.title).toBe('Member moved "Ship login page" to Done');
    expect(moved?.body).toBe('From Backlog to Done');
  });

  it('reports which fields changed and when someone is taken off a card', async () => {
    const context = await setupWorkspace();
    const { owner, member, url } = context;
    const { board, card } = await boardWithCard(context);
    const cardUrl = url(`/boards/${board.id}/cards/${card.id}`);

    await api().patch(cardUrl).set(owner.headers).send({ assignees: [member.id] });
    await api().patch(cardUrl).set(owner.headers).send({ priority: 'urgent' });
    await api().patch(cardUrl).set(owner.headers).send({ assignees: [] });

    const titles = (await notificationsFor(member)).map((row) => row.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        'Owner changed the priority of "Ship login page"',
        'Owner removed you from "Ship login page"'
      ])
    );
  });

  it('tells people about changes to their workspace membership', async () => {
    const { owner, member, workspace } = await setupWorkspace();

    await api()
      .patch(`/api/v1/workspaces/${workspace.id}/members/${member.id}`)
      .set(owner.headers)
      .send({ role: 'admin' });

    const titles = (await notificationsFor(member)).map((row) => row.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        'Owner added you to Test Workspace as member',
        'Owner changed your role in Test Workspace from member to admin'
      ])
    );
  });

  it('tells the owner when a member leaves and the page author when someone else edits their page', async () => {
    const { owner, member, workspace, url } = await setupWorkspace();

    const page = await api().post(url('/pages')).set(owner.headers).send({ title: 'Runbook' });
    await api().patch(url(`/pages/${page.body.data.id}`)).set(member.headers).send({ body: 'new steps' });
    await api().post(`/api/v1/workspaces/${workspace.id}/leave`).set(member.headers);

    const titles = (await notificationsFor(owner)).map((row) => row.title);
    expect(titles).toEqual(expect.arrayContaining(['Member edited your page "Runbook"', 'Member left Test Workspace']));
  });
});

describe('audit trail', () => {
  it('records successful mutations and skips rejected ones', async () => {
    const { owner, url, workspace } = await setupWorkspace();

    await api().patch(url('')).set(owner.headers).send({ name: 'Renamed Co' });
    await api().post(url('/pages')).set(owner.headers).send({ title: 'Runbook' });
    await api().patch(url('')).set(owner.headers).send({ name: '' });

    const response = await api().get(url('/audit-logs')).set(owner.headers);
    const actions = response.body.data.map((row: Row) => row.action);

    expect(response.status).toBe(200);
    expect(actions).toEqual(expect.arrayContaining(['workspace.created', 'member.added', 'workspace.updated', 'page.created']));
    expect(actions.filter((action: string) => action === 'workspace.updated')).toHaveLength(1);
    expect(response.body.data.every((row: Row) => row.entityId !== null)).toBe(true);
    expect(response.body.data[0].actor.id).toBe(owner.id);
    expect(response.body.data.every((row: Row) => row.workspace === undefined || row.workspace === workspace.id)).toBe(true);
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
    expect(filtered.body.data.every((row: Row) => row.action === 'page.created')).toBe(true);

    const summary = await api().get(url('/audit-logs/summary')).set(owner.headers);
    expect(summary.status).toBe(200);
    expect(summary.body.data.total).toBeGreaterThanOrEqual(3);
    expect(summary.body.data.byAction).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: 'page.created', count: 2 })])
    );
    expect(summary.body.data.byDay.length).toBeGreaterThan(0);
  });
});

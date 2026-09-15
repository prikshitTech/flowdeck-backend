import { api, createBoardWithLists, createChannel, setupWorkspace } from './helpers/factory.js';

async function seedWorkspace() {
  const context = await setupWorkspace();
  const { owner, member, workspace, url } = context;

  await api()
    .post(url('/pages'))
    .set(owner.headers)
    .send({ title: 'Deployment Runbook', body: 'how we deploy the api to production' });
  await api().post(url('/pages')).set(owner.headers).send({ title: 'Hiring Notes', body: 'interview loop' });

  const { board, lists } = await createBoardWithLists(owner, workspace.id, 'Delivery Board');
  const card = await api()
    .post(url(`/boards/${board.id}/cards`))
    .set(owner.headers)
    .send({ list: lists[0].id, title: 'Automate deploy pipeline', description: 'deploy on merge', assignees: [member.id], priority: 'high' });
  await api().post(url(`/boards/${board.id}/cards`)).set(owner.headers).send({ list: lists[0].id, title: 'Write onboarding doc' });
  await api().patch(url(`/boards/${board.id}/cards/${card.body.data.id}`)).set(owner.headers).send({ completed: true });

  const open = await createChannel(owner, workspace.id, { name: 'Engineering' });
  const secret = await createChannel(owner, workspace.id, { name: 'Secret Ops', visibility: 'private' });
  await api().post(url(`/channels/${open.id}/messages`)).set(owner.headers).send({ body: 'the deploy went out fine' });
  await api()
    .post(url(`/channels/${secret.id}/messages`))
    .set(owner.headers)
    .send({ body: 'private deploy credentials rotated' });

  return { ...context, board };
}

describe('search', () => {
  it('returns ranked hits across pages, cards and messages', async () => {
    const { owner, url } = await seedWorkspace();

    const response = await api().get(url('/search')).set(owner.headers).query({ q: 'deploy' });

    expect(response.status).toBe(200);
    expect(new Set(response.body.data.map((row) => row.kind))).toEqual(new Set(['page', 'card', 'message']));
    expect(response.body.meta.pagination.byKind.message).toBe(2);
  });

  it('never surfaces messages from a private channel the caller cannot see', async () => {
    const { member, url } = await seedWorkspace();

    const response = await api().get(url('/search')).set(member.headers).query({ q: 'deploy' });

    expect(response.body.data.some((row) => String(row.snippet).includes('credentials'))).toBe(false);
    expect(response.body.meta.pagination.byKind.message).toBe(1);
  });

  it('narrows results by kind and rejects an unknown kind', async () => {
    const { owner, url } = await seedWorkspace();

    const pagesOnly = await api().get(url('/search')).set(owner.headers).query({ q: 'deploy', kinds: 'page' });
    expect(pagesOnly.body.data.every((row) => row.kind === 'page')).toBe(true);

    const bogus = await api().get(url('/search')).set(owner.headers).query({ q: 'deploy', kinds: 'page,bogus' });
    expect(bogus.status).toBe(422);
  });

  it('treats suggestion input as literal text rather than a pattern', async () => {
    const { owner, url } = await seedWorkspace();

    const matches = await api().get(url('/search/suggestions')).set(owner.headers).query({ q: 'De' });
    expect(matches.body.data.map((row) => row.label)).toContain('Deployment Runbook');

    const injected = await api().get(url('/search/suggestions')).set(owner.headers).query({ q: '.*' });
    expect(injected.status).toBe(200);
    expect(injected.body.data).toHaveLength(0);
  });

  it('rejects a query that is too short to be useful', async () => {
    const { owner, url } = await seedWorkspace();

    const response = await api().get(url('/search')).set(owner.headers).query({ q: 'a' });
    expect(response.status).toBe(422);
  });
});

describe('analytics', () => {
  it('summarises workspace activity', async () => {
    const { owner, url } = await seedWorkspace();

    const response = await api().get(url('/analytics/overview')).set(owner.headers);

    expect(response.status).toBe(200);
    expect(response.body.data.pages.total).toBe(2);
    expect(response.body.data.cards.open).toBe(1);
    expect(response.body.data.cards.completed).toBe(1);
    expect(response.body.data.cards.overdue).toBe(0);
    expect(response.body.data.messages.total).toBe(2);
    expect(response.body.data.membersByRole).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'owner', count: 1 }),
        expect.objectContaining({ role: 'member', count: 1 })
      ])
    );
  });

  it('reports board throughput without counting undated cards as overdue', async () => {
    const { owner, board, url } = await seedWorkspace();

    const response = await api().get(url(`/analytics/boards/${board.id}`)).set(owner.headers);

    expect(response.status).toBe(200);
    expect(response.body.data.completionRate).toBe(50);
    expect(response.body.data.lists[0]).toEqual(
      expect.objectContaining({ list: 'Backlog', cards: 2, completed: 1, overdue: 0 })
    );
  });

  it('ranks members by weighted activity', async () => {
    const { owner, member, url } = await seedWorkspace();

    const response = await api().get(url('/analytics/members')).set(owner.headers);

    const scores = Object.fromEntries(response.body.data.map((row) => [row.user.id, row.activityScore]));
    expect(scores[owner.id]).toBeGreaterThan(0);
    expect(scores[member.id]).toBeGreaterThan(0);
    expect(response.body.data[0].activityScore).toBeGreaterThanOrEqual(response.body.data.at(-1).activityScore);
  });

  it('404s analytics for a board in another workspace', async () => {
    const { owner, url } = await seedWorkspace();
    const other = await seedWorkspace();

    const response = await api().get(url(`/analytics/boards/${other.board.id}`)).set(owner.headers);
    expect(response.status).toBe(404);
  });
});

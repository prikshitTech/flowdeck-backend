import { api, createBoardWithLists, setupWorkspace } from './helpers/factory.js';

async function orderOf(user, url, boardId, listId) {
  const response = await api()
    .get(url(`/boards/${boardId}/cards`))
    .set(user.headers)
    .query({ list: listId, limit: 50 });

  return response.body.data
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((card) => card.title);
}

describe('boards', () => {
  it('creates a board with the default lists', async () => {
    const { owner, workspace } = await setupWorkspace();
    const { board, lists } = await createBoardWithLists(owner, workspace.id, 'Sprint 12');

    expect(board.name).toBe('Sprint 12');
    expect(lists.map((list) => list.name)).toEqual(['Backlog', 'In Progress', 'Review', 'Done']);
    expect(lists.every((list) => list.cards.length === 0)).toBe(true);
  });

  it('only assigns cards to workspace members', async () => {
    const { owner, member, outsider, workspace, url } = await setupWorkspace();
    const { board, lists } = await createBoardWithLists(owner, workspace.id);

    const refused = await api()
      .post(url(`/boards/${board.id}/cards`))
      .set(owner.headers)
      .send({ list: lists[0].id, title: 'Bad', assignees: [outsider.id] });
    expect(refused.status).toBe(400);

    const allowed = await api()
      .post(url(`/boards/${board.id}/cards`))
      .set(owner.headers)
      .send({ list: lists[0].id, title: 'Good', assignees: [member.id], priority: 'high' });
    expect(allowed.status).toBe(201);
    expect(allowed.body.data.priority).toBe('high');
  });

  it('keeps positions contiguous when a card moves inside one list', async () => {
    const { owner, workspace, url } = await setupWorkspace();
    const { board, lists } = await createBoardWithLists(owner, workspace.id);

    const created = [];
    for (const title of ['A', 'B', 'C', 'D']) {
      const card = await api()
        .post(url(`/boards/${board.id}/cards`))
        .set(owner.headers)
        .send({ list: lists[0].id, title });
      created.push(card.body.data);
    }

    expect(created.map((card) => card.position)).toEqual([0, 1, 2, 3]);

    const moved = await api()
      .post(url(`/boards/${board.id}/cards/${created[1].id}/move`))
      .set(owner.headers)
      .send({ position: 2 });
    expect(moved.status).toBe(200);

    expect(await orderOf(owner, url, board.id, lists[0].id)).toEqual(['A', 'C', 'B', 'D']);
  });

  it('closes the gap in the source list when a card moves to another list', async () => {
    const { owner, workspace, url } = await setupWorkspace();
    const { board, lists } = await createBoardWithLists(owner, workspace.id);

    const cards = [];
    for (const title of ['A', 'B', 'C']) {
      const card = await api()
        .post(url(`/boards/${board.id}/cards`))
        .set(owner.headers)
        .send({ list: lists[0].id, title });
      cards.push(card.body.data);
    }

    await api()
      .post(url(`/boards/${board.id}/cards/${cards[0].id}/move`))
      .set(owner.headers)
      .send({ list: lists[1].id, position: 0 });

    expect(await orderOf(owner, url, board.id, lists[0].id)).toEqual(['B', 'C']);
    expect(await orderOf(owner, url, board.id, lists[1].id)).toEqual(['A']);
  });

  it('honours a list card limit', async () => {
    const { owner, workspace, url } = await setupWorkspace();
    const { board, lists } = await createBoardWithLists(owner, workspace.id);

    const card = await api()
      .post(url(`/boards/${board.id}/cards`))
      .set(owner.headers)
      .send({ list: lists[0].id, title: 'Only one' });

    await api()
      .patch(url(`/boards/${board.id}/lists/${lists[1].id}`))
      .set(owner.headers)
      .send({ cardLimit: 1 });

    await api()
      .post(url(`/boards/${board.id}/cards`))
      .set(owner.headers)
      .send({ list: lists[1].id, title: 'Fills the list' });

    const blocked = await api()
      .post(url(`/boards/${board.id}/cards/${card.body.data.id}/move`))
      .set(owner.headers)
      .send({ list: lists[1].id });

    expect(blocked.status).toBe(400);
    expect(blocked.body.message).toBe('This list has reached its card limit');
  });

  it('compacts positions after a card is archived', async () => {
    const { owner, workspace, url } = await setupWorkspace();
    const { board, lists } = await createBoardWithLists(owner, workspace.id);

    const cards = [];
    for (const title of ['A', 'B', 'C']) {
      const card = await api()
        .post(url(`/boards/${board.id}/cards`))
        .set(owner.headers)
        .send({ list: lists[0].id, title });
      cards.push(card.body.data);
    }

    await api().delete(url(`/boards/${board.id}/cards/${cards[0].id}`)).set(owner.headers);

    const remaining = await api()
      .get(url(`/boards/${board.id}/cards`))
      .set(owner.headers)
      .query({ list: lists[0].id });

    expect(remaining.body.data.map((card) => card.position).sort()).toEqual([0, 1]);
  });

  it('toggles completion and filters the card list', async () => {
    const { owner, member, workspace, url } = await setupWorkspace();
    const { board, lists } = await createBoardWithLists(owner, workspace.id);

    const card = await api()
      .post(url(`/boards/${board.id}/cards`))
      .set(owner.headers)
      .send({ list: lists[0].id, title: 'Ship it', assignees: [member.id], labels: ['api'] });

    const completed = await api()
      .patch(url(`/boards/${board.id}/cards/${card.body.data.id}`))
      .set(owner.headers)
      .send({ completed: true });
    expect(completed.body.data.completedAt).not.toBeNull();

    const byAssignee = await api()
      .get(url(`/boards/${board.id}/cards`))
      .set(owner.headers)
      .query({ assignee: member.id });
    expect(byAssignee.body.data).toHaveLength(1);

    const byLabel = await api().get(url(`/boards/${board.id}/cards`)).set(owner.headers).query({ label: 'api' });
    expect(byLabel.body.data).toHaveLength(1);

    const overdue = await api()
      .get(url(`/boards/${board.id}/cards`))
      .set(owner.headers)
      .query({ overdue: 'true' });
    expect(overdue.body.data).toHaveLength(0);
  });

  it('archives a board along with its lists and cards', async () => {
    const { owner, member, workspace, url } = await setupWorkspace();
    const { board, lists } = await createBoardWithLists(owner, workspace.id);

    await api()
      .post(url(`/boards/${board.id}/cards`))
      .set(owner.headers)
      .send({ list: lists[0].id, title: 'Doomed' });

    const asMember = await api().delete(url(`/boards/${board.id}`)).set(member.headers);
    expect(asMember.status).toBe(403);

    const archived = await api().delete(url(`/boards/${board.id}`)).set(owner.headers);
    expect(archived.status).toBe(200);

    const listed = await api().get(url('/boards')).set(owner.headers);
    expect(listed.body.data).toHaveLength(0);

    const snapshot = await api().get(url(`/boards/${board.id}`)).set(owner.headers);
    expect(snapshot.status).toBe(404);
  });
});

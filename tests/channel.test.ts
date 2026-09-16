import { api, createChannel, setupWorkspace, type Row } from './helpers/factory.js';

describe('channels', () => {
  it('rejects a second channel with the same slug', async () => {
    const { owner, workspace } = await setupWorkspace();
    await createChannel(owner, workspace.id, { name: 'General Chat' });

    const duplicate = await api()
      .post(`/api/v1/workspaces/${workspace.id}/channels`)
      .set(owner.headers)
      .send({ name: 'general chat' });

    expect(duplicate.status).toBe(409);
  });

  it('hides private channels and refuses joins', async () => {
    const { owner, member, workspace, url } = await setupWorkspace();
    const secret = await createChannel(owner, workspace.id, { name: 'Leadership', visibility: 'private' });

    const read = await api().get(url(`/channels/${secret.id}`)).set(member.headers);
    expect(read.status).toBe(403);

    const join = await api().post(url(`/channels/${secret.id}/join`)).set(member.headers);
    expect(join.status).toBe(403);

    const listed = await api().get(url('/channels')).set(member.headers);
    expect(listed.body.data.map((row: Row) => row.name)).not.toContain('Leadership');
  });

  it('requires joining a public channel before posting', async () => {
    const { owner, member, workspace, url } = await setupWorkspace();
    const channel = await createChannel(owner, workspace.id);

    const early = await api().post(url(`/channels/${channel.id}/messages`)).set(member.headers).send({ body: 'hi' });
    expect(early.status).toBe(403);

    const joined = await api().post(url(`/channels/${channel.id}/join`)).set(member.headers);
    expect(joined.status).toBe(200);

    const again = await api().post(url(`/channels/${channel.id}/join`)).set(member.headers);
    expect(again.status).toBe(409);

    const posted = await api().post(url(`/channels/${channel.id}/messages`)).set(member.headers).send({ body: 'hi' });
    expect(posted.status).toBe(201);
  });

  it('pages messages backwards with a cursor and keeps thread replies separate', async () => {
    const { owner, workspace, url } = await setupWorkspace();
    const channel = await createChannel(owner, workspace.id);

    for (let index = 1; index <= 7; index += 1) {
      await api().post(url(`/channels/${channel.id}/messages`)).set(owner.headers).send({ body: `message ${index}` });
    }

    const root = await api()
      .post(url(`/channels/${channel.id}/messages`))
      .set(owner.headers)
      .send({ body: 'thread starter' });

    await api()
      .post(url(`/channels/${channel.id}/messages`))
      .set(owner.headers)
      .send({ body: 'reply one', parent: root.body.data.id });

    const first = await api().get(url(`/channels/${channel.id}/messages`)).set(owner.headers).query({ limit: 4 });
    expect(first.body.data.map((row: Row) => row.body)).toEqual(['message 5', 'message 6', 'message 7', 'thread starter']);
    expect(first.body.meta.pagination.hasMore).toBe(true);

    const second = await api()
      .get(url(`/channels/${channel.id}/messages`))
      .set(owner.headers)
      .query({ limit: 4, before: first.body.meta.pagination.next });
    expect(second.body.data.map((row: Row) => row.body)).toEqual(['message 1', 'message 2', 'message 3', 'message 4']);
    expect(second.body.meta.pagination.hasMore).toBe(false);

    const thread = await api()
      .get(url(`/channels/${channel.id}/messages`))
      .set(owner.headers)
      .query({ parent: root.body.data.id });
    expect(thread.body.data.map((row: Row) => row.body)).toEqual(['reply one']);
  });

  it('toggles a reaction on and off and rejects unknown ones', async () => {
    const { owner, workspace, url } = await setupWorkspace();
    const channel = await createChannel(owner, workspace.id);
    const message = await api()
      .post(url(`/channels/${channel.id}/messages`))
      .set(owner.headers)
      .send({ body: 'react to me' });

    const path = url(`/channels/${channel.id}/messages/${message.body.data.id}/reactions`);

    const added = await api().post(path).set(owner.headers).send({ emoji: 'like' });
    expect(added.body.data.reactions[0].users).toHaveLength(1);

    const removed = await api().post(path).set(owner.headers).send({ emoji: 'like' });
    expect(removed.body.data.reactions).toHaveLength(0);

    const invalid = await api().post(path).set(owner.headers).send({ emoji: 'not-an-emoji' });
    expect(invalid.status).toBe(422);
  });

  it('only lets the author edit or delete a message', async () => {
    const { owner, member, workspace, url } = await setupWorkspace();
    const channel = await createChannel(owner, workspace.id);
    await api().post(url(`/channels/${channel.id}/join`)).set(member.headers);

    const message = await api()
      .post(url(`/channels/${channel.id}/messages`))
      .set(member.headers)
      .send({ body: 'mine' });
    const path = url(`/channels/${channel.id}/messages/${message.body.data.id}`);

    const byOther = await api().patch(path).set(owner.headers).send({ body: 'hijacked' });
    expect(byOther.status).toBe(403);

    const byAuthor = await api().patch(path).set(member.headers).send({ body: 'edited' });
    expect(byAuthor.status).toBe(200);
    expect(byAuthor.body.data.editedAt).not.toBeNull();

    const deleted = await api().delete(path).set(member.headers);
    expect(deleted.status).toBe(200);

    const remaining = await api().get(url(`/channels/${channel.id}/messages`)).set(member.headers);
    expect(remaining.body.data).toHaveLength(0);
  });

  it('tracks unread counts until the channel is marked read', async () => {
    const { owner, member, workspace, url } = await setupWorkspace();
    const channel = await createChannel(owner, workspace.id);
    await api().post(url(`/channels/${channel.id}/join`)).set(member.headers);

    await api().post(url(`/channels/${channel.id}/messages`)).set(owner.headers).send({ body: 'one' });
    await api().post(url(`/channels/${channel.id}/messages`)).set(owner.headers).send({ body: 'two' });

    const before = await api().get(url(`/channels/${channel.id}`)).set(member.headers);
    expect(before.body.data.unread).toBe(2);

    await api().post(url(`/channels/${channel.id}/read`)).set(member.headers);

    const after = await api().get(url(`/channels/${channel.id}`)).set(member.headers);
    expect(after.body.data.unread).toBe(0);
  });

  it('refuses mentions that are not workspace members', async () => {
    const { owner, outsider, workspace, url } = await setupWorkspace();
    const channel = await createChannel(owner, workspace.id);

    const response = await api()
      .post(url(`/channels/${channel.id}/messages`))
      .set(owner.headers)
      .send({ body: 'hello stranger', mentions: [outsider.id] });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Mentions must be workspace members');
  });
});

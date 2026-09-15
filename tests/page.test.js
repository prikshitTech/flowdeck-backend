import { api, setupWorkspace } from './helpers/factory.js';

describe('pages', () => {
  it('creates a page and blocks viewers from writing', async () => {
    const { owner, member, url } = await setupWorkspace({ memberRole: 'viewer' });

    const created = await api()
      .post(url('/pages'))
      .set(owner.headers)
      .send({ title: 'Engineering Handbook', body: 'first draft' });

    expect(created.status).toBe(201);
    expect(created.body.data.version).toBe(1);
    expect(created.body.data.parent).toBeNull();

    const refused = await api().post(url('/pages')).set(member.headers).send({ title: 'Nope' });
    expect(refused.status).toBe(403);

    const readable = await api().get(url('/pages')).set(member.headers);
    expect(readable.status).toBe(200);
    expect(readable.body.data).toHaveLength(1);
  });

  it('nests pages and returns them as a tree with a breadcrumb', async () => {
    const { owner, url } = await setupWorkspace();

    const root = await api().post(url('/pages')).set(owner.headers).send({ title: 'Handbook' });
    const child = await api()
      .post(url('/pages'))
      .set(owner.headers)
      .send({ title: 'Onboarding', parent: root.body.data.id });
    const grandchild = await api()
      .post(url('/pages'))
      .set(owner.headers)
      .send({ title: 'Day One', parent: child.body.data.id });

    const tree = await api().get(url('/pages/tree')).set(owner.headers);
    expect(tree.status).toBe(200);
    expect(tree.body.data).toHaveLength(1);
    expect(tree.body.data[0].children[0].children[0].title).toBe('Day One');

    const detail = await api().get(url(`/pages/${grandchild.body.data.id}`)).set(owner.headers);
    expect(detail.body.data.breadcrumb.map((row) => row.title)).toEqual(['Handbook', 'Onboarding']);
  });

  it('snapshots a revision on every edit and restores an earlier one', async () => {
    const { owner, url } = await setupWorkspace();
    const page = await api().post(url('/pages')).set(owner.headers).send({ title: 'Runbook', body: 'v1' });
    const pageId = page.body.data.id;

    await api().patch(url(`/pages/${pageId}`)).set(owner.headers).send({ title: 'Runbook v2', body: 'v2' });
    await api().patch(url(`/pages/${pageId}`)).set(owner.headers).send({ body: 'v3' });

    const revisions = await api().get(url(`/pages/${pageId}/revisions`)).set(owner.headers);
    expect(revisions.body.data.map((row) => row.version)).toEqual([2, 1]);

    const restored = await api().post(url(`/pages/${pageId}/revisions/1/restore`)).set(owner.headers);
    expect(restored.status).toBe(200);
    expect(restored.body.data.title).toBe('Runbook');
    expect(restored.body.data.body).toBe('v1');
    expect(restored.body.data.version).toBe(4);

    const missing = await api().post(url(`/pages/${pageId}/revisions/99/restore`)).set(owner.headers);
    expect(missing.status).toBe(404);
  });

  it('refuses to nest a page inside itself or its own descendant', async () => {
    const { owner, url } = await setupWorkspace();
    const root = await api().post(url('/pages')).set(owner.headers).send({ title: 'Root' });
    const child = await api()
      .post(url('/pages'))
      .set(owner.headers)
      .send({ title: 'Child', parent: root.body.data.id });

    const intoSelf = await api()
      .post(url(`/pages/${root.body.data.id}/move`))
      .set(owner.headers)
      .send({ parent: root.body.data.id });
    expect(intoSelf.status).toBe(400);

    const intoChild = await api()
      .post(url(`/pages/${root.body.data.id}/move`))
      .set(owner.headers)
      .send({ parent: child.body.data.id });
    expect(intoChild.status).toBe(400);
  });

  it('rewrites descendant paths when a subtree moves', async () => {
    const { owner, url } = await setupWorkspace();
    const alpha = await api().post(url('/pages')).set(owner.headers).send({ title: 'Alpha' });
    const beta = await api().post(url('/pages')).set(owner.headers).send({ title: 'Beta' });
    const child = await api()
      .post(url('/pages'))
      .set(owner.headers)
      .send({ title: 'Child', parent: alpha.body.data.id });
    const grandchild = await api()
      .post(url('/pages'))
      .set(owner.headers)
      .send({ title: 'Grandchild', parent: child.body.data.id });

    const moved = await api()
      .post(url(`/pages/${child.body.data.id}/move`))
      .set(owner.headers)
      .send({ parent: beta.body.data.id });
    expect(moved.status).toBe(200);

    const detail = await api().get(url(`/pages/${grandchild.body.data.id}`)).set(owner.headers);
    expect(detail.body.data.breadcrumb.map((row) => row.title)).toEqual(['Beta', 'Child']);
  });

  it('archives a page together with everything beneath it', async () => {
    const { owner, url } = await setupWorkspace();
    const root = await api().post(url('/pages')).set(owner.headers).send({ title: 'Root' });
    const child = await api()
      .post(url('/pages'))
      .set(owner.headers)
      .send({ title: 'Child', parent: root.body.data.id });

    const archived = await api().delete(url(`/pages/${root.body.data.id}`)).set(owner.headers);
    expect(archived.body.data.archived).toBe(2);

    const listed = await api().get(url('/pages')).set(owner.headers);
    expect(listed.body.data).toHaveLength(0);

    const gone = await api().get(url(`/pages/${child.body.data.id}`)).set(owner.headers);
    expect(gone.status).toBe(404);
  });

  it('reorders sibling pages in one request', async () => {
    const { owner, url } = await setupWorkspace();
    const first = await api().post(url('/pages')).set(owner.headers).send({ title: 'First' });
    const second = await api().post(url('/pages')).set(owner.headers).send({ title: 'Second' });

    const reordered = await api()
      .patch(url('/pages/reorder'))
      .set(owner.headers)
      .send({
        entries: [
          { page: first.body.data.id, position: 1 },
          { page: second.body.data.id, position: 0 }
        ]
      });

    expect(reordered.status).toBe(200);
    expect(reordered.body.data.reordered).toBe(2);

    const tree = await api().get(url('/pages/tree')).set(owner.headers);
    expect(tree.body.data.map((row) => row.title)).toEqual(['Second', 'First']);
  });
});

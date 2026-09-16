import { rm } from 'node:fs/promises';

import env from '../src/config/env.js';
import { api, setupWorkspace } from './helpers/factory.js';

const csv = Buffer.from('id,name\n1,alpha\n2,beta\n');

afterAll(async () => {
  await rm(env.UPLOAD_DIR, { recursive: true, force: true });
});

describe('files', () => {
  it('stores an upload and reports its checksum driven metadata', async () => {
    const { owner, url } = await setupWorkspace();

    const response = await api()
      .post(url('/files'))
      .set(owner.headers)
      .attach('file', csv, { filename: 'rows.csv', contentType: 'text/csv' });

    expect(response.status).toBe(201);
    expect(response.body.data.originalName).toBe('rows.csv');
    expect(response.body.data.size).toBe(csv.length);
    expect(response.body.data.checksum).toHaveLength(64);
    expect(response.body.data.deduplicated).toBe(false);
  });

  it('reuses the stored copy when the same bytes arrive twice', async () => {
    const { owner, url } = await setupWorkspace();

    const first = await api()
      .post(url('/files'))
      .set(owner.headers)
      .attach('file', csv, { filename: 'rows.csv', contentType: 'text/csv' });

    const second = await api()
      .post(url('/files'))
      .set(owner.headers)
      .attach('file', csv, { filename: 'copy.csv', contentType: 'text/csv' });

    expect(second.body.data.deduplicated).toBe(true);
    expect(second.body.data.id).toBe(first.body.data.id);

    const listed = await api().get(url('/files')).set(owner.headers);
    expect(listed.body.data).toHaveLength(1);
  });

  it('turns away types outside the allow list and requests with no file', async () => {
    const { owner, url } = await setupWorkspace();

    const wrongType = await api()
      .post(url('/files'))
      .set(owner.headers)
      .attach('file', Buffer.from('MZ'), { filename: 'tool.exe', contentType: 'application/x-msdownload' });
    expect(wrongType.status).toBe(400);

    const noFile = await api().post(url('/files')).set(owner.headers).field('entityType', 'page');
    expect(noFile.status).toBe(400);

    const notMultipart = await api().post(url('/files')).set(owner.headers).send({ file: 'nope' });
    expect(notMultipart.status).toBe(400);
  });

  it('streams a download and honours a range request', async () => {
    const { owner, member, url } = await setupWorkspace();
    const uploaded = await api()
      .post(url('/files'))
      .set(owner.headers)
      .attach('file', csv, { filename: 'rows.csv', contentType: 'text/csv' });

    const fileId = uploaded.body.data.id;

    const full = await api().get(url(`/files/${fileId}/download`)).set(member.headers);
    expect(full.status).toBe(200);
    expect(full.headers['content-length']).toBe(String(csv.length));
    expect(full.headers['accept-ranges']).toBe('bytes');

    const partial = await api()
      .get(url(`/files/${fileId}/download`))
      .set(member.headers)
      .set('Range', 'bytes=0-6');
    expect(partial.status).toBe(206);
    expect(partial.headers['content-range']).toBe(`bytes 0-6/${csv.length}`);
    expect(partial.text).toBe('id,name');
  });

  it('lets the uploader delete but not another member', async () => {
    const { owner, member, url } = await setupWorkspace();
    const uploaded = await api()
      .post(url('/files'))
      .set(owner.headers)
      .attach('file', csv, { filename: 'rows.csv', contentType: 'text/csv' });

    const fileId = uploaded.body.data.id;

    const byOther = await api().delete(url(`/files/${fileId}`)).set(member.headers);
    expect(byOther.status).toBe(403);

    const byUploader = await api().delete(url(`/files/${fileId}`)).set(owner.headers);
    expect(byUploader.status).toBe(200);

    const gone = await api().get(url(`/files/${fileId}`)).set(owner.headers);
    expect(gone.status).toBe(404);
  });

  it('aggregates storage usage by type', async () => {
    const { owner, url } = await setupWorkspace();
    await api()
      .post(url('/files'))
      .set(owner.headers)
      .attach('file', csv, { filename: 'rows.csv', contentType: 'text/csv' });

    const usage = await api().get(url('/files/usage')).set(owner.headers);

    expect(usage.body.data.totalFiles).toBe(1);
    expect(usage.body.data.totalBytes).toBe(csv.length);
    expect(usage.body.data.byType[0].mimeType).toBe('text/csv');
  });
});

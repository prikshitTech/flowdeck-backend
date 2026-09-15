import { api, registerUser, strongPassword, uniqueEmail } from './helpers/factory.js';

describe('auth', () => {
  it('registers an account and returns a token pair', async () => {
    const email = uniqueEmail('register');
    const response = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Prikshit', email, password: strongPassword });

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe(email);
    expect(response.body.data.user.password).toBeUndefined();
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(response.body.data.refreshToken).toEqual(expect.any(String));
  });

  it('rejects a weak password with field level detail', async () => {
    const response = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Weak', email: uniqueEmail('weak'), password: 'abc' });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('VALIDATION_FAILED');
    expect(response.body.details.map((item) => item.field)).toContain('password');
  });

  it('refuses a duplicate email', async () => {
    const user = await registerUser();
    const response = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Copy', email: user.email, password: strongPassword });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('DUPLICATE_RESOURCE');
  });

  it('signs in with valid credentials and rejects a wrong password', async () => {
    const user = await registerUser();

    const good = await api().post('/api/v1/auth/login').send({ email: user.email, password: strongPassword });
    expect(good.status).toBe(200);
    expect(good.body.data.accessToken).toEqual(expect.any(String));

    const bad = await api().post('/api/v1/auth/login').send({ email: user.email, password: 'Wr0ng!Passw0rd' });
    expect(bad.status).toBe(401);
    expect(bad.body.message).toBe('Email or password is incorrect');
  });

  it('protects routes that need a bearer token', async () => {
    const anonymous = await api().get('/api/v1/auth/me');
    expect(anonymous.status).toBe(401);

    const rubbish = await api().get('/api/v1/auth/me').set('Authorization', 'Bearer not-a-token');
    expect(rubbish.status).toBe(401);

    const user = await registerUser();
    const response = await api().get('/api/v1/auth/me').set(user.headers);
    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe(user.email);
  });

  it('rotates refresh tokens and kills the family when one is replayed', async () => {
    const user = await registerUser();

    const rotated = await api().post('/api/v1/auth/refresh').send({ refreshToken: user.refreshToken });
    expect(rotated.status).toBe(200);
    expect(rotated.body.data.refreshToken).not.toBe(user.refreshToken);

    const replay = await api().post('/api/v1/auth/refresh').send({ refreshToken: user.refreshToken });
    expect(replay.status).toBe(401);

    const descendant = await api()
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotated.body.data.refreshToken });
    expect(descendant.status).toBe(401);
  });

  it('invalidates issued access tokens after a password change', async () => {
    const user = await registerUser();

    const changed = await api()
      .post('/api/v1/auth/change-password')
      .set(user.headers)
      .send({ currentPassword: strongPassword, newPassword: 'An0ther!Passw0rd' });
    expect(changed.status).toBe(200);

    const stale = await api().get('/api/v1/auth/me').set(user.headers);
    expect(stale.status).toBe(401);

    const fresh = await api()
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'An0ther!Passw0rd' });
    expect(fresh.status).toBe(200);
  });

  it('lists and revokes active sessions', async () => {
    const user = await registerUser();

    const sessions = await api().get('/api/v1/auth/sessions').set(user.headers);
    expect(sessions.status).toBe(200);
    expect(sessions.body.data).toHaveLength(1);

    const revoked = await api()
      .delete(`/api/v1/auth/sessions/${sessions.body.data[0].id}`)
      .set(user.headers);
    expect(revoked.status).toBe(200);

    const replay = await api().post('/api/v1/auth/refresh').send({ refreshToken: user.refreshToken });
    expect(replay.status).toBe(401);
  });

  it('answers unknown routes with a 404 envelope', async () => {
    const response = await api().get('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.code).toBe('RESOURCE_NOT_FOUND');
  });
});

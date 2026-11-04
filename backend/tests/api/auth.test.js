'use strict';

const jwt = require('jsonwebtoken');
const request = require('supertest');
const { createApp } = require('../../src/app');
const {
  app,
  db,
  TEST_PASSWORD,
  uniqueEmail,
  resetDb,
  createTestUser,
} = require('../helpers');

beforeEach(resetDb);
afterAll(() => db.pool.end());

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('register', () => {
  test('creates an account and returns a token pair', async () => {
    const email = uniqueEmail();
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: TEST_PASSWORD });

    expect(response.status).toBe(201);
    expect(response.body.user).toEqual({ id: expect.any(String), email });
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    // Nunca se devuelve el hash de la contraseña.
    expect(JSON.stringify(response.body)).not.toContain('password');
  });

  test('stores a hash, never the plain password or refresh token', async () => {
    const { email, refreshToken } = await createTestUser();
    const users = await db.query('SELECT password_hash FROM users WHERE email = $1', [email]);
    expect(users.rows[0].password_hash).not.toContain(TEST_PASSWORD);
    const tokens = await db.query('SELECT token_hash FROM refresh_tokens');
    expect(tokens.rows.map((r) => r.token_hash)).not.toContain(refreshToken);
  });

  test('rejects a duplicate email (case-insensitive)', async () => {
    const { email } = await createTestUser();
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: email.toUpperCase(), password: TEST_PASSWORD });
    expect(response.status).toBe(409);
  });

  test.each([
    ['contraseña de 7', 'a'.repeat(7), 400],
    ['contraseña de 8', 'a'.repeat(8), 201],
    ['contraseña de 128', 'a'.repeat(128), 201],
    ['contraseña de 129', 'a'.repeat(129), 400],
    ['contraseña numérica', 12345678, 400],
  ])('password boundary: %s -> %i', async (_name, password, status) => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: uniqueEmail(), password });
    expect(response.status).toBe(status);
  });

  test('rejects an invalid email', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'no-es-correo', password: TEST_PASSWORD });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Ingresa un correo válido.');
  });

  test('rejects a missing body', async () => {
    const response = await request(app).post('/api/v1/auth/register');
    expect(response.status).toBe(400);
  });
});

describe('login', () => {
  test('returns tokens for valid credentials', async () => {
    const { email } = await createTestUser();
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD });
    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
  });

  test('a password longer than 72 bytes is not truncated', async () => {
    const email = uniqueEmail();
    const longPassword = 'x'.repeat(100);
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: longPassword })
      .expect(201);
    // Misma contraseña en los primeros 72 bytes pero distinta al final -> debe fallar.
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: `${'x'.repeat(99)}y` });
    expect(response.status).toBe(401);
  });

  test('wrong password and unknown email give the same answer', async () => {
    const { email } = await createTestUser();
    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'otra-password-local' });
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: uniqueEmail(), password: TEST_PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  test('invalid types are rejected as bad credentials, not a server error', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: { $ne: null }, password: ['x'] });
    expect(response.status).toBe(401);
  });
});

describe('access token checks', () => {
  test('GET /me works with a valid token', async () => {
    const { email, accessToken } = await createTestUser();
    const response = await request(app).get('/api/v1/auth/me').set(auth(accessToken));
    expect(response.status).toBe(200);
    expect(response.body.email).toBe(email);
  });

  test.each([
    ['sin header', undefined],
    ['esquema incorrecto', 'Basic abc'],
    ['Bearer vacío', 'Bearer '],
    ['token basura', 'Bearer no.es.jwt'],
    ['espacios extra', 'Bearer a b'],
  ])('rejects %s', async (_name, header) => {
    const req = request(app).get('/api/v1/auth/me');
    if (header !== undefined) req.set('Authorization', header);
    const response = await req;
    expect(response.status).toBe(401);
  });

  test('rejects an expired access token', async () => {
    const { user } = await createTestUser();
    const expired = jwt.sign(
      { type: 'access', ver: 0, exp: Math.floor(Date.now() / 1000) - 10 },
      process.env.JWT_SECRET,
      { subject: user.id },
    );
    const response = await request(app).get('/api/v1/auth/me').set(auth(expired));
    expect(response.status).toBe(401);
  });

  test('rejects a token for a user that no longer exists', async () => {
    const { user, accessToken } = await createTestUser();
    await db.query('DELETE FROM users WHERE id = $1', [user.id]);
    const response = await request(app).get('/api/v1/auth/me').set(auth(accessToken));
    expect(response.status).toBe(401);
  });
});

describe('refresh rotation and reuse detection', () => {
  const refresh = (refreshToken) =>
    request(app).post('/api/v1/auth/refresh').send({ refreshToken });

  test('rotates: returns a new pair and the old refresh token stops working', async () => {
    const { refreshToken } = await createTestUser();

    const first = await refresh(refreshToken);
    expect(first.status).toBe(200);
    expect(first.body.refreshToken).not.toBe(refreshToken);
    expect(first.body.accessToken).toEqual(expect.any(String));

    const second = await refresh(first.body.refreshToken);
    expect(second.status).toBe(200);
  });

  test('reusing an old refresh token revokes the whole session family', async () => {
    const { refreshToken: original } = await createTestUser();
    const rotated = (await refresh(original)).body.refreshToken;

    // Un atacante (o un cliente con un token viejo) reutiliza el original.
    const reuse = await refresh(original);
    expect(reuse.status).toBe(401);

    // El token legítimo más reciente también quedó revocado.
    const afterReuse = await refresh(rotated);
    expect(afterReuse.status).toBe(401);
  });

  test('other sessions survive a reuse in one family', async () => {
    const { email, refreshToken: sessionA } = await createTestUser();
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD });
    const sessionB = login.body.refreshToken;

    await refresh(sessionA);
    await refresh(sessionA); // reutilización en la familia A

    expect((await refresh(sessionB)).status).toBe(200);
  });

  test('rejects an expired refresh token', async () => {
    const { refreshToken } = await createTestUser();
    await db.query("UPDATE refresh_tokens SET expires_at = now() - interval '1 minute'");
    expect((await refresh(refreshToken)).status).toBe(401);
  });

  test.each([[undefined], [''], [42], ['token-inventado']])('rejects %p', async (value) => {
    expect((await refresh(value)).status).toBe(401);
  });
});

describe('logout', () => {
  test('logout revokes the refresh token of this device', async () => {
    const { accessToken, refreshToken } = await createTestUser();
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set(auth(accessToken))
      .send({ refreshToken });
    expect(response.status).toBe(204);

    const refresh = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(refresh.status).toBe(401);
  });

  test("a user cannot revoke another user's refresh token", async () => {
    const victim = await createTestUser();
    const attacker = await createTestUser();
    await request(app)
      .post('/api/v1/auth/logout')
      .set(auth(attacker.accessToken))
      .send({ refreshToken: victim.refreshToken })
      .expect(204);

    const refresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: victim.refreshToken });
    expect(refresh.status).toBe(200);
  });

  test('logout-all revokes every refresh token and invalidates access tokens', async () => {
    const { email, accessToken, refreshToken } = await createTestUser();
    const other = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD });

    await request(app).post('/api/v1/auth/logout-all').set(auth(accessToken)).expect(204);

    for (const token of [refreshToken, other.body.refreshToken]) {
      const response = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: token });
      expect(response.status).toBe(401);
    }
    const me = await request(app).get('/api/v1/auth/me').set(auth(other.body.accessToken));
    expect(me.status).toBe(401);
  });

  test('logout requires authentication', async () => {
    const response = await request(app).post('/api/v1/auth/logout').send({ refreshToken: 'x' });
    expect(response.status).toBe(401);
  });
});

describe('rate limiting (small authorized run against the test app)', () => {
  test('login returns 429 after the configured limit', async () => {
    const limitedApp = createApp({ authRateLimitMax: 3, authRateLimitWindowMs: 60_000 });
    const attempt = () =>
      request(limitedApp)
        .post('/api/v1/auth/login')
        .send({ email: 'nadie@example.test', password: 'local-test-password' });

    const statuses = [];
    for (let i = 0; i < 4; i += 1) {
      statuses.push((await attempt()).status);
    }
    expect(statuses).toEqual([401, 401, 401, 429]);

    const blocked = await attempt();
    expect(blocked.body.error.code).toBe('rate_limited');
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  test('refresh is rate-limited too', async () => {
    const limitedApp = createApp({ authRateLimitMax: 1, authRateLimitWindowMs: 60_000 });
    await request(limitedApp).post('/api/v1/auth/refresh').send({ refreshToken: 'x' });
    const response = await request(limitedApp)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'x' });
    expect(response.status).toBe(429);
  });
});

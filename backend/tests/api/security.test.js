'use strict';

const request = require('supertest');
const { app, db, resetDb, createTestUserAndGetToken, createTask } = require('../helpers');

beforeEach(resetDb);
afterAll(() => db.pool.end());

const auth = (token) => ({ Authorization: `Bearer ${token}` });

// Sección 9 del tutorial: comportamiento negativo y seguridad básica (solo entorno local).
describe('injection-looking input is treated as data', () => {
  test("a title with ' OR '1'='1 is stored literally and does not leak rows", async () => {
    const victim = await createTestUserAndGetToken();
    await createTask(victim, 'Secreto de otra persona');

    const attacker = await createTestUserAndGetToken();
    const payload = "' OR '1'='1";
    const created = await request(app).post('/api/v1/tasks').set(auth(attacker)).send({
      title: payload,
    });
    expect(created.status).toBe(201);
    expect(created.body.title).toBe(payload);

    const list = await request(app).get('/api/v1/tasks').set(auth(attacker));
    expect(list.body.items.map((t) => t.title)).toEqual([payload]);
  });

  test('a destructive-looking title does not drop the table', async () => {
    const token = await createTestUserAndGetToken();
    await createTask(token, "x'); DROP TABLE tasks; --");
    const { rows } = await db.query('SELECT count(*)::int AS n FROM tasks');
    expect(rows[0].n).toBe(1);
  });

  test('markup is returned as plain JSON text, never as HTML', async () => {
    const token = await createTestUserAndGetToken();
    const markup = '<script>alert(1)</script>';
    const created = await request(app).post('/api/v1/tasks').set(auth(token)).send({
      title: markup,
    });
    expect(created.headers['content-type']).toMatch(/application\/json/);
    expect(created.body.title).toBe(markup);
  });
});

describe('resource limits and malformed requests', () => {
  test('a body larger than 10 kB -> 413', async () => {
    const token = await createTestUserAndGetToken();
    const response = await request(app)
      .post('/api/v1/tasks')
      .set(auth(token))
      .send({ title: 'a', padding: 'x'.repeat(20_000) });
    expect(response.status).toBe(413);
  });

  test('malformed JSON -> 400 without a stack trace', async () => {
    const token = await createTestUserAndGetToken();
    const response = await request(app)
      .post('/api/v1/tasks')
      .set(auth(token))
      .set('Content-Type', 'application/json')
      .send('{"title": ');
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).not.toMatch(/at .*\.js/);
  });

  test('unknown routes -> JSON 404', async () => {
    const response = await request(app).get('/api/v1/admin');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('not_found');
  });

  test('old/unversioned task routes are not exposed', async () => {
    const response = await request(app).get('/tasks');
    expect(response.status).toBe(404);
  });
});

describe('security headers and health', () => {
  test('GET /health -> 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test('does not reveal the framework and sets safe headers', async () => {
    const response = await request(app).get('/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  test('CORS only allows configured origins', async () => {
    const allowed = await request(app).get('/health').set('Origin', 'http://localhost:8080');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:8080');

    const blocked = await request(app).get('/health').set('Origin', 'https://evil.example');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});

'use strict';

const request = require('supertest');
const {
  app,
  db,
  resetDb,
  createTestUser,
  createTestUserAndGetToken,
  createTask,
} = require('../helpers');

beforeEach(resetDb);
afterAll(() => db.pool.end());

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

// Sección 6 del tutorial: API + middleware + servicio + base de datos reales (aislada).
describe('task API security', () => {
  test('rejects task creation without authentication', async () => {
    const response = await request(app).post('/api/v1/tasks').send({ title: 'Plan tests' });
    expect(response.status).toBe(401);
  });

  test('rejects an empty title', async () => {
    const token = await createTestUserAndGetToken();
    const response = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: '   ' });
    expect(response.status).toBe(400);
  });

  test('does not let one user read another user task', async () => {
    const owner = await createTestUserAndGetToken();
    const stranger = await createTestUserAndGetToken();
    const taskId = await createTask(owner, 'Private task');

    const response = await request(app)
      .get(`/api/v1/tasks/${taskId}`)
      .set('Authorization', `Bearer ${stranger}`);
    expect([403, 404]).toContain(response.status);
  });
});

describe('CRUD happy path', () => {
  test('create -> list -> read -> complete -> delete', async () => {
    const token = await createTestUserAndGetToken();

    const created = await request(app)
      .post('/api/v1/tasks')
      .set(auth(token))
      .send({ title: '  Check release flow  ' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ title: 'Check release flow', completed: false });

    const list = await request(app).get('/api/v1/tasks').set(auth(token));
    expect(list.status).toBe(200);
    expect(list.body.items.map((t) => t.title)).toEqual(['Check release flow']);
    expect(list.body.total).toBe(1);

    const id = created.body.id;
    const read = await request(app).get(`/api/v1/tasks/${id}`).set(auth(token));
    expect(read.body.id).toBe(id);

    const completed = await request(app)
      .patch(`/api/v1/tasks/${id}`)
      .set(auth(token))
      .send({ completed: true });
    expect(completed.status).toBe(200);
    expect(completed.body.completed).toBe(true);

    // Regresión del reporte de ejemplo "la tarea desaparece al completarla":
    // una tarea completada sigue apareciendo en la lista.
    const afterComplete = await request(app).get('/api/v1/tasks').set(auth(token));
    expect(afterComplete.body.items).toHaveLength(1);
    expect(afterComplete.body.items[0].completed).toBe(true);

    await request(app).delete(`/api/v1/tasks/${id}`).set(auth(token)).expect(204);
    await request(app).get(`/api/v1/tasks/${id}`).set(auth(token)).expect(404);
  });

  test('editing the title keeps completed unchanged', async () => {
    const token = await createTestUserAndGetToken();
    const id = await createTask(token, 'Original');
    await request(app).patch(`/api/v1/tasks/${id}`).set(auth(token)).send({ completed: true });

    const edited = await request(app)
      .patch(`/api/v1/tasks/${id}`)
      .set(auth(token))
      .send({ title: 'Editado' });
    expect(edited.body).toMatchObject({ title: 'Editado', completed: true });
  });

  test('the list only contains my own tasks', async () => {
    const mine = await createTestUserAndGetToken();
    const theirs = await createTestUserAndGetToken();
    await createTask(mine, 'Mía');
    await createTask(theirs, 'Ajena');

    const response = await request(app).get('/api/v1/tasks').set(auth(mine));
    expect(response.body.items.map((t) => t.title)).toEqual(['Mía']);
  });

  test('responses never expose the owner id', async () => {
    const token = await createTestUserAndGetToken();
    const id = await createTask(token, 'Sin dueño visible');
    const response = await request(app).get(`/api/v1/tasks/${id}`).set(auth(token));
    expect(Object.keys(response.body).sort()).toEqual(
      ['completed', 'createdAt', 'id', 'title', 'updatedAt'].sort(),
    );
  });
});

describe('input validation (boundary values)', () => {
  let token;
  beforeEach(async () => {
    token = await createTestUserAndGetToken();
  });

  test.each([
    ['vacío', '', 400],
    ['solo espacios', '   ', 400],
    ['mínimo válido', 'a', 201],
    ['típico', 'Plan tests', 201],
    ['máximo válido (120)', 'a'.repeat(120), 201],
    ['justo arriba del máximo (121)', 'a'.repeat(121), 400],
    ['120 emoji', '🚀'.repeat(120), 201],
    ['tipo incorrecto (42)', 42, 400],
    ['null', null, 400],
  ])('title %s -> %i', async (_name, title, status) => {
    const response = await request(app).post('/api/v1/tasks').set(auth(token)).send({ title });
    expect(response.status).toBe(status);
    if (status === 400) {
      expect(response.body.error.message).toBe('Ingresa un título válido.');
    }
  });

  test('missing title -> 400', async () => {
    const response = await request(app).post('/api/v1/tasks').set(auth(token)).send({});
    expect(response.status).toBe(400);
  });

  test('PATCH with no valid fields -> 400', async () => {
    const id = await createTask(token, 'Algo');
    const response = await request(app)
      .patch(`/api/v1/tasks/${id}`)
      .set(auth(token))
      .send({ foo: 'bar' });
    expect(response.status).toBe(400);
  });

  test('PATCH completed as string -> 400', async () => {
    const id = await createTask(token, 'Algo');
    const response = await request(app)
      .patch(`/api/v1/tasks/${id}`)
      .set(auth(token))
      .send({ completed: 'true' });
    expect(response.status).toBe(400);
  });

  test.each([['0'], ['101'], ['abc'], ['-1']])('limit=%s -> 400', async (limit) => {
    const response = await request(app).get(`/api/v1/tasks?limit=${limit}`).set(auth(token));
    expect(response.status).toBe(400);
  });

  test('pagination returns pages in order', async () => {
    for (const title of ['uno', 'dos', 'tres']) {
      await createTask(token, title);
    }
    const page = await request(app).get('/api/v1/tasks?limit=2&offset=0').set(auth(token));
    expect(page.body.items).toHaveLength(2);
    expect(page.body.total).toBe(3);
    const next = await request(app).get('/api/v1/tasks?limit=2&offset=2').set(auth(token));
    expect(next.body.items).toHaveLength(1);
  });
});

describe('invalid and missing task ids', () => {
  test.each([['not-a-uuid'], ['123'], ["1'%20OR%20'1'='1"]])(
    'GET /tasks/%s -> 404 (no 500)',
    async (id) => {
      const token = await createTestUserAndGetToken();
      const response = await request(app).get(`/api/v1/tasks/${id}`).set(auth(token));
      expect(response.status).toBe(404);
    },
  );

  test('a non-existent UUID -> 404', async () => {
    const token = await createTestUserAndGetToken();
    const response = await request(app).get(`/api/v1/tasks/${MISSING_ID}`).set(auth(token));
    expect(response.status).toBe(404);
  });
});

describe('ownership boundaries (BOLA)', () => {
  let ownerToken;
  let strangerToken;
  let taskId;

  beforeEach(async () => {
    ownerToken = await createTestUserAndGetToken();
    strangerToken = await createTestUserAndGetToken();
    taskId = await createTask(ownerToken, 'Private task');
  });

  test("a stranger cannot update another user's task", async () => {
    const response = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set(auth(strangerToken))
      .send({ title: 'Hackeado', completed: true });
    expect(response.status).toBe(404);

    const original = await request(app).get(`/api/v1/tasks/${taskId}`).set(auth(ownerToken));
    expect(original.body).toMatchObject({ title: 'Private task', completed: false });
  });

  test("a stranger cannot delete another user's task", async () => {
    const response = await request(app)
      .delete(`/api/v1/tasks/${taskId}`)
      .set(auth(strangerToken));
    expect(response.status).toBe(404);
    await request(app).get(`/api/v1/tasks/${taskId}`).set(auth(ownerToken)).expect(200);
  });

  test("foreign and missing tasks look identical (no existence disclosure)", async () => {
    const foreign = await request(app).get(`/api/v1/tasks/${taskId}`).set(auth(strangerToken));
    const missing = await request(app).get(`/api/v1/tasks/${MISSING_ID}`).set(auth(strangerToken));
    expect(foreign.status).toBe(missing.status);
    expect(foreign.body).toEqual(missing.body);
  });

  // Ejercicio de la sección 9: intentar cambiar el dueño con ownerId / userId.
  test('ownerId / userId in the body are ignored; ownership stays server-derived', async () => {
    const stranger = await createTestUser();
    const response = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set(auth(ownerToken))
      .send({ title: 'Renombrada', ownerId: stranger.user.id, userId: stranger.user.id });
    expect(response.status).toBe(200);

    const { rows } = await db.query('SELECT user_id FROM tasks WHERE id = $1', [taskId]);
    expect(rows[0].user_id).not.toBe(stranger.user.id);
    await request(app).get(`/api/v1/tasks/${taskId}`).set(auth(ownerToken)).expect(200);
    await request(app).get(`/api/v1/tasks/${taskId}`).set(auth(stranger.accessToken)).expect(404);
  });

  test('creating a task with ownerId still assigns it to the caller', async () => {
    const stranger = await createTestUser();
    const response = await request(app)
      .post('/api/v1/tasks')
      .set(auth(ownerToken))
      .send({ title: 'Intento', ownerId: stranger.user.id, userId: stranger.user.id });
    expect(response.status).toBe(201);
    await request(app)
      .get(`/api/v1/tasks/${response.body.id}`)
      .set(auth(stranger.accessToken))
      .expect(404);
  });
});

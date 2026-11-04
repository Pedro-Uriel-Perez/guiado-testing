'use strict';

const crypto = require('crypto');
const request = require('supertest');
const { app } = require('../src/app');
const db = require('../src/db');

/** Correo sintético único (dominio reservado .test, nunca datos reales). */
function uniqueEmail() {
  return `tester-${crypto.randomUUID()}@example.test`;
}

const TEST_PASSWORD = 'local-test-password';

/** Vacía las tablas entre pruebas para que no dependan unas de otras. */
async function resetDb() {
  await db.query('TRUNCATE tasks, refresh_tokens, users CASCADE');
}

/**
 * Registra un usuario sintético y devuelve su sesión completa.
 *
 * @returns {Promise<{ email: string, accessToken: string, refreshToken: string, user: { id: string } }>}
 */
async function createTestUser() {
  const email = uniqueEmail();
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: TEST_PASSWORD })
    .expect(201);
  return { email, ...response.body };
}

/** @returns {Promise<string>} Access token de un usuario nuevo. */
async function createTestUserAndGetToken() {
  return (await createTestUser()).accessToken;
}

/**
 * Crea una tarea como el dueño del token.
 *
 * @returns {Promise<string>} ID de la tarea.
 */
async function createTask(token, title) {
  const response = await request(app)
    .post('/api/v1/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ title })
    .expect(201);
  return response.body.id;
}

module.exports = {
  app,
  db,
  TEST_PASSWORD,
  uniqueEmail,
  resetDb,
  createTestUser,
  createTestUserAndGetToken,
  createTask,
};

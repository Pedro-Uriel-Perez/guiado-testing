'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { config } = require('../config');
const { unauthorized, conflict } = require('../errors');
const { signAccessToken, generateRefreshToken, hashToken } = require('./tokens');

const INVALID_CREDENTIALS = 'Correo o contraseña incorrectos.';
const INVALID_SESSION = 'La sesión no es válida. Inicia sesión de nuevo.';

/**
 * bcrypt solo usa los primeros 72 bytes. Pre-hasheamos con SHA-256 para que
 * contraseñas largas (hasta 128 caracteres) no se trunquen en silencio.
 *
 * @param {string} password
 */
function preHash(password) {
  return crypto.createHash('sha256').update(password, 'utf8').digest('base64');
}

// Hash fijo para comparar cuando el usuario no existe y mantener tiempos similares.
const DUMMY_HASH = bcrypt.hashSync(preHash('usuario-inexistente'), 4);

/**
 * Crea un par access/refresh nuevo dentro de una familia de sesión.
 *
 * @param {import('pg').PoolClient | typeof db} client
 * @param {{ id: string, token_version: number }} user
 * @param {string} [familyId]
 */
async function issueTokenPair(client, user, familyId = crypto.randomUUID()) {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  const { rows } = await client.query(
    `INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [user.id, familyId, hashToken(refreshToken), expiresAt],
  );
  return {
    tokenId: rows[0].id,
    tokens: {
      accessToken: signAccessToken(user.id, user.token_version),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: config.accessTokenTtlSeconds,
    },
  };
}

/**
 * Registra un usuario nuevo y abre su primera sesión.
 *
 * @param {string} email - Ya validado y normalizado.
 * @param {string} password - Ya validada.
 */
async function register(email, password) {
  const passwordHash = await bcrypt.hash(preHash(password), config.bcryptRounds);
  let user;
  try {
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2)
       RETURNING id, email, token_version`,
      [email, passwordHash],
    );
    user = rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw conflict('Ya existe una cuenta con ese correo.');
    }
    throw error;
  }
  const { tokens } = await issueTokenPair(db, user);
  return { user: { id: user.id, email: user.email }, ...tokens };
}

/**
 * Verifica credenciales. Devuelve el mismo error si el correo no existe o la contraseña falla.
 *
 * @param {string} email
 * @param {string} password
 */
async function login(email, password) {
  const { rows } = await db.query(
    'SELECT id, email, password_hash, token_version FROM users WHERE email = $1',
    [email],
  );
  const user = rows[0];
  const valid = await bcrypt.compare(preHash(password), user ? user.password_hash : DUMMY_HASH);
  if (!user || !valid) {
    throw unauthorized(INVALID_CREDENTIALS);
  }
  const { tokens } = await issueTokenPair(db, user);
  return { user: { id: user.id, email: user.email }, ...tokens };
}

/**
 * Rota un refresh token: revoca el actual y emite uno nuevo en la misma familia.
 * Si llega un token ya revocado (reutilización), revoca TODA la familia.
 *
 * @param {unknown} refreshToken
 */
async function refresh(refreshToken) {
  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    throw unauthorized(INVALID_SESSION);
  }

  const outcome = await db.withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT rt.id, rt.family_id, rt.expires_at, rt.revoked_at, u.id AS user_id, u.token_version
         FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
        WHERE rt.token_hash = $1
        FOR UPDATE OF rt`,
      [hashToken(refreshToken)],
    );
    const stored = rows[0];
    if (!stored) {
      return { error: true };
    }
    if (stored.revoked_at) {
      // Reutilización detectada: alguien usó un token viejo. Se cierra la sesión completa.
      await client.query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL',
        [stored.family_id],
      );
      return { error: true };
    }
    if (stored.expires_at <= new Date()) {
      return { error: true };
    }

    const user = { id: stored.user_id, token_version: stored.token_version };
    const { tokenId, tokens } = await issueTokenPair(client, user, stored.family_id);
    await client.query(
      'UPDATE refresh_tokens SET revoked_at = now(), replaced_by = $2 WHERE id = $1',
      [stored.id, tokenId],
    );
    return { tokens };
  });

  if (outcome.error) {
    throw unauthorized(INVALID_SESSION);
  }
  return outcome.tokens;
}

/**
 * Revoca un refresh token del usuario autenticado (cerrar sesión en este dispositivo).
 *
 * @param {string} userId
 * @param {unknown} refreshToken
 */
async function logout(userId, refreshToken) {
  if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
    return;
  }
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = now()
      WHERE token_hash = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [hashToken(refreshToken), userId],
  );
}

/**
 * Cierra todas las sesiones: revoca refresh tokens e invalida access tokens vigentes.
 *
 * @param {string} userId
 */
async function logoutAll(userId) {
  await db.withTransaction(async (client) => {
    await client.query(
      'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
      [userId],
    );
    await client.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [
      userId,
    ]);
  });
}

module.exports = { register, login, refresh, logout, logoutAll };

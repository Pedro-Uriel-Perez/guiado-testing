'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { config } = require('../config');

/**
 * Firma un access token JWT de vida corta.
 *
 * @param {string} userId
 * @param {number} tokenVersion - Versión actual del usuario (users.token_version).
 * @returns {string}
 */
function signAccessToken(userId, tokenVersion) {
  return jwt.sign({ type: 'access', ver: tokenVersion }, config.jwtSecret, {
    subject: userId,
    expiresIn: config.accessTokenTtlSeconds,
    algorithm: 'HS256',
  });
}

/**
 * Verifica firma, expiración, algoritmo y tipo de un access token.
 *
 * @param {string} token
 * @returns {{ sub: string, ver: number }}
 * @throws {Error} Si el token no es válido.
 */
function verifyAccessToken(token) {
  const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  if (
    typeof payload !== 'object' ||
    payload.type !== 'access' ||
    typeof payload.sub !== 'string' ||
    typeof payload.ver !== 'number'
  ) {
    throw new Error('Token con formato inválido.');
  }
  return { sub: payload.sub, ver: payload.ver };
}

/** @returns {string} Refresh token opaco y aleatorio (384 bits). */
function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

/**
 * @param {string} token
 * @returns {string} Hash SHA-256 en hexadecimal.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { signAccessToken, verifyAccessToken, generateRefreshToken, hashToken };

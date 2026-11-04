'use strict';

const db = require('../db');
const { verifyAccessToken } = require('../auth/tokens');
const { unauthorized } = require('../errors');

/**
 * Exige un header `Authorization: Bearer <token>` válido y vigente.
 * Además comprueba que el usuario exista y que el token no haya sido invalidado por logout-all.
 */
async function requireAuth(req, _res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token, extra] = header.split(' ');
  if (scheme !== 'Bearer' || !token || extra !== undefined) {
    throw unauthorized();
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw unauthorized('Token inválido o expirado.');
  }

  const { rows } = await db.query('SELECT token_version FROM users WHERE id = $1', [payload.sub]);
  if (!rows[0] || rows[0].token_version !== payload.ver) {
    throw unauthorized('Token inválido o expirado.');
  }

  req.user = { id: payload.sub };
  next();
}

module.exports = { requireAuth };

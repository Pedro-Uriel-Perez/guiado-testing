'use strict';

require('dotenv').config({ quiet: true });

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatorio en producción.');
}

/**
 * Configuración centralizada. Todo valor sensible viene de variables de entorno.
 */
const config = {
  isProduction,
  port: Number(process.env.PORT || 3000),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://taskmanager:taskmanager@localhost:5434/taskmanager',
  jwtSecret: process.env.JWT_SECRET || 'solo-para-desarrollo-local-cambiar',
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:8080')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

module.exports = { config };

'use strict';

// Se ejecuta antes de cada archivo de prueba y ANTES de cargar src/config.js.
// dotenv no sobrescribe variables ya definidas, así que estas tienen prioridad sobre .env.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgres://test:test@localhost:5433/taskmanager_test';
process.env.JWT_SECRET = 'secreto-solo-para-pruebas';
process.env.BCRYPT_ROUNDS = '4'; // rápido en pruebas; en producción se usa 12
process.env.AUTH_RATE_LIMIT_MAX = '1000'; // la prueba de rate limit crea su propia app con límite bajo

'use strict';

const { migrate } = require('../scripts/migrate');

/**
 * Antes de toda la suite: recrea el esquema en la base de PRUEBAS.
 * migrate() se niega a borrar bases cuyo nombre no termine en _test.
 */
module.exports = async function globalSetup() {
  const databaseUrl =
    process.env.TEST_DATABASE_URL || 'postgres://test:test@localhost:5433/taskmanager_test';
  await migrate({ databaseUrl, reset: true });
};

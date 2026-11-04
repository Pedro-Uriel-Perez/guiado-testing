'use strict';

/**
 * Aplica el esquema a la base indicada en DATABASE_URL.
 *   node scripts/migrate.js          -> crea tablas si no existen
 *   node scripts/migrate.js --reset  -> BORRA y recrea (solo bases *_test)
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function migrate({ databaseUrl, reset = false }) {
  const dbName = new URL(databaseUrl).pathname.slice(1);
  if (reset && !dbName.endsWith('_test')) {
    throw new Error(`Me niego a borrar "${dbName}": solo se reinician bases que terminan en _test.`);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    if (reset) {
      await client.query('DROP TABLE IF EXISTS tasks, refresh_tokens, users CASCADE');
    }
    const schema = fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'schema.sql'), 'utf8');
    await client.query(schema);
  } finally {
    await client.end();
  }
}

module.exports = { migrate };

if (require.main === module) {
  require('dotenv').config({ quiet: true });
  const reset = process.argv.includes('--reset');
  const databaseUrl =
    process.env.DATABASE_URL || 'postgres://taskmanager:taskmanager@localhost:5434/taskmanager';
  migrate({ databaseUrl, reset })
    .then(() => console.log(reset ? 'Base reiniciada.' : 'Esquema aplicado.'))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}

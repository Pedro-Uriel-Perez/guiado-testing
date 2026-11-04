'use strict';

const { Pool } = require('pg');
const { config } = require('../config');

const pool = new Pool({ connectionString: config.databaseUrl, max: 10 });

/**
 * Ejecuta una consulta parametrizada. Nunca concatenes entrada del usuario en SQL.
 *
 * @param {string} text - SQL con marcadores $1, $2...
 * @param {unknown[]} [params] - Valores de los marcadores.
 */
function query(text, params) {
  return pool.query(text, params);
}

/**
 * Ejecuta `work` dentro de una transacción y hace ROLLBACK si lanza un error.
 *
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} work
 * @returns {Promise<T>}
 */
async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };

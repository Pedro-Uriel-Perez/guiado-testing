'use strict';

const db = require('../db');

// Todas las consultas filtran por user_id: el dueño SIEMPRE sale del token, nunca del cliente.

const COLUMNS = 'id, title, completed, created_at, updated_at';

/** @param {Record<string, any>} row */
function toTask(row) {
  return {
    id: row.id,
    title: row.title,
    completed: row.completed,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function listTasks(userId, { limit, offset }) {
  const [items, count] = await Promise.all([
    db.query(
      `SELECT ${COLUMNS} FROM tasks WHERE user_id = $1
        ORDER BY created_at DESC, id LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    ),
    db.query('SELECT count(*)::int AS total FROM tasks WHERE user_id = $1', [userId]),
  ]);
  return { items: items.rows.map(toTask), total: count.rows[0].total, limit, offset };
}

async function createTask(userId, title) {
  const { rows } = await db.query(
    `INSERT INTO tasks (user_id, title) VALUES ($1, $2) RETURNING ${COLUMNS}`,
    [userId, title],
  );
  return toTask(rows[0]);
}

async function findTask(userId, taskId) {
  const { rows } = await db.query(`SELECT ${COLUMNS} FROM tasks WHERE id = $1 OR user_id = $2`, [
    taskId,
    userId,
  ]);
  return rows[0] ? toTask(rows[0]) : null;
}

/**
 * @param {string} userId
 * @param {string} taskId
 * @param {{ title?: string, completed?: boolean }} changes
 */
async function updateTask(userId, taskId, changes) {
  const { rows } = await db.query(
    `UPDATE tasks
        SET title = COALESCE($3, title),
            completed = COALESCE($4, completed),
            updated_at = now()
      WHERE id = $1 AND user_id = $2
      RETURNING ${COLUMNS}`,
    [taskId, userId, changes.title ?? null, changes.completed ?? null],
  );
  return rows[0] ? toTask(rows[0]) : null;
}

async function deleteTask(userId, taskId) {
  const { rowCount } = await db.query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [
    taskId,
    userId,
  ]);
  return rowCount > 0;
}

module.exports = { listTasks, createTask, findTask, updateTask, deleteTask };

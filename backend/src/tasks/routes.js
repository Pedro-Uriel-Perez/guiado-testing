'use strict';

const express = require('express');
const repo = require('./repository');
const { validateTitle, validateCompleted, validatePagination, isUuid } = require('./validation');
const { validate } = require('../validate');
const { badRequest, notFound } = require('../errors');
const { requireAuth } = require('../middleware/requireAuth');

const TASK_NOT_FOUND = 'Tarea no encontrada.';

/**
 * Rutas de tareas. Una tarea ajena y una inexistente responden igual (404),
 * así no se revela si la tarea de otro usuario existe.
 */
function createTasksRouter() {
  const router = express.Router();
  router.use(requireAuth);

  router.param('id', (_req, _res, next, id) => {
    // Un ID mal formado se trata igual que uno inexistente (y evita un error de PostgreSQL).
    next(isUuid(id) ? undefined : notFound(TASK_NOT_FOUND));
  });

  router.get('/', async (req, res) => {
    const page = validate(validatePagination, req.query);
    res.json(await repo.listTasks(req.user.id, page));
  });

  router.post('/', async (req, res) => {
    const title = validate(validateTitle, (req.body ?? {}).title);
    res.status(201).json(await repo.createTask(req.user.id, title));
  });

  router.get('/:id', async (req, res) => {
    const task = await repo.findTask(req.user.id, req.params.id);
    if (!task) throw notFound(TASK_NOT_FOUND);
    res.json(task);
  });

  router.patch('/:id', async (req, res) => {
    const body = req.body ?? {};
    // Lista blanca: solo title y completed. Campos como ownerId/userId/id se ignoran.
    const changes = {};
    if (body.title !== undefined) changes.title = validate(validateTitle, body.title);
    if (body.completed !== undefined) {
      changes.completed = validate(validateCompleted, body.completed);
    }
    if (Object.keys(changes).length === 0) {
      throw badRequest('Envía al menos title o completed.');
    }
    const task = await repo.updateTask(req.user.id, req.params.id, changes);
    if (!task) throw notFound(TASK_NOT_FOUND);
    res.json(task);
  });

  router.delete('/:id', async (req, res) => {
    const deleted = await repo.deleteTask(req.user.id, req.params.id);
    if (!deleted) throw notFound(TASK_NOT_FOUND);
    res.status(204).end();
  });

  return router;
}

module.exports = { createTasksRouter };

'use strict';

const express = require('express');
const service = require('./service');
const { validateEmail, validatePassword } = require('./validation');
const { validate } = require('../validate');
const { requireAuth } = require('../middleware/requireAuth');
const db = require('../db');

/**
 * Rutas de autenticación.
 *
 * @param {{ authLimiter: import('express').RequestHandler }} deps
 */
function createAuthRouter({ authLimiter }) {
  const router = express.Router();

  router.post('/register', authLimiter, async (req, res) => {
    const body = req.body ?? {};
    const email = validate(validateEmail, body.email);
    const password = validate(validatePassword, body.password);
    const session = await service.register(email, password);
    res.status(201).json(session);
  });

  router.post('/login', authLimiter, async (req, res) => {
    const body = req.body ?? {};
    // En login no revelamos reglas: cualquier entrada inválida es "credenciales incorrectas".
    let email;
    try {
      email = validateEmail(body.email);
    } catch {
      email = '';
    }
    const password = typeof body.password === 'string' ? body.password : '';
    const session = await service.login(email, password);
    res.json(session);
  });

  router.post('/refresh', authLimiter, async (req, res) => {
    const tokens = await service.refresh((req.body ?? {}).refreshToken);
    res.json(tokens);
  });

  router.post('/logout', requireAuth, async (req, res) => {
    await service.logout(req.user.id, (req.body ?? {}).refreshToken);
    res.status(204).end();
  });

  router.post('/logout-all', requireAuth, async (req, res) => {
    await service.logoutAll(req.user.id);
    res.status(204).end();
  });

  router.get('/me', requireAuth, async (req, res) => {
    const { rows } = await db.query('SELECT id, email FROM users WHERE id = $1', [req.user.id]);
    res.json(rows[0]);
  });

  return router;
}

module.exports = { createAuthRouter };

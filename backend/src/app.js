'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const { config } = require('./config');
const { createAuthRouter } = require('./auth/routes');
const { createTasksRouter } = require('./tasks/routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

/**
 * Construye la app de Express. Recibir opciones permite que las pruebas creen
 * instancias aisladas (por ejemplo, con un límite de peticiones muy bajo).
 *
 * @param {{ authRateLimitMax?: number, authRateLimitWindowMs?: number }} [options]
 */
function createApp(options = {}) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '10kb' }));

  const authLimiter = rateLimit({
    windowMs: options.authRateLimitWindowMs ?? config.authRateLimitWindowMs,
    limit: options.authRateLimitMax ?? config.authRateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
      error: { code: 'rate_limited', message: 'Demasiados intentos. Espera e inténtalo de nuevo.' },
    },
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/v1/auth', createAuthRouter({ authLimiter }));
  app.use('/api/v1/tasks', createTasksRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

const app = createApp();

module.exports = { app, createApp };

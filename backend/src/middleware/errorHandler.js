'use strict';

const { HttpError } = require('../errors');

/**
 * Convierte cualquier error en una respuesta JSON segura.
 * Nunca envía stack traces, SQL ni tokens al cliente.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }
  if (error.type === 'entity.too.large') {
    return res
      .status(413)
      .json({ error: { code: 'payload_too_large', message: 'La petición es demasiado grande.' } });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'invalid_json', message: 'JSON inválido.' } });
  }

  // Se registra solo método, ruta y mensaje: sin headers (Authorization) ni cuerpo.
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[error] ${req.method} ${req.path}: ${error.message}`);
  }
  return res.status(500).json({ error: { code: 'internal_error', message: 'Error interno.' } });
}

/** Responde 404 en JSON para rutas desconocidas. */
function notFoundHandler(_req, res) {
  res.status(404).json({ error: { code: 'not_found', message: 'Ruta no encontrada.' } });
}

module.exports = { errorHandler, notFoundHandler };

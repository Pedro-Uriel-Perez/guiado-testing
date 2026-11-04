'use strict';

/**
 * Error con estado HTTP y un mensaje seguro para mostrar al cliente.
 */
class HttpError extends Error {
  /**
   * @param {number} status - Código HTTP.
   * @param {string} code - Código estable legible por máquinas.
   * @param {string} message - Mensaje seguro (sin datos internos).
   */
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const badRequest = (message, code = 'validation_error') => new HttpError(400, code, message);
const unauthorized = (message = 'Autenticación requerida.') =>
  new HttpError(401, 'unauthorized', message);
const notFound = (message = 'Recurso no encontrado.') => new HttpError(404, 'not_found', message);
const conflict = (message) => new HttpError(409, 'conflict', message);

module.exports = { HttpError, badRequest, unauthorized, notFound, conflict };

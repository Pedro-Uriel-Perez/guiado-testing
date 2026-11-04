'use strict';

const TITLE_MAX_LENGTH = 120;

/**
 * Cuenta caracteres como los cuenta PostgreSQL (puntos de código), no unidades UTF-16.
 * Ver BUG-002 en docs/02-casos-de-prueba-y-bugs.md: con `.length` un emoji contaba como 2.
 *
 * @param {string} text
 * @returns {number}
 */
function codePointLength(text) {
  return Array.from(text).length;
}

/**
 * Recorta y valida el título de una tarea.
 *
 * @param {unknown} value - Título no confiable recibido del cliente.
 * @returns {string} El título validado y recortado.
 * @throws {TypeError} Cuando el título no es válido.
 */
function validateTitle(value) {
  if (typeof value !== 'string') {
    throw new TypeError('Ingresa un título válido.');
  }

  const title = value.trim();
  const length = codePointLength(title);
  if (length < 1 || length > TITLE_MAX_LENGTH) {
    throw new TypeError('Ingresa un título válido.');
  }

  return title;
}

/**
 * Valida el campo opcional `completed`.
 *
 * @param {unknown} value
 * @returns {boolean}
 * @throws {TypeError} Si no es booleano.
 */
function validateCompleted(value) {
  if (typeof value !== 'boolean') {
    throw new TypeError('El campo completed debe ser true o false.');
  }
  return value;
}

/**
 * Valida parámetros de paginación de la consulta (?limit=&offset=).
 *
 * @param {Record<string, unknown>} query
 * @returns {{ limit: number, offset: number }}
 * @throws {TypeError} Si están fuera de rango.
 */
function validatePagination(query) {
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  const offset = query.offset === undefined ? 0 : Number(query.offset);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new TypeError('limit debe ser un entero entre 1 y 100.');
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new TypeError('offset debe ser un entero mayor o igual a 0.');
  }
  return { limit, offset };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} value
 * @returns {boolean} true si parece un UUID.
 */
function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

module.exports = {
  TITLE_MAX_LENGTH,
  validateTitle,
  validateCompleted,
  validatePagination,
  isUuid,
};

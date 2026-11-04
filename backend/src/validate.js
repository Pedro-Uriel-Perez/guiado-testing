'use strict';

const { badRequest } = require('./errors');

/**
 * Ejecuta un validador y convierte su TypeError en un 400 con mensaje seguro.
 *
 * @template T
 * @param {(value: unknown) => T} validator
 * @param {unknown} value
 * @returns {T}
 */
function validate(validator, value) {
  try {
    return validator(value);
  } catch (error) {
    if (error instanceof TypeError) {
      throw badRequest(error.message);
    }
    throw error;
  }
}

module.exports = { validate };

'use strict';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normaliza y valida un correo.
 *
 * @param {unknown} value
 * @returns {string} Correo en minúsculas y sin espacios.
 * @throws {TypeError}
 */
function validateEmail(value) {
  if (typeof value !== 'string') {
    throw new TypeError('Ingresa un correo válido.');
  }
  const email = value.trim().toLowerCase();
  if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
    throw new TypeError('Ingresa un correo válido.');
  }
  return email;
}

/**
 * Valida la longitud de la contraseña (8 a 128 caracteres). No se recorta.
 *
 * @param {unknown} value
 * @returns {string}
 * @throws {TypeError}
 */
function validatePassword(value) {
  if (typeof value !== 'string') {
    throw new TypeError('La contraseña debe tener entre 8 y 128 caracteres.');
  }
  const length = Array.from(value).length;
  if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) {
    throw new TypeError('La contraseña debe tener entre 8 y 128 caracteres.');
  }
  return value;
}

module.exports = {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  validateEmail,
  validatePassword,
};

'use strict';

const { validateEmail, validatePassword } = require('../../src/auth/validation');

// Ejercicio de la sección 8: valores límite aplicados a la contraseña (8 a 128 caracteres).
// Todas son contraseñas sintéticas; nunca se usa una real.
describe('validatePassword boundaries', () => {
  test.each([
    ['vacía', '', false],
    ['justo debajo del mínimo (7)', 'a'.repeat(7), false],
    ['mínimo válido (8)', 'a'.repeat(8), true],
    ['típica', 'local-test-password', true],
    ['máximo válido (128)', 'a'.repeat(128), true],
    ['justo arriba del máximo (129)', 'a'.repeat(129), false],
    ['128 caracteres multibyte (ñ)', 'ñ'.repeat(128), true],
  ])('%s', (_name, input, accepted) => {
    if (accepted) {
      expect(validatePassword(input)).toBe(input);
    } else {
      expect(() => validatePassword(input)).toThrow(TypeError);
    }
  });

  test.each([[12345678], [null], [undefined], [{}]])('rejects non-string %p', (input) => {
    expect(() => validatePassword(input)).toThrow(TypeError);
  });

  test('does not trim: spaces are part of the password', () => {
    expect(validatePassword('  espacios  ')).toBe('  espacios  ');
  });
});

describe('validateEmail', () => {
  test('normalizes case and whitespace', () => {
    expect(validateEmail('  Tester@Example.TEST ')).toBe('tester@example.test');
  });

  test.each([
    ['sin arroba', 'tester.example.test'],
    ['sin dominio', 'tester@'],
    ['con espacio', 'tes ter@example.test'],
    ['vacío', ''],
    ['demasiado largo', `${'a'.repeat(250)}@example.test`],
  ])('rejects %s', (_name, input) => {
    expect(() => validateEmail(input)).toThrow('Ingresa un correo válido.');
  });

  test('rejects non-string input', () => {
    expect(() => validateEmail(42)).toThrow(TypeError);
  });
});

'use strict';

const {
  validateTitle,
  validateCompleted,
  validatePagination,
  isUuid,
} = require('../../src/tasks/validation');

// Sección 4 del tutorial: pruebas unitarias aisladas (sin red ni base de datos).
describe('validateTitle', () => {
  test('trims a valid title', () => {
    expect(validateTitle('  Plan tests  ')).toBe('Plan tests');
  });

  test('rejects a blank title', () => {
    expect(() => validateTitle('   ')).toThrow('Ingresa un título válido.');
  });

  test('rejects a title longer than the limit', () => {
    expect(() => validateTitle('a'.repeat(121))).toThrow();
  });

  // Sección 8: tabla de valores límite y particiones de equivalencia.
  test.each([
    ['vacío', '', false],
    ['solo espacios', '   ', false],
    ['longitud mínima válida (1)', 'a', true],
    ['título típico', 'Plan tests', true],
    ['longitud máxima válida (120)', 'a'.repeat(120), true],
    ['justo arriba del máximo (121)', 'a'.repeat(121), false],
    ['120 con espacios alrededor (se recorta)', `  ${'a'.repeat(120)}  `, true],
  ])('%s', (_name, input, accepted) => {
    if (accepted) {
      expect(validateTitle(input)).toBe(input.trim());
    } else {
      expect(() => validateTitle(input)).toThrow(TypeError);
    }
  });

  test.each([[42], [null], [undefined], [true], [['Plan']], [{ title: 'x' }]])(
    'rejects the wrong type safely: %p',
    (input) => {
      expect(() => validateTitle(input)).toThrow('Ingresa un título válido.');
    },
  );

  // Regresión de BUG-002: los emoji cuentan como 1 carácter, igual que en PostgreSQL.
  test('accepts 120 emoji (counts code points, not UTF-16 units)', () => {
    const title = '🚀'.repeat(120);
    expect(title.length).toBe(240); // así los contaba la versión con el bug
    expect(validateTitle(title)).toBe(title);
  });

  test('rejects 121 emoji', () => {
    expect(() => validateTitle('🚀'.repeat(121))).toThrow(TypeError);
  });

  test('keeps injection-looking text as plain data', () => {
    expect(validateTitle("' OR '1'='1")).toBe("' OR '1'='1");
  });
});

describe('validateCompleted', () => {
  test.each([[true], [false]])('accepts %p', (value) => {
    expect(validateCompleted(value)).toBe(value);
  });

  test.each([['true'], [1], [null]])('rejects %p', (value) => {
    expect(() => validateCompleted(value)).toThrow(TypeError);
  });
});

describe('validatePagination', () => {
  test('uses defaults', () => {
    expect(validatePagination({})).toEqual({ limit: 20, offset: 0 });
  });

  test.each([
    [{ limit: '1' }, true],
    [{ limit: '100' }, true],
    [{ limit: '0' }, false],
    [{ limit: '101' }, false],
    [{ limit: 'abc' }, false],
    [{ limit: '2.5' }, false],
    [{ offset: '-1' }, false],
    [{ offset: '0' }, true],
  ])('%p -> accepted: %p', (query, accepted) => {
    if (accepted) {
      expect(() => validatePagination(query)).not.toThrow();
    } else {
      expect(() => validatePagination(query)).toThrow(TypeError);
    }
  });
});

describe('isUuid', () => {
  test('recognizes a UUID', () => {
    expect(isUuid('7d444840-9dc0-11d1-b245-5ffdce74fad2')).toBe(true);
  });

  test.each([['123'], ['not-a-uuid'], [''], [42], ["1' OR '1'='1"]])('rejects %p', (value) => {
    expect(isUuid(value)).toBe(false);
  });
});

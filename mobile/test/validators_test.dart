import 'package:flutter_test/flutter_test.dart';
import 'package:task_manager/src/validators.dart';

// Sección 8: particiones de equivalencia y valores límite (mismas reglas que la API).
void main() {
  group('validateTitle', () {
    final cases = <String, (String?, bool)>{
      'null': (null, false),
      'vacío': ('', false),
      'solo espacios': ('   ', false),
      'mínimo válido (1)': ('a', true),
      'típico': ('Plan tests', true),
      'máximo válido (120)': ('a' * 120, true),
      'justo arriba del máximo (121)': ('a' * 121, false),
      '120 emoji (cuenta caracteres, no UTF-16)': ('🚀' * 120, true),
      '121 emoji': ('🚀' * 121, false),
    };
    cases.forEach((name, data) {
      final (input, valid) = data;
      test(name, () {
        expect(validateTitle(input) == null, valid);
      });
    });
  });

  group('validatePassword', () {
    final cases = <String, (String, bool)>{
      'vacía': ('', false),
      '7 caracteres': ('a' * 7, false),
      '8 caracteres (mínimo)': ('a' * 8, true),
      'típica': ('local-test-password', true),
      '128 caracteres (máximo)': ('a' * 128, true),
      '129 caracteres': ('a' * 129, false),
    };
    cases.forEach((name, data) {
      final (input, valid) = data;
      test(name, () => expect(validatePassword(input) == null, valid));
    });
  });

  group('validateEmail', () {
    test('accepts a synthetic address', () {
      expect(validateEmail('tester@example.test'), isNull);
    });

    for (final input in ['', 'tester', 'tester@', 'tes ter@example.test']) {
      test('rejects "$input"', () {
        expect(validateEmail(input), 'Ingresa un correo válido.');
      });
    }
  });
}

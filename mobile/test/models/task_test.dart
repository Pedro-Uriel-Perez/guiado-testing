import 'package:flutter_test/flutter_test.dart';
import 'package:task_manager/src/models/task.dart';

// Sección 4 del tutorial: prueba unitaria del modelo en Dart.
void main() {
  test('parses a valid task', () {
    final task = Task.fromJson({'id': 'task-1', 'title': 'Plan tests'});

    expect(task.id, 'task-1');
    expect(task.title, 'Plan tests');
    expect(task.completed, isFalse);
  });

  test('rejects an empty title', () {
    expect(
      () => Task.fromJson({'id': 'task-1', 'title': '   '}),
      throwsFormatException,
    );
  });

  // Ejercicio: ID faltante.
  test('rejects a missing id', () {
    expect(() => Task.fromJson({'title': 'Plan tests'}), throwsFormatException);
  });

  test('rejects an id of the wrong type', () {
    expect(
      () => Task.fromJson({'id': 42, 'title': 'Plan tests'}),
      throwsFormatException,
    );
  });

  // Ejercicio: título válido en la longitud máxima permitida.
  test('accepts a title at the maximum allowed length (120)', () {
    final title = 'a' * 120;
    expect(Task.fromJson({'id': 'task-1', 'title': title}).title, title);
  });

  test('parses completed and rejects a non-boolean value', () {
    expect(
      Task.fromJson({'id': 't', 'title': 'x', 'completed': true}).completed,
      isTrue,
    );
    expect(
      () => Task.fromJson({'id': 't', 'title': 'x', 'completed': 'yes'}),
      throwsFormatException,
    );
  });

  test('copyWith changes only the given fields', () {
    const task = Task(id: 't', title: 'Original');
    expect(task.copyWith(completed: true), const Task(id: 't', title: 'Original', completed: true));
  });
}

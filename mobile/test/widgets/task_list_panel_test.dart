import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:task_manager/src/models/task.dart';
import 'package:task_manager/src/widgets/task_list_panel.dart';

// Sección 5 del tutorial: un estado por prueba, sin API real.
Widget _host(TaskListPanel panel) => MaterialApp(home: Scaffold(body: panel));

void main() {
  testWidgets('shows loading state', (tester) async {
    await tester.pumpWidget(_host(const TaskListPanel(loading: true, tasks: [])));

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('shows empty state', (tester) async {
    await tester.pumpWidget(_host(const TaskListPanel(loading: false, tasks: [])));

    expect(find.text('Aún no hay tareas.'), findsOneWidget);
  });

  testWidgets('shows error state', (tester) async {
    await tester.pumpWidget(_host(const TaskListPanel(
      loading: false,
      tasks: [],
      errorMessage: 'No se pudieron cargar las tareas.',
    )));

    expect(find.text('No se pudieron cargar las tareas.'), findsOneWidget);
  });

  testWidgets('shows task data', (tester) async {
    await tester.pumpWidget(_host(const TaskListPanel(
      loading: false,
      tasks: [Task(id: 't1', title: 'Plan tests')],
    )));

    expect(find.text('Plan tests'), findsOneWidget);
    expect(find.text('Pendiente'), findsOneWidget);
  });

  // Ejercicio de la sección 5: botón de reintento que invoca el callback UNA vez.
  testWidgets('tapping retry invokes the callback exactly once', (tester) async {
    var retries = 0;
    await tester.pumpWidget(_host(TaskListPanel(
      loading: false,
      tasks: const [],
      errorMessage: 'No se pudieron cargar las tareas.',
      onRetry: () => retries++,
    )));

    await tester.tap(find.byKey(const Key('retry-button')));
    await tester.pump();

    expect(retries, 1);
  });

  testWidgets('error state has no retry button when no callback is given', (tester) async {
    await tester.pumpWidget(_host(const TaskListPanel(
      loading: false,
      tasks: [],
      errorMessage: 'Error',
    )));

    expect(find.byKey(const Key('retry-button')), findsNothing);
  });

  testWidgets('loading wins over error and data', (tester) async {
    await tester.pumpWidget(_host(const TaskListPanel(
      loading: true,
      tasks: [Task(id: 't1', title: 'Plan tests')],
      errorMessage: 'Error',
    )));

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.text('Plan tests'), findsNothing);
  });

  testWidgets('completed tasks show status as text, not only style', (tester) async {
    await tester.pumpWidget(_host(const TaskListPanel(
      loading: false,
      tasks: [Task(id: 't1', title: 'Hecha', completed: true)],
    )));

    expect(find.text('Completada'), findsOneWidget);
    final checkbox = tester.widget<Checkbox>(find.byKey(const Key('task-checkbox-t1')));
    expect(checkbox.value, isTrue);
  });

  testWidgets('toggle and delete callbacks receive the right task', (tester) async {
    Task? toggled;
    bool? toggledTo;
    Task? deleted;
    await tester.pumpWidget(_host(TaskListPanel(
      loading: false,
      tasks: const [Task(id: 't1', title: 'Uno'), Task(id: 't2', title: 'Dos')],
      onToggle: (task, value) {
        toggled = task;
        toggledTo = value;
      },
      onDelete: (task) => deleted = task,
    )));

    await tester.tap(find.byKey(const Key('task-checkbox-t2')));
    await tester.tap(find.byKey(const Key('delete-task-t1')));

    expect(toggled?.id, 't2');
    expect(toggledTo, isTrue);
    expect(deleted?.id, 't1');
  });

  testWidgets('markup-like titles are shown as plain text', (tester) async {
    const markup = '<script>alert(1)</script>';
    await tester.pumpWidget(_host(const TaskListPanel(
      loading: false,
      tasks: [Task(id: 't1', title: markup)],
    )));

    expect(find.text(markup), findsOneWidget);
  });
}

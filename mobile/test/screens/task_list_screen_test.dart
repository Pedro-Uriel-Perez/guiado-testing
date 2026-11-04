import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:task_manager/src/models/task.dart';
import 'package:task_manager/src/screens/task_list_screen.dart';
import 'package:task_manager/src/services/api_client.dart';

import '../fakes.dart';

void main() {
  Future<FakeTaskManagerApi> pumpScreen(
    WidgetTester tester, {
    List<Task> tasks = const [],
    VoidCallback? onSignedOut,
    FakeTaskManagerApi? api,
  }) async {
    final fake = api ?? FakeTaskManagerApi(tasks: tasks, signedIn: true);
    await tester.pumpWidget(MaterialApp(
      home: TaskListScreen(api: fake, onSignedOut: onSignedOut ?? () {}),
    ));
    await tester.pumpAndSettle();
    return fake;
  }

  testWidgets('creates a task from the dialog', (tester) async {
    final api = await pumpScreen(tester);

    await tester.tap(find.byKey(const Key('add-task-button')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('task-title-field')), '  Check release flow ');
    await tester.tap(find.byKey(const Key('save-task-button')));
    await tester.pumpAndSettle();

    expect(find.text('Check release flow'), findsOneWidget);
    expect(api.tasks.single.title, 'Check release flow');
  });

  testWidgets('a blank title shows a clear message and is not sent', (tester) async {
    final api = await pumpScreen(tester);

    await tester.tap(find.byKey(const Key('add-task-button')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('task-title-field')), '    ');
    await tester.tap(find.byKey(const Key('save-task-button')));
    await tester.pump();

    expect(find.text('Escribe un título.'), findsOneWidget);
    expect(api.createCalls, 0);
  });

  testWidgets('rapid repeated taps on save create only one task', (tester) async {
    final api = FakeTaskManagerApi(signedIn: true)..createGate = Completer<void>();
    await pumpScreen(tester, api: api);

    await tester.tap(find.byKey(const Key('add-task-button')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('task-title-field')), 'Una sola vez');
    for (var i = 0; i < 5; i++) {
      await tester.tap(find.byKey(const Key('save-task-button')), warnIfMissed: false);
    }
    api.createGate!.complete();
    await tester.pumpAndSettle();

    expect(api.createCalls, 1);
    expect(find.text('Una sola vez'), findsOneWidget);
  });

  testWidgets('a failed save keeps the typed title (no data loss)', (tester) async {
    final api = await pumpScreen(tester);
    api.mutationError = const ApiException('No se pudo conectar con el servidor.');

    await tester.tap(find.byKey(const Key('add-task-button')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('task-title-field')), 'No me pierdas');
    await tester.tap(find.byKey(const Key('save-task-button')));
    await tester.pumpAndSettle();

    expect(find.text('No se pudo conectar con el servidor.'), findsOneWidget);
    final field = tester.widget<TextField>(find.byKey(const Key('task-title-field')));
    expect(field.controller!.text, 'No me pierdas');
  });

  // Regresión del ejercicio de reporte de bug: "la tarea desaparece al completarla".
  testWidgets('a completed task stays visible in the list', (tester) async {
    await pumpScreen(tester, tasks: const [Task(id: 't1', title: 'Terminar reporte')]);

    await tester.tap(find.byKey(const Key('task-checkbox-t1')));
    await tester.pumpAndSettle();

    expect(find.text('Terminar reporte'), findsOneWidget);
    expect(find.text('Completada'), findsOneWidget);
  });

  testWidgets('a failed toggle keeps the previous state and explains why', (tester) async {
    final api = await pumpScreen(tester, tasks: const [Task(id: 't1', title: 'Offline')]);
    api.mutationError = const ApiException('No se pudo conectar con el servidor.');

    await tester.tap(find.byKey(const Key('task-checkbox-t1')));
    await tester.pumpAndSettle();

    expect(find.text('Pendiente'), findsOneWidget);
    expect(find.text('No se pudo conectar con el servidor.'), findsOneWidget);
  });

  testWidgets('edits a task title', (tester) async {
    await pumpScreen(tester, tasks: const [Task(id: 't1', title: 'Viejo')]);

    await tester.tap(find.text('Viejo'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('task-title-field')), 'Nuevo');
    await tester.tap(find.byKey(const Key('save-task-button')));
    await tester.pumpAndSettle();

    expect(find.text('Nuevo'), findsOneWidget);
    expect(find.text('Viejo'), findsNothing);
  });

  testWidgets('deletes a task after confirmation', (tester) async {
    final api = await pumpScreen(tester, tasks: const [Task(id: 't1', title: 'Borrar')]);

    await tester.tap(find.byKey(const Key('delete-task-t1')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('confirm-delete-button')));
    await tester.pumpAndSettle();

    expect(api.deleteCalls, 1);
    expect(find.text('Aún no hay tareas.'), findsOneWidget);
  });

  testWidgets('load error shows retry, and retry reloads', (tester) async {
    final api = FakeTaskManagerApi(
      tasks: const [Task(id: 't1', title: 'Volvió')],
      signedIn: true,
    )..fetchError = const ApiException('No se pudo conectar con el servidor.');
    await pumpScreen(tester, api: api);

    expect(find.byKey(const Key('retry-button')), findsOneWidget);
    await tester.tap(find.byKey(const Key('retry-button')));
    await tester.pumpAndSettle();

    expect(api.fetchCalls, 2);
    expect(find.text('Volvió'), findsOneWidget);
  });

  testWidgets('an expired session sends the user back to login', (tester) async {
    var signedOut = false;
    final api = FakeTaskManagerApi(signedIn: true)
      ..fetchError = const SessionExpiredException();
    await pumpScreen(tester, api: api, onSignedOut: () => signedOut = true);

    expect(signedOut, isTrue);
  });

  testWidgets('logout calls the API and notifies the parent', (tester) async {
    var signedOut = false;
    final api = await pumpScreen(tester, onSignedOut: () => signedOut = true);

    await tester.tap(find.byKey(const Key('logout-button')));
    await tester.pumpAndSettle();

    expect(api.logoutCalls, 1);
    expect(signedOut, isTrue);
  });
}

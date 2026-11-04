import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:task_manager/src/models/task.dart';
import 'package:task_manager/src/screens/login_screen.dart';
import 'package:task_manager/src/screens/task_list_screen.dart';

import 'fakes.dart';

// Sección 11: verificaciones automáticas de accesibilidad con las guías de Flutter.
// No sustituyen la prueba manual con lector de pantalla (ver docs/11-usabilidad-accesibilidad.md).

const _tasks = [
  Task(id: 't1', title: 'Plan tests'),
  Task(id: 't2', title: 'Revisar contraste', completed: true),
];

Widget _taskList({double textScale = 1.0}) => MediaQuery(
      data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
      child: MaterialApp(
        home: TaskListScreen(
          api: FakeTaskManagerApi(tasks: _tasks, signedIn: true),
          onSignedOut: () {},
        ),
      ),
    );

void main() {
  testWidgets('task list meets tap target, label and contrast guidelines', (tester) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(_taskList());
    await tester.pumpAndSettle();

    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
    await expectLater(tester, meetsGuideline(textContrastGuideline));
    handle.dispose();
  });

  testWidgets('login screen meets the same guidelines', (tester) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(MaterialApp(
      home: LoginScreen(api: FakeTaskManagerApi(), onSignedIn: () {}),
    ));

    await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
    await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
    await expectLater(tester, meetsGuideline(textContrastGuideline));
    handle.dispose();
  });

  testWidgets('icon-only buttons have accessible names', (tester) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(_taskList());
    await tester.pumpAndSettle();

    // Los botones de solo ícono exponen su nombre accesible como "tooltip" semántico,
    // que es lo que anuncian TalkBack y VoiceOver.
    expect(
      tester.getSemantics(find.byKey(const Key('add-task-button'))),
      isSemantics(tooltip: 'Agregar tarea', isButton: true),
    );
    expect(
      tester.getSemantics(find.byKey(const Key('logout-button'))),
      isSemantics(tooltip: 'Cerrar sesión', isButton: true),
    );
    expect(
      tester.getSemantics(find.byKey(const Key('delete-task-t1'))),
      isSemantics(tooltip: 'Eliminar "Plan tests"', isButton: true),
    );
    expect(find.bySemanticsLabel(RegExp('Marcar "Plan tests" como completada')), findsOneWidget);
    handle.dispose();
  });

  testWidgets('validation errors are visible as text', (tester) async {
    await tester.pumpWidget(_taskList());
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('add-task-button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('save-task-button')));
    await tester.pump();

    expect(find.text('Escribe un título.'), findsOneWidget);
  });

  for (final scale in [1.5, 2.0]) {
    testWidgets('usable at text scale $scale without overflow', (tester) async {
      await tester.pumpWidget(_taskList(textScale: scale));
      await tester.pumpAndSettle();

      // Un overflow de layout se reporta como excepción y haría fallar la prueba.
      expect(tester.takeException(), isNull);
      expect(find.text('Plan tests'), findsOneWidget);
    });
  }
}

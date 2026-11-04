import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:task_manager/src/models/task.dart';
import 'package:task_manager/src/screens/login_screen.dart';
import 'package:task_manager/src/screens/task_list_screen.dart';

import 'fakes.dart';

// Sección 12: revisión rápida de layout en distintos tamaños de pantalla.
// Complementa (no reemplaza) la prueba en dispositivos reales de la matriz.

const _sizes = <String, Size>{
  'teléfono pequeño 320x568': Size(320, 568),
  'teléfono típico 393x852': Size(393, 852),
  'tablet 1024x768': Size(1024, 768),
  'escritorio 1440x900': Size(1440, 900),
};

final _longTitle = 'Título muy largo para revisar que no se corte ni desborde ' * 2;

void main() {
  _sizes.forEach((name, size) {
    testWidgets('task list renders without overflow on $name', (tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(MaterialApp(
        home: TaskListScreen(
          api: FakeTaskManagerApi(
            signedIn: true,
            tasks: [
              Task(id: 't1', title: _longTitle.trim()),
              const Task(id: 't2', title: 'Corta', completed: true),
            ],
          ),
          onSignedOut: () {},
        ),
      ));
      await tester.pumpAndSettle();

      expect(tester.takeException(), isNull);
      final fab = tester.getSize(find.byKey(const Key('add-task-button')));
      expect(fab.width, greaterThanOrEqualTo(48));
    });

    testWidgets('login renders without overflow on $name', (tester) async {
      tester.view.physicalSize = size;
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(MaterialApp(
        home: LoginScreen(api: FakeTaskManagerApi(), onSignedIn: () {}),
      ));

      expect(tester.takeException(), isNull);
      expect(find.byKey(const Key('login-button')), findsOneWidget);
    });
  });
}

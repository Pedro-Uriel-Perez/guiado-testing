import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:integration_test/integration_test.dart';
import 'package:task_manager/main.dart' as app;
import 'package:task_manager/src/config.dart';
import 'package:task_manager/src/services/token_storage.dart';

// Sección 7: recorrido completo UI -> API -> PostgreSQL -> UI.
// Requiere la API LOCAL corriendo (nunca producción). Ver docs/07-pruebas-end-to-end.md.

/// Espera a que aparezca [finder]; las peticiones reales no siempre programan frames,
/// así que pumpAndSettle solo no basta.
Future<void> pumpUntilFound(
  WidgetTester tester,
  Finder finder, {
  Duration timeout = const Duration(seconds: 15),
}) async {
  final end = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(end)) {
    await tester.pump(const Duration(milliseconds: 100));
    if (finder.evaluate().isNotEmpty) return;
  }
  throw TestFailure('No apareció: $finder');
}

/// Espera a que [finder] desaparezca (por ejemplo, que se cierre un diálogo).
Future<void> pumpUntilGone(
  WidgetTester tester,
  Finder finder, {
  Duration timeout = const Duration(seconds: 15),
}) async {
  final end = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(end)) {
    await tester.pump(const Duration(milliseconds: 100));
    if (finder.evaluate().isEmpty) return;
  }
  throw TestFailure('No desapareció: $finder');
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('user can sign in, create a task, complete it and log out', (tester) async {
    // Preparación: cuenta sintética NUEVA en cada corrida = datos aislados y reproducibles.
    final email = 'e2e-${DateTime.now().millisecondsSinceEpoch}@example.test';
    const password = 'local-test-password';
    final register = await http.post(
      Uri.parse('$apiBaseUrl/api/v1/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    expect(register.statusCode, 201, reason: '¿Está corriendo la API local en $apiBaseUrl?');
    // Arranque real de la app (mismo código que main) con sesión vacía en memoria.
    app.runTaskManager(storage: InMemoryTokenStorage());
    await pumpUntilFound(tester, find.byKey(const Key('email-field')));

    // 1. Iniciar sesión
    await tester.enterText(find.byKey(const Key('email-field')), email);
    await tester.enterText(find.byKey(const Key('password-field')), password);
    await tester.tap(find.byKey(const Key('login-button')));
    await pumpUntilFound(tester, find.text('Aún no hay tareas.'));

    // 2. Crear una tarea
    await tester.tap(find.byKey(const Key('add-task-button')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('task-title-field')), 'Check release flow');
    await tester.tap(find.byKey(const Key('save-task-button')));
    // OJO: mientras el diálogo sigue abierto, el texto también está en el campo.
    // Primera corrida en CI: esperar solo el texto daba 2 coincidencias. Hay que esperar
    // a que el diálogo se cierre (= el servidor respondió 201).
    await pumpUntilGone(tester, find.byKey(const Key('task-title-field')));
    await tester.pumpAndSettle();
    expect(find.text('Check release flow'), findsOneWidget);

    // 3. Marcarla como completada (ejercicio de la sección 7)
    final checkbox = find.descendant(
      of: find.ancestor(of: find.text('Check release flow'), matching: find.byType(ListTile)),
      matching: find.byType(Checkbox),
    );
    await tester.tap(checkbox);
    await pumpUntilFound(tester, find.text('Completada'));
    expect(find.text('Check release flow'), findsOneWidget); // no desaparece

    // 4. Cerrar sesión y comprobar que aparece la pantalla de login
    await tester.tap(find.byKey(const Key('logout-button')));
    await pumpUntilFound(tester, find.byKey(const Key('login-button')));
    expect(find.text('Iniciar sesión'), findsWidgets);

    // 5. El servidor revocó la sesión: un nuevo login ve la tarea persistida en PostgreSQL.
    await tester.enterText(find.byKey(const Key('email-field')), email);
    await tester.enterText(find.byKey(const Key('password-field')), password);
    await tester.tap(find.byKey(const Key('login-button')));
    await pumpUntilFound(tester, find.text('Check release flow'));
    expect(find.text('Completada'), findsOneWidget);
  });
}

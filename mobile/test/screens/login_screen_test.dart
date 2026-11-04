import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:task_manager/src/screens/login_screen.dart';
import 'package:task_manager/src/services/api_client.dart';

import '../fakes.dart';

void main() {
  Future<FakeTaskManagerApi> pumpLogin(WidgetTester tester, {VoidCallback? onSignedIn}) async {
    final api = FakeTaskManagerApi();
    await tester.pumpWidget(MaterialApp(
      home: LoginScreen(api: api, onSignedIn: onSignedIn ?? () {}),
    ));
    return api;
  }

  testWidgets('validates fields before calling the API', (tester) async {
    final api = await pumpLogin(tester);

    await tester.tap(find.byKey(const Key('login-button')));
    await tester.pump();

    expect(find.text('Ingresa un correo válido.'), findsOneWidget);
    expect(find.text('Escribe tu contraseña.'), findsOneWidget);
    expect(api.loginAttempts, isEmpty);
  });

  testWidgets('successful login notifies the parent', (tester) async {
    var signedIn = false;
    final api = await pumpLogin(tester, onSignedIn: () => signedIn = true);

    await tester.enterText(find.byKey(const Key('email-field')), 'tester@example.test');
    await tester.enterText(find.byKey(const Key('password-field')), 'local-test-password');
    await tester.tap(find.byKey(const Key('login-button')));
    await tester.pumpAndSettle();

    expect(api.loginAttempts, ['tester@example.test']);
    expect(signedIn, isTrue);
  });

  testWidgets('shows the server error and stays on the screen', (tester) async {
    var signedIn = false;
    final api = await pumpLogin(tester, onSignedIn: () => signedIn = true);
    api.loginError = const ApiException('Correo o contraseña incorrectos.', statusCode: 401);

    await tester.enterText(find.byKey(const Key('email-field')), 'tester@example.test');
    await tester.enterText(find.byKey(const Key('password-field')), 'otra-password');
    await tester.tap(find.byKey(const Key('login-button')));
    await tester.pumpAndSettle();

    expect(find.text('Correo o contraseña incorrectos.'), findsOneWidget);
    expect(signedIn, isFalse);
  });

  testWidgets('register mode enforces the password length rule', (tester) async {
    await pumpLogin(tester);

    await tester.tap(find.byKey(const Key('toggle-mode-button')));
    await tester.pump();
    await tester.enterText(find.byKey(const Key('email-field')), 'tester@example.test');
    await tester.enterText(find.byKey(const Key('password-field')), 'corta');
    await tester.tap(find.byKey(const Key('login-button')));
    await tester.pump();

    expect(
      find.text('La contraseña debe tener entre 8 y 128 caracteres.'),
      findsOneWidget,
    );
  });

  testWidgets('password field is obscured', (tester) async {
    await pumpLogin(tester);
    final field = tester.widget<EditableText>(
      find.descendant(
        of: find.byKey(const Key('password-field')),
        matching: find.byType(EditableText),
      ),
    );
    expect(field.obscureText, isTrue);
  });
}

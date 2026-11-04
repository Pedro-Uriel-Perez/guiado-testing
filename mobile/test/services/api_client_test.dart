import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:task_manager/src/services/api_client.dart';
import 'package:task_manager/src/services/token_storage.dart';

// Sección 15: prueba del cliente con HTTP SIMULADO (MockClient).
// Rápida y determinista, pero NO prueba el servidor real: eso lo cubren
// las pruebas de API del backend (ver docs/15-mocks-y-pruebas-inestables.md).

const _base = 'http://api.test';

http.Response _json(Object body, int status) => http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json; charset=utf-8'},
    );

Map<String, dynamic> _task(String id, String title, {bool completed = false}) =>
    {'id': id, 'title': title, 'completed': completed};

void main() {
  test('login stores the token pair', () async {
    final storage = InMemoryTokenStorage();
    final client = ApiClient(
      baseUrl: _base,
      storage: storage,
      httpClient: MockClient((request) async {
        expect(request.url.path, '/api/v1/auth/login');
        expect(jsonDecode(request.body), {
          'email': 'tester@example.test',
          'password': 'local-test-password',
        });
        return _json({'accessToken': 'A1', 'refreshToken': 'R1'}, 200);
      }),
    );

    await client.login('  tester@example.test ', 'local-test-password');

    final tokens = await storage.read();
    expect(tokens?.accessToken, 'A1');
    expect(tokens?.refreshToken, 'R1');
  });

  test('login failure exposes the safe server message', () async {
    final client = ApiClient(
      baseUrl: _base,
      storage: InMemoryTokenStorage(),
      httpClient: MockClient((_) async => _json(
            {'error': {'code': 'unauthorized', 'message': 'Correo o contraseña incorrectos.'}},
            401,
          )),
    );

    expect(
      () => client.login('tester@example.test', 'mala-password'),
      throwsA(isA<ApiException>()
          .having((e) => e.message, 'message', 'Correo o contraseña incorrectos.')
          .having((e) => e.statusCode, 'statusCode', 401)),
    );
  });

  test('sends the bearer token and parses tasks', () async {
    final client = ApiClient(
      baseUrl: _base,
      storage: InMemoryTokenStorage(const AuthTokens(accessToken: 'A1', refreshToken: 'R1')),
      httpClient: MockClient((request) async {
        expect(request.headers['Authorization'], 'Bearer A1');
        return _json({
          'items': [_task('t1', 'Plan tests'), _task('t2', 'Hecha', completed: true)],
        }, 200);
      }),
    );

    final tasks = await client.fetchTasks();

    expect(tasks.map((t) => t.title), ['Plan tests', 'Hecha']);
    expect(tasks.last.completed, isTrue);
  });

  test('on 401 it refreshes once, stores the rotated pair and retries', () async {
    final storage =
        InMemoryTokenStorage(const AuthTokens(accessToken: 'viejo', refreshToken: 'R1'));
    final calls = <String>[];
    final client = ApiClient(
      baseUrl: _base,
      storage: storage,
      httpClient: MockClient((request) async {
        calls.add('${request.method} ${request.url.path} ${request.headers['Authorization'] ?? ''}');
        if (request.url.path == '/api/v1/auth/refresh') {
          expect(jsonDecode(request.body), {'refreshToken': 'R1'});
          return _json({'accessToken': 'nuevo', 'refreshToken': 'R2'}, 200);
        }
        if (request.headers['Authorization'] == 'Bearer viejo') {
          return _json({'error': {'message': 'Token inválido o expirado.'}}, 401);
        }
        return _json({'items': <Object>[]}, 200);
      }),
    );

    await client.fetchTasks();

    expect(calls, [
      'GET /api/v1/tasks Bearer viejo',
      'POST /api/v1/auth/refresh ',
      'GET /api/v1/tasks Bearer nuevo',
    ]);
    expect((await storage.read())?.refreshToken, 'R2');
  });

  test('concurrent 401s share a single refresh (avoids reuse detection)', () async {
    var refreshCalls = 0;
    final client = ApiClient(
      baseUrl: _base,
      storage: InMemoryTokenStorage(const AuthTokens(accessToken: 'viejo', refreshToken: 'R1')),
      httpClient: MockClient((request) async {
        if (request.url.path == '/api/v1/auth/refresh') {
          refreshCalls++;
          await Future<void>.delayed(const Duration(milliseconds: 10));
          return _json({'accessToken': 'nuevo', 'refreshToken': 'R2'}, 200);
        }
        if (request.headers['Authorization'] == 'Bearer viejo') {
          return _json({}, 401);
        }
        return _json({'items': <Object>[]}, 200);
      }),
    );

    await Future.wait([client.fetchTasks(), client.fetchTasks(), client.fetchTasks()]);

    expect(refreshCalls, 1);
  });

  test('a failed refresh clears the session and throws SessionExpiredException', () async {
    final storage =
        InMemoryTokenStorage(const AuthTokens(accessToken: 'viejo', refreshToken: 'revocado'));
    final client = ApiClient(
      baseUrl: _base,
      storage: storage,
      httpClient: MockClient((_) async => _json({}, 401)),
    );

    await expectLater(client.fetchTasks(), throwsA(isA<SessionExpiredException>()));
    expect(await storage.read(), isNull);
  });

  test('without a stored session it does not call the network', () async {
    var called = false;
    final client = ApiClient(
      baseUrl: _base,
      storage: InMemoryTokenStorage(),
      httpClient: MockClient((_) async {
        called = true;
        return _json({}, 200);
      }),
    );

    await expectLater(client.fetchTasks(), throwsA(isA<SessionExpiredException>()));
    expect(called, isFalse);
  });

  test('network failure becomes a friendly ApiException', () async {
    final client = ApiClient(
      baseUrl: _base,
      storage: InMemoryTokenStorage(const AuthTokens(accessToken: 'A', refreshToken: 'R')),
      httpClient: MockClient((_) async => throw http.ClientException('connection refused')),
    );

    expect(
      () => client.fetchTasks(),
      throwsA(isA<ApiException>()
          .having((e) => e.message, 'message', 'No se pudo conectar con el servidor.')),
    );
  });

  test('invalid task data from the server is handled safely', () async {
    final client = ApiClient(
      baseUrl: _base,
      storage: InMemoryTokenStorage(const AuthTokens(accessToken: 'A', refreshToken: 'R')),
      httpClient: MockClient((_) async => _json({
            'items': [
              {'id': 't1'},
            ],
          }, 200)),
    );

    expect(() => client.fetchTasks(), throwsA(isA<ApiException>()));
  });

  test('logout clears local tokens even if the server is unreachable', () async {
    final storage = InMemoryTokenStorage(const AuthTokens(accessToken: 'A', refreshToken: 'R'));
    final client = ApiClient(
      baseUrl: _base,
      storage: storage,
      httpClient: MockClient((_) async => throw http.ClientException('offline')),
    );

    await client.logout();

    expect(await storage.read(), isNull);
  });

  test('logout sends the refresh token so the server can revoke it', () async {
    Map<String, dynamic>? sent;
    final client = ApiClient(
      baseUrl: _base,
      storage: InMemoryTokenStorage(const AuthTokens(accessToken: 'A', refreshToken: 'R')),
      httpClient: MockClient((request) async {
        sent = jsonDecode(request.body) as Map<String, dynamic>;
        return http.Response('', 204);
      }),
    );

    await client.logout();

    expect(sent, {'refreshToken': 'R'});
  });

  test('task ids are URL-encoded', () async {
    late Uri url;
    final client = ApiClient(
      baseUrl: _base,
      storage: InMemoryTokenStorage(const AuthTokens(accessToken: 'A', refreshToken: 'R')),
      httpClient: MockClient((request) async {
        url = request.url;
        return http.Response('', 204);
      }),
    );

    await client.deleteTask('../auth/me');

    expect(url.path, '/api/v1/tasks/..%2Fauth%2Fme');
  });

  test('tokens are never printed', () {
    const tokens = AuthTokens(accessToken: 'secreto-A', refreshToken: 'secreto-R');
    expect(tokens.toString(), isNot(contains('secreto')));
  });
}

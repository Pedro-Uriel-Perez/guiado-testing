import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/task.dart';
import 'token_storage.dart';

/// Error de la API con un mensaje seguro para mostrar al usuario.
class ApiException implements Exception {
  /// Crea el error.
  const ApiException(this.message, {this.statusCode});

  /// Mensaje apto para la interfaz (nunca contiene tokens).
  final String message;

  /// Código HTTP, o `null` si no hubo respuesta (sin conexión, timeout).
  final int? statusCode;

  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// La sesión ya no es válida y hay que volver a iniciar sesión.
class SessionExpiredException extends ApiException {
  /// Crea el error.
  const SessionExpiredException()
      : super('Tu sesión expiró. Inicia sesión de nuevo.', statusCode: 401);
}

/// Operaciones que la interfaz necesita. Las pantallas dependen de esta
/// interfaz, no del cliente HTTP, así se prueban con un doble.
abstract class TaskManagerApi {
  /// `true` si hay una sesión guardada.
  Future<bool> restoreSession();

  /// Inicia sesión y guarda los tokens.
  Future<void> login(String email, String password);

  /// Crea una cuenta y guarda los tokens.
  Future<void> register(String email, String password);

  /// Revoca el refresh token en el servidor y borra la sesión local.
  Future<void> logout();

  /// Lista las tareas del usuario.
  Future<List<Task>> fetchTasks();

  /// Crea una tarea.
  Future<Task> createTask(String title);

  /// Cambia el título y/o el estado de una tarea.
  Future<Task> updateTask(String id, {String? title, bool? completed});

  /// Borra una tarea.
  Future<void> deleteTask(String id);
}

/// Cliente HTTP real de la API de Task Manager.
///
/// Si una petición responde 401, rota el refresh token una sola vez y reintenta.
/// Las rotaciones concurrentes se agrupan en una sola llamada para no disparar
/// la detección de reutilización del servidor.
class ApiClient implements TaskManagerApi {
  /// Crea el cliente.
  ApiClient({
    required String baseUrl,
    http.Client? httpClient,
    TokenStorage? storage,
    this.timeout = const Duration(seconds: 15),
  })  : _baseUrl = baseUrl.endsWith('/')
            ? baseUrl.substring(0, baseUrl.length - 1)
            : baseUrl,
        _http = httpClient ?? http.Client(),
        _storage = storage ?? SecureTokenStorage();

  final String _baseUrl;
  final http.Client _http;
  final TokenStorage _storage;

  /// Tiempo máximo por petición.
  final Duration timeout;

  Future<AuthTokens>? _refreshing;

  static const _jsonHeaders = {'Content-Type': 'application/json'};

  Uri _uri(String path) => Uri.parse('$_baseUrl$path');

  @override
  Future<bool> restoreSession() async => await _storage.read() != null;

  @override
  Future<void> login(String email, String password) =>
      _authenticate('/api/v1/auth/login', email, password);

  @override
  Future<void> register(String email, String password) =>
      _authenticate('/api/v1/auth/register', email, password);

  Future<void> _authenticate(String path, String email, String password) async {
    final response = await _send(() => _http.post(
          _uri(path),
          headers: _jsonHeaders,
          body: jsonEncode({'email': email.trim(), 'password': password}),
        ));
    _ensureSuccess(response);
    await _storage.save(_parseTokens(response));
  }

  @override
  Future<void> logout() async {
    final tokens = await _storage.read();
    await _storage.clear();
    if (tokens == null) return;
    try {
      await _send(() => _http.post(
            _uri('/api/v1/auth/logout'),
            headers: {
              ..._jsonHeaders,
              'Authorization': 'Bearer ${tokens.accessToken}',
            },
            body: jsonEncode({'refreshToken': tokens.refreshToken}),
          ));
    } on ApiException {
      // La sesión local ya se borró; si el servidor no responde, el refresh token
      // expira solo. No bloqueamos el cierre de sesión por un error de red.
    }
  }

  @override
  Future<List<Task>> fetchTasks() async {
    final response = await _authorized(
      (headers) => _http.get(_uri('/api/v1/tasks?limit=100'), headers: headers),
    );
    final body = _decode(response);
    final items = body['items'];
    if (items is! List) {
      throw const ApiException('Respuesta inesperada del servidor.');
    }
    try {
      return [for (final item in items) Task.fromJson(item as Map<String, dynamic>)];
    } on Object {
      throw const ApiException('Respuesta inesperada del servidor.');
    }
  }

  @override
  Future<Task> createTask(String title) async {
    final response = await _authorized((headers) => _http.post(
          _uri('/api/v1/tasks'),
          headers: headers,
          body: jsonEncode({'title': title}),
        ));
    return _parseTask(response);
  }

  @override
  Future<Task> updateTask(String id, {String? title, bool? completed}) async {
    final response = await _authorized((headers) => _http.patch(
          _uri('/api/v1/tasks/${Uri.encodeComponent(id)}'),
          headers: headers,
          body: jsonEncode({
            'title': ?title,
            'completed': ?completed,
          }),
        ));
    return _parseTask(response);
  }

  @override
  Future<void> deleteTask(String id) async {
    final response = await _authorized((headers) => _http.delete(
          _uri('/api/v1/tasks/${Uri.encodeComponent(id)}'),
          headers: headers,
        ));
    _ensureSuccess(response);
  }

  // --- Internos -------------------------------------------------------------

  Future<http.Response> _authorized(
    Future<http.Response> Function(Map<String, String> headers) request,
  ) async {
    final tokens = await _storage.read();
    if (tokens == null) throw const SessionExpiredException();

    Map<String, String> headersFor(String token) =>
        {..._jsonHeaders, 'Authorization': 'Bearer $token'};

    var response = await _send(() => request(headersFor(tokens.accessToken)));
    if (response.statusCode == 401) {
      final refreshed = await _refreshOnce(tokens.refreshToken);
      response = await _send(() => request(headersFor(refreshed.accessToken)));
      if (response.statusCode == 401) {
        await _storage.clear();
        throw const SessionExpiredException();
      }
    }
    return response;
  }

  Future<AuthTokens> _refreshOnce(String refreshToken) {
    return _refreshing ??= _refresh(refreshToken).whenComplete(() {
      _refreshing = null;
    });
  }

  Future<AuthTokens> _refresh(String refreshToken) async {
    final response = await _send(() => _http.post(
          _uri('/api/v1/auth/refresh'),
          headers: _jsonHeaders,
          body: jsonEncode({'refreshToken': refreshToken}),
        ));
    if (response.statusCode != 200) {
      await _storage.clear();
      throw const SessionExpiredException();
    }
    final tokens = _parseTokens(response);
    await _storage.save(tokens);
    return tokens;
  }

  Future<http.Response> _send(Future<http.Response> Function() request) async {
    try {
      return await request().timeout(timeout);
    } on TimeoutException {
      throw const ApiException('El servidor tardó demasiado en responder.');
    } on http.ClientException {
      throw const ApiException('No se pudo conectar con el servidor.');
    }
  }

  AuthTokens _parseTokens(http.Response response) {
    final body = _decode(response);
    final access = body['accessToken'];
    final refresh = body['refreshToken'];
    if (access is! String || refresh is! String) {
      throw const ApiException('Respuesta inesperada del servidor.');
    }
    return AuthTokens(accessToken: access, refreshToken: refresh);
  }

  Task _parseTask(http.Response response) {
    _ensureSuccess(response);
    try {
      return Task.fromJson(_decode(response));
    } on FormatException {
      throw const ApiException('Respuesta inesperada del servidor.');
    }
  }

  void _ensureSuccess(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;
    throw ApiException(_errorMessage(response), statusCode: response.statusCode);
  }

  Map<String, dynamic> _decode(http.Response response) {
    _ensureSuccess(response);
    try {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      if (decoded is Map<String, dynamic>) return decoded;
    } on FormatException {
      // cae al error genérico
    }
    throw const ApiException('Respuesta inesperada del servidor.');
  }

  String _errorMessage(http.Response response) {
    try {
      final decoded = jsonDecode(utf8.decode(response.bodyBytes));
      final error = decoded is Map ? decoded['error'] : null;
      final message = error is Map ? error['message'] : null;
      if (message is String && message.isNotEmpty) return message;
    } on Object {
      // cuerpo no JSON
    }
    if (response.statusCode == 429) {
      return 'Demasiados intentos. Espera e inténtalo de nuevo.';
    }
    return 'Ocurrió un error (${response.statusCode}).';
  }
}

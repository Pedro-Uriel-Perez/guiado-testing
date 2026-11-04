import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Par de tokens de una sesión.
class AuthTokens {
  /// Crea un par de tokens.
  const AuthTokens({required this.accessToken, required this.refreshToken});

  /// JWT de vida corta que se envía en `Authorization: Bearer`.
  final String accessToken;

  /// Token opaco que se rota en cada `/auth/refresh`.
  final String refreshToken;

  /// Nunca imprime los tokens (evita filtrarlos en logs).
  @override
  String toString() => 'AuthTokens(***)';
}

/// Dónde se guardan los tokens. Es una interfaz para poder usar un doble en las pruebas.
abstract class TokenStorage {
  /// Lee la sesión guardada o `null`.
  Future<AuthTokens?> read();

  /// Guarda (o reemplaza) la sesión.
  Future<void> save(AuthTokens tokens);

  /// Borra la sesión.
  Future<void> clear();
}

/// Almacenamiento en memoria: para pruebas.
class InMemoryTokenStorage implements TokenStorage {
  /// Crea el almacenamiento, opcionalmente con una sesión inicial.
  InMemoryTokenStorage([this._tokens]);

  AuthTokens? _tokens;

  @override
  Future<AuthTokens?> read() async => _tokens;

  @override
  Future<void> save(AuthTokens tokens) async => _tokens = tokens;

  @override
  Future<void> clear() async => _tokens = null;
}

/// Almacenamiento seguro del sistema (Keychain en iOS, Keystore en Android,
/// Credential Manager en Windows).
class SecureTokenStorage implements TokenStorage {
  /// Crea el almacenamiento seguro.
  SecureTokenStorage([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';

  @override
  Future<AuthTokens?> read() async {
    final access = await _storage.read(key: _accessKey);
    final refresh = await _storage.read(key: _refreshKey);
    if (access == null || refresh == null) return null;
    return AuthTokens(accessToken: access, refreshToken: refresh);
  }

  @override
  Future<void> save(AuthTokens tokens) async {
    await _storage.write(key: _accessKey, value: tokens.accessToken);
    await _storage.write(key: _refreshKey, value: tokens.refreshToken);
  }

  @override
  Future<void> clear() async {
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}

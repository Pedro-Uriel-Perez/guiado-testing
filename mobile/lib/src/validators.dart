/// Reglas de validación compartidas por los formularios.
/// Son las mismas que aplica la API, para dar retroalimentación inmediata.
library;

/// Longitud máxima de un título (en caracteres / puntos de código, como PostgreSQL).
const int titleMaxLength = 120;

/// Longitud mínima y máxima de la contraseña.
const int passwordMinLength = 8;
const int passwordMaxLength = 128;

final RegExp _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

/// Devuelve un mensaje de error o `null` si el título es válido.
String? validateTitle(String? value) {
  final title = (value ?? '').trim();
  if (title.isEmpty) {
    return 'Escribe un título.';
  }
  if (title.runes.length > titleMaxLength) {
    return 'Máximo $titleMaxLength caracteres.';
  }
  return null;
}

/// Devuelve un mensaje de error o `null` si el correo es válido.
String? validateEmail(String? value) {
  final email = (value ?? '').trim();
  if (email.isEmpty || email.length > 254 || !_emailPattern.hasMatch(email)) {
    return 'Ingresa un correo válido.';
  }
  return null;
}

/// Devuelve un mensaje de error o `null` si la contraseña es válida.
String? validatePassword(String? value) {
  final length = (value ?? '').runes.length;
  if (length < passwordMinLength || length > passwordMaxLength) {
    return 'La contraseña debe tener entre $passwordMinLength y $passwordMaxLength caracteres.';
  }
  return null;
}

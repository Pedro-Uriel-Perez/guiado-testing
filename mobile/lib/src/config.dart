/// URL base de la API. Se cambia sin tocar código:
///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000   (emulador Android)
const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:3000',
);

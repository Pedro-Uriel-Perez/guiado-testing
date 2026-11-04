# Task Manager: app Flutter

App móvil y de escritorio del proyecto. Ver el [README principal](../README.md).

```bash
flutter pub get
flutter test                                   # unitarias, widgets, mocks, accesibilidad, layouts
flutter run -d windows                          # API en http://localhost:3000
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000   # emulador Android
flutter test integration_test -d windows        # E2E (requiere la API local)
```

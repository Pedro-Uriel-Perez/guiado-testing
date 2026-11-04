# 12. Compatibilidad de dispositivos y plataformas

## Matriz

| Plataforma | Perfil | SO | Verificaciones | Estado |
|---|---|---|---|---|
| Android | Pantalla pequeña (320×568) | Mínimo soportado (`flutter.minSdkVersion`) | Login, texto escalado, red | 🟡 Layout simulado en widget test; falta dispositivo real |
| Android | Dispositivo actual (393×852) | Android 14+ | CRUD, refresh, logout | 🟡 Layout simulado; E2E listo con `--dart-define=API_BASE_URL=http://10.0.2.2:3000` |
| iOS | Pantalla pequeña | Mínimo soportado | Layout, almacenamiento seguro (Keychain), accesibilidad | ⬜ Requiere macOS |
| iOS | Dispositivo actual | iOS actual | Login, ciclo de vida, recuperación de red | ⬜ Requiere macOS |
| Windows | Escritorio 1440×900 | Windows 11 | Smoke, E2E | ✅ Widget test; E2E requiere el Modo de desarrollador |
| Linux | Escritorio (CI) | Ubuntu (GitHub Actions) | E2E automatizado | ✅ Job `e2e` |
| Emulador/simulador | Perfil de desarrollo | Toolchain actual | Smoke automatizado rápido | ✅ `flutter test` |

## Revisión automática de layout (`mobile/test/compatibility_test.dart`)

En 4 tamaños (320×568, 393×852, 1024×768, 1440×900), con un título largo de dos líneas:
- Lista y login se dibujan **sin overflow** (Flutter reporta un overflow como excepción, y la prueba fallaría).
- El botón flotante mide al menos 48 dp.

## Ejercicio: pantalla pequeña vs. grande

| Observación | 320×568 | 1440×900 |
|---|---|---|
| Overflow | Ninguno | Ninguno |
| Texto cortado | El título largo hace salto de línea (no se corta) | Una línea |
| Controles difíciles de tocar | Ninguno (≥ 48 dp) | Ninguno |
| Mejora posible | — | La lista ocupa todo el ancho; se podría limitar a ~720 px como el login (420 px) |

## Detalles de configuración por plataforma

- Android: se agregó `INTERNET` al manifiesto principal y `usesCleartextTraffic` **solo en debug**, para hablar con la API local por `http`.
- Tokens: `flutter_secure_storage` (Keystore / Keychain / Credential Manager), nunca `SharedPreferences`.

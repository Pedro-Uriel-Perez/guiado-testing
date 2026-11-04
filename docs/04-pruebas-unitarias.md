# 4. Pruebas unitarias aisladas

Las pruebas unitarias no usan red ni base de datos.

## Backend (Jest)

| Archivo | Qué prueba |
|---|---|
| `backend/tests/unit/validation.test.js` | `validateTitle` (las 3 pruebas del tutorial + tabla de límites + tipos incorrectos + emoji), `validateCompleted`, `validatePagination`, `isUuid` |
| `backend/tests/unit/auth-validation.test.js` | Límites de contraseña (7/8/128/129) y normalización del correo |
| `backend/tests/unit/tokens.test.js` | JWT: vigente, expirado, otra firma, algoritmo `none`, tipo incorrecto, payload manipulado; refresh token aleatorio y hasheado |

```bash
cd backend
npm run test:unit
```

## Flutter (flutter_test)

| Archivo | Qué prueba |
|---|---|
| `mobile/test/models/task_test.dart` | `Task.fromJson`: las pruebas del tutorial + **ejercicio**: ID faltante, ID de tipo incorrecto, título de 120 caracteres |
| `mobile/test/validators_test.dart` | Mismas reglas de límites que la API, en el cliente |

```bash
cd mobile
flutter test test/models test/validators_test.dart
```

## Ejercicio de la sección 4

- [x] Prueba para un ID faltante → `rejects a missing id`
- [x] Prueba para un título válido de longitud máxima → `accepts a title at the maximum allowed length (120)`

Evidencia: [`evidencias/backend-tests-y-cobertura.txt`](evidencias/backend-tests-y-cobertura.txt), [`evidencias/flutter-tests.txt`](evidencias/flutter-tests.txt).

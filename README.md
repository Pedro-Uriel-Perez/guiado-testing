# Guiado Testing: Task Manager

Práctica completa del tutorial **"Become a Better Application Tester: A Hands-On Task Manager Guide"**, sobre una app real:

- **Móvil:** Flutter 3.47 (Android, iOS, Windows, Linux, Web)
- **API REST:** Node.js + Express 5
- **Base de datos:** PostgreSQL 16 (Docker)
- **Autenticación:** JWT de vida corta + refresh tokens con rotación, detección de reutilización, logout y logout-all

![Tests](../../actions/workflows/tests.yml/badge.svg)

## Resumen de evidencia

| Suite | Resultado | Evidencia |
|---|---|---|
| Backend: unitarias + API/integración (Jest + Supertest + PostgreSQL) | **145/145 ✅**, 96.8 % de líneas cubiertas | [`docs/evidencias/backend-tests-y-cobertura.txt`](docs/evidencias/backend-tests-y-cobertura.txt) |
| Flutter: unitarias + widgets + cliente con mocks + accesibilidad + layouts | **80/80 ✅**, 86.9 % de líneas cubiertas | [`docs/evidencias/flutter-tests.txt`](docs/evidencias/flutter-tests.txt) |
| `flutter analyze` | Sin problemas ✅ | [`docs/evidencias/flutter-analyze.txt`](docs/evidencias/flutter-analyze.txt) |
| End-to-end (app → API → PostgreSQL) | Job `e2e` en GitHub Actions | [`docs/07-pruebas-end-to-end.md`](docs/07-pruebas-end-to-end.md) |
| Smoke test | **7/7 ✅** | [`docs/evidencias/smoke-test.txt`](docs/evidencias/smoke-test.txt) |
| Carga k6 (local) | p95 = 7.5 ms ✅ / umbral de 1 ms ❌ (ejercicio) | [`docs/10-rendimiento-k6.md`](docs/10-rendimiento-k6.md) |
| Sesión exploratoria | 2 bugs reales (1 corregido, 1 abierto) + 1 observación | [`docs/03-sesion-exploratoria.md`](docs/03-sesion-exploratoria.md) |

## Las 15 secciones del tutorial

| # | Sección | Entregable | Ejercicio |
|---|---|---|---|
| 1 | Mentalidad y plan | [Plan de pruebas y criterios de aceptación](docs/01-plan-de-pruebas.md) | ✅ 3 criterios (éxito, inválido, permisos) |
| 2 | Casos de prueba y bugs | [4 casos + 3 reportes](docs/02-casos-de-prueba-y-bugs.md) | ✅ Reporte "la tarea desaparece al completarla" |
| 3 | Exploratoria con charter | [Notas de sesión](docs/03-sesion-exploratoria.md) | ✅ Título largo, en blanco, toques repetidos, sin red |
| 4 | Unitarias | [`backend/tests/unit`](backend/tests/unit), [`mobile/test/models`](mobile/test/models) | ✅ ID faltante + título de 120 |
| 5 | Widgets | [`mobile/test/widgets`](mobile/test/widgets), [`mobile/test/screens`](mobile/test/screens) | ✅ Botón de reintento llamado 1 vez |
| 6 | API e integración | [`backend/tests/api`](backend/tests/api) | ✅ ID inválido, título faltante, editar tarea ajena |
| 7 | End-to-end | [`mobile/integration_test/app_test.dart`](mobile/integration_test/app_test.dart) | ✅ Completar tarea, logout, ver login |
| 8 | Valores límite | [Tablas de título, contraseña y paginación](docs/08-valores-limite.md) | ✅ Contraseña 7/8/128/129 |
| 9 | Seguridad | [OWASP API Top 10 + pruebas negativas](docs/09-seguridad.md) | ✅ `ownerId` ignorado |
| 10 | Rendimiento | [k6 en Docker](docs/10-rendimiento-k6.md) | ✅ Cambio de umbral explicado |
| 11 | Accesibilidad | [Guías automáticas + checklist manual](docs/11-usabilidad-accesibilidad.md) | ✅ automático / ⬜ lector real |
| 12 | Compatibilidad | [Matriz + layouts 320 a 1440 px](docs/12-compatibilidad.md) | ✅ pantalla pequeña vs. grande |
| 13 | Smoke y regresión | [Smoke + checklist](docs/13-smoke-y-regresion.md) | ✅ Checklist de regresión |
| 14 | CI y cobertura | [`.github/workflows/tests.yml`](.github/workflows/tests.yml), [notas](docs/14-ci-y-cobertura.md) | ✅ CI falla al romper el código y vuelve a verde |
| 15 | Mocks y pruebas inestables | [Comparación mock vs. integración](docs/15-mocks-y-pruebas-inestables.md) | ✅ |

## Estructura

```
backend/                 API Express + PostgreSQL
  src/                   app, auth (JWT/refresh), tasks, middleware
  tests/unit/            validación y tokens (sin red ni base de datos)
  tests/api/             Supertest contra la base de pruebas aislada
  k6/health-test.js      prueba de carga local
  scripts/               migrate, smoke, explore-api
mobile/                  App Flutter
  lib/src/               modelos, validadores, cliente HTTP, pantallas, widgets
  test/                  unitarias, widgets, pantallas, mocks, accesibilidad, layouts
  integration_test/      recorrido end-to-end
docs/                    un documento por sección del tutorial + evidencias/
docker-compose.yml       PostgreSQL de desarrollo (5434) y de pruebas (5433)
```

## Cómo correrlo

Requisitos: Node 20+, Flutter 3.47+, Docker.

```bash
# Bases de datos (desarrollo en 5434, pruebas aisladas en 5433)
docker compose up -d

# Backend
cd backend
npm ci
npm test                  # 145 pruebas (unitarias + API sobre PostgreSQL)
npm run test:coverage
npm run db:migrate && npm start   # API en http://localhost:3000
npm run smoke             # en otra terminal, con la API corriendo

# App
cd mobile
flutter pub get
flutter test              # 80 pruebas
flutter run -d windows    # o -d chrome / un emulador (ver docs/07)
flutter test integration_test -d windows   # E2E, con la API corriendo
```

## API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/health` | — | Estado del servicio |
| POST | `/api/v1/auth/register` | — | Crea una cuenta y devuelve un par de tokens |
| POST | `/api/v1/auth/login` | — | Inicia sesión |
| POST | `/api/v1/auth/refresh` | — | Rota el refresh token |
| POST | `/api/v1/auth/logout` | Bearer | Revoca el refresh token de este dispositivo |
| POST | `/api/v1/auth/logout-all` | Bearer | Revoca todas las sesiones |
| GET | `/api/v1/auth/me` | Bearer | Usuario actual |
| GET | `/api/v1/tasks?limit&offset` | Bearer | Mis tareas (paginadas) |
| POST | `/api/v1/tasks` | Bearer | Crea una tarea `{ title }` |
| GET / PATCH / DELETE | `/api/v1/tasks/:id` | Bearer | Leer, editar `{ title?, completed? }` y borrar (solo si es mía) |

## Reglas de seguridad seguidas

- Solo entornos locales o de CI. Ninguna prueba de carga o de seguridad se ejecutó contra sistemas ajenos.
- Solo datos sintéticos (`@example.test`). Ningún token ni contraseña real en la evidencia.
- La base de pruebas se recrea sola, y el script de reinicio se niega a tocar bases que no terminen en `_test`.

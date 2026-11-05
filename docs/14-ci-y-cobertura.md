# 14. CI y cobertura

## Workflow (`.github/workflows/tests.yml`)

Corre en cada `pull_request` y `push` a `main`:

| Job | Qué hace |
|---|---|
| `backend` | Servicio PostgreSQL 16 → `npm ci` → `npm run test:coverage` |
| `flutter` | Flutter 3.47.9 (fijado para que sea reproducible) → `flutter analyze` → `flutter test` |
| `e2e` | PostgreSQL + API real → smoke test → `xvfb-run flutter test integration_test -d linux` |

## Cobertura actual

| Proyecto | Líneas | Detalle |
|---|---|---|
| Backend | **96.77 %** (270/279); ramas 88.23 %; funciones 100 % | [`evidencias/backend-tests-y-cobertura.txt`](evidencias/backend-tests-y-cobertura.txt) |
| Flutter | **86.9 %** (326/375) | [`evidencias/flutter-cobertura.txt`](evidencias/flutter-cobertura.txt) |

### Lo que la cobertura NO dice

- `token_storage.dart` tiene 45 %: `SecureTokenStorage` usa el plugin nativo y no se ejecuta en `flutter test`. Las líneas sin cubrir son justo las del almacenamiento seguro real, que requiere un dispositivo.
- BUG-003 (título invisible) existía con 96 % de cobertura: las líneas de validación **sí** se ejecutaban, pero ninguna prueba usaba U+200B. Cobertura alta ≠ buenas pruebas.
- Las 4 pruebas que fallaron al romper el filtro de dueño muestran mejor la calidad de la suite que el porcentaje.

## Ejercicio: hacer fallar la CI a propósito y restaurar

1. En la rama `ejercicio/ci-debe-fallar` se cambió `AND user_id = $2` por `OR user_id = $2` en `findTask` (rompe la autorización por dueño).
2. GitHub Actions marcó el job `backend` en **rojo**: 4 pruebas de BOLA fallaron (141/145) y el job `e2e` se omitió ([run 41932927880](https://github.com/Pedro-Uriel-Perez/guiado-testing/actions/runs/41932927880)).
3. Se revirtió con `git revert` en la misma rama y el job `backend` volvió a **verde** ([run 41933124472](https://github.com/Pedro-Uriel-Perez/guiado-testing/actions/runs/41933124472)). La E2E de esa corrida falló porque la rama se creó antes de corregir la prueba E2E; tras integrar `main`, los 3 jobs quedaron en verde ([run 41945480664](https://github.com/Pedro-Uriel-Perez/guiado-testing/actions/runs/41945480664)).

Enlaces a las ejecuciones: ver la sección "Evidencia en GitHub Actions" del [README](../README.md).

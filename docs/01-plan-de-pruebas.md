# 1. Mentalidad de tester y plan de pruebas

## Requisito analizado

> "Un usuario con sesión iniciada puede crear una tarea."

| Pregunta | Respuesta |
|---|---|
| ¿Quién lo usa? | Usuario registrado, desde la app móvil (Android/iOS) o de escritorio. |
| ¿Qué se observa? | Respuesta `201` con la tarea; la tarea aparece en la lista; persiste en PostgreSQL tras cerrar y abrir sesión. |
| Uso normal | Título típico ("Plan tests"). |
| Entrada inválida | Vacío, solo espacios, tipo incorrecto (`42`), demasiado largo (121). |
| Casos límite | 1 y 120 caracteres, 120 emoji, espacios alrededor. |
| Riesgos | Ver tareas de otra persona (BOLA), perder lo escrito si falla la red, duplicados por toques repetidos, tokens filtrados en logs. |

### Criterios de aceptación (ejercicio de la sección 1)

1. **Éxito típico:** una tarea con título válido se guarda y aparece en la lista.
   → `tests/api/tasks.test.js › CRUD happy path`, `task_list_screen_test.dart › creates a task from the dialog`, prueba E2E.
2. **Entrada inválida:** un título con solo espacios se rechaza con el mensaje "Ingresa un título válido." (API) / "Escribe un título." (app).
   → `tasks.test.js › rejects an empty title`, `task_list_screen_test.dart › a blank title shows a clear message`.
3. **Límite de permisos:** un usuario no puede ver, editar ni borrar la tarea de otra cuenta cambiando el ID; recibe `404`, igual que con un ID inexistente.
   → `tasks.test.js › ownership boundaries (BOLA)`.

## Priorización (impacto × probabilidad)

| Prioridad | Área | Por qué |
|---|---|---|
| Alta | Autorización por dueño, sesión (refresh/logout) | Fuga de datos privados; impacto máximo. |
| Alta | Crear / completar tareas | Flujo central; si falla, la app no sirve. |
| Media | Validación de títulos y contraseñas | Errores frecuentes de usuario. |
| Media | Errores de red en la app | Probable en móvil; riesgo de pérdida de datos. |
| Baja | Layout en pantallas grandes | Pocos usuarios de escritorio. |

## Pirámide aplicada en este repo

```
            E2E (1 recorrido)            integration_test/app_test.dart
       API / integración (≈90 casos)      backend/tests/api/*.test.js
  Unitarias + widgets (≈135 casos)        backend/tests/unit, mobile/test
```

## Plan de pruebas (plantilla del tutorial, llenada)

| Campo | Notas |
|---|---|
| Feature/release | Task Manager v1.0.0: registro, login, CRUD de tareas, refresh, logout, logout-all. |
| Alcance | **Incluye:** API `/api/v1/auth/*`, `/api/v1/tasks/*`, app Flutter (login, lista, diálogo de tarea). **Excluye:** recuperación de contraseña (no existe), notificaciones, despliegue a producción. |
| Riesgos | BOLA entre usuarios, reutilización de refresh tokens, fuerza bruta en login, pérdida de lo escrito sin red, títulos invisibles (BUG-003). |
| Entorno | API Node 24 (local) / 22 (CI), Express 5, PostgreSQL 16 en Docker; Flutter 3.47.9 (Dart 3.13.7); Windows 11; CI `ubuntu-latest`. |
| Datos de prueba | Cuentas sintéticas `*@example.test` generadas por prueba; la base `taskmanager_test` se recrea antes de cada suite y se vacía (`TRUNCATE`) antes de cada prueba. |
| Tipos de prueba | Unitaria, widget, API/integración, E2E, exploratoria, límites, seguridad, carga (k6), accesibilidad, compatibilidad, smoke, regresión. |
| Criterios de entrada | API arranca, migraciones aplicadas, base de pruebas aislada disponible. |
| Criterios de salida | 100 % de pruebas automatizadas en verde en CI; sin defectos de severidad alta abiertos; smoke 7/7. |
| Responsables | Pedro Uriel Pérez Monzón (pruebas y correcciones). |
| Evidencia | `docs/evidencias/` (salidas redactadas, sin tokens) y ejecuciones de GitHub Actions. |

## Qué quedó sin probar (y por qué)

- Lector de pantalla real (TalkBack/VoiceOver) y dispositivos físicos: no disponibles en esta sesión; se dejó checklist manual en [11](11-usabilidad-accesibilidad.md) y [12](12-compatibilidad.md).
- iOS: no se puede compilar en Windows.
- HTTPS y cabeceras en producción: no hay despliegue.

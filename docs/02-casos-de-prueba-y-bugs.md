# 2. Casos de prueba y reportes de bugs

## Casos de prueba

### TC-01 — Crear tarea con título válido

| Campo | Contenido |
|---|---|
| Precondiciones | Usuario sintético con sesión iniciada; lista vacía. |
| Pasos | 1. Tocar "Agregar tarea" (+). 2. Escribir el título. 3. Tocar "Guardar". |
| Datos | `Check release flow` |
| Resultado esperado | El diálogo se cierra; "Check release flow" aparece una vez en la lista con estado "Pendiente"; la API responde `201`. |
| Resultado real | Igual al esperado. |
| Entorno | Windows 11, Flutter 3.47.9, API local 1.0.0, PostgreSQL 16. |
| Automatizado en | `mobile/test/screens/task_list_screen_test.dart`, `backend/tests/api/tasks.test.js`, `mobile/integration_test/app_test.dart` |

### TC-02 — Rechazar título solo con espacios

| Campo | Contenido |
|---|---|
| Precondiciones | Sesión iniciada. |
| Pasos | 1. Abrir "Nueva tarea". 2. Escribir cuatro espacios. 3. Tocar "Guardar". |
| Datos | `"    "` |
| Resultado esperado | Se muestra "Escribe un título." bajo el campo; no se envía petición (0 llamadas a la API). Directo a la API: `400` con "Ingresa un título válido.". |
| Resultado real | Igual al esperado. |
| Entorno | Igual que TC-01. |

### TC-03 — Un usuario no puede leer la tarea de otro

| Campo | Contenido |
|---|---|
| Precondiciones | Usuario A con una tarea "Private task"; usuario B con sesión propia. |
| Pasos | 1. Como A, crear la tarea y anotar su ID. 2. Como B, `GET /api/v1/tasks/{id}`. 3. Como B, `PATCH` y `DELETE` sobre el mismo ID. |
| Datos | Dos cuentas `tester-<uuid>@example.test`. |
| Resultado esperado | `404` en los tres casos, con el mismo cuerpo que un ID inexistente; la tarea de A queda intacta. |
| Resultado real | Igual al esperado. |
| Entorno | API local, base `taskmanager_test`. |

### TC-04 — Reutilizar un refresh token cierra la sesión completa

| Campo | Contenido |
|---|---|
| Precondiciones | Usuario con sesión (refresh token R1). |
| Pasos | 1. `POST /auth/refresh` con R1 → recibe R2. 2. Repetir con R1. 3. `POST /auth/refresh` con R2. |
| Resultado esperado | Paso 1: `200`. Paso 2: `401` (reutilización detectada). Paso 3: `401` (toda la familia revocada). |
| Resultado real | Igual al esperado. |

---

## Reportes de bugs

> Severidad = impacto. Prioridad = urgencia.

### BUG-001 — La tarea desaparece de la lista al marcarla como completada *(ejercicio del tutorial)*

> Este es el reporte de práctica que pide la sección 2. Se escribió como escenario; después se agregaron pruebas de regresión que garantizan que **no** ocurre en esta app.

| Campo | Contenido |
|---|---|
| Resumen | Al marcar una tarea como completada, desaparece de "Mis tareas" y no se puede desmarcar. |
| Entorno | Android 14 (emulador Pixel 7), app 1.0.0, API 1.0.0. |
| Precondiciones | Cuenta sintética con 1 tarea pendiente "Terminar reporte". |
| Pasos | 1. Iniciar sesión. 2. Marcar la casilla de "Terminar reporte". 3. Observar la lista. 4. Cerrar y abrir sesión. |
| Esperado | La tarea sigue visible con estado "Completada" (tachada y con texto "Completada") en los pasos 3 y 4. |
| Real (escenario) | La tarea deja de verse en el paso 3; tras el paso 4 tampoco aparece. |
| Evidencia | Captura redactada + respuesta de `GET /api/v1/tasks` sin el token. |
| Severidad | **Alta**: el usuario pierde de vista sus datos (posible pérdida de datos). |
| Prioridad | **Alta**: afecta el flujo principal. |
| Regresión | `tasks.test.js › create -> list -> read -> complete -> delete` (la tarea completada sigue en la lista), `task_list_screen_test.dart › a completed task stays visible in the list`, paso 3 de la prueba E2E. |

### BUG-002 — Un título de 61–120 emoji se rechaza aunque mida menos de 120 caracteres *(encontrado y corregido)*

| Campo | Contenido |
|---|---|
| Resumen | `validateTitle` del tutorial usa `title.length`, que cuenta unidades UTF-16: cada emoji cuenta como 2. PostgreSQL (`VARCHAR(120)`) cuenta caracteres. |
| Entorno | API 1.0.0 (versión inicial), Node 24. |
| Pasos | `POST /api/v1/tasks` con `{"title": "🚀" × 61}`. |
| Esperado | `201` (61 caracteres ≤ 120). |
| Real | `400 Ingresa un título válido.` (JavaScript calcula una longitud de 122). |
| Cómo se encontró | Aplicando análisis de valores límite (sección 8) a la función del tutorial con datos no ASCII. |
| Severidad | Media: rechaza entradas válidas en español con emoji; no hay pérdida de datos. |
| Prioridad | Media. |
| Corrección | Contar puntos de código (`Array.from(title).length`) en la API y `title.runes.length` en la app. |
| Regresión | `validation.test.js › accepts 120 emoji`, `rejects 121 emoji`; `tasks.test.js › title 120 emoji -> 201`; `validators_test.dart › 120 emoji`. Confirmado en la sesión exploratoria (`docs/evidencias/exploratorio-api.txt`). |

### BUG-003 — Se puede crear una tarea invisible con solo U+200B *(abierto)*

| Campo | Contenido |
|---|---|
| Resumen | Un título formado solo por un espacio de ancho cero (U+200B) pasa la validación, porque `trim()` no lo elimina. La tarea aparece como una fila vacía. |
| Entorno | API 1.0.0, Node 24, PostgreSQL 16. |
| Pasos | `POST /api/v1/tasks` con `{"title": "​"}` (enviar desde un script; la consola de Windows altera el carácter). |
| Esperado | `400 Ingresa un título válido.`, igual que con solo espacios. |
| Real | `201`; se guarda un título de 1 carácter invisible. |
| Evidencia | `docs/evidencias/exploratorio-api.txt`, fila "solo espacio de ancho cero U+200B". |
| Severidad | Baja: no hay fuga ni pérdida de datos; solo confusión visual. |
| Prioridad | Baja: requiere una entrada deliberada. |
| Propuesta | Rechazar títulos sin ningún carácter visible (p. ej., exigir al menos uno de `\p{L}\p{N}\p{P}\p{S}`) en la API y en la app, con prueba de regresión. |

# 9. Comportamiento negativo y seguridad básica

> Todo se ejecutó **solo** contra la API local y la base de pruebas propias. No se escaneó ningún sistema ajeno.

## Pasos del tutorial

| # | Verificación | Cómo se probó | Resultado |
|---|---|---|---|
| 1 | Tipos inválidos, campos faltantes, valores enormes | `title: 42`, `{}`, cuerpo de 20 kB | `400` / `400` / `413` ✅ |
| 2 | Cadenas tipo inyección SQL | `' OR '1'='1`, `x'); DROP TABLE tasks; --` | Se guardan literalmente; no se filtran filas; la tabla sigue existiendo ✅ (todas las consultas usan parámetros `$1`) |
| 3 | Markup en la UI | `<script>alert(1)</script>` | La API lo devuelve como JSON; Flutter lo muestra como texto (`Text` no interpreta HTML) ✅ |
| 4 | Token de B con tarea de A | GET / PATCH / DELETE | `404`; la tarea de A no cambia ✅ |
| 5 | Rate limit (corrida pequeña) | App de prueba con límite 3 | 4.º intento → `429` + `Retry-After` ✅ |
| 6 | Token expirado, rotación, reutilización, logout, logout-all | `auth.test.js` | Todos `401` donde corresponde ✅ |

## Ejercicio: actualizar con `ownerId`

`PATCH /api/v1/tasks/:id` con `{ "title": "Renombrada", "ownerId": "<id de otro>", "userId": "<id de otro>" }`:
- Responde `200` y **ignora** `ownerId`/`userId` (lista blanca: solo `title` y `completed`).
- En la base, `user_id` sigue siendo el dueño original; el otro usuario sigue recibiendo `404`.
- Prueba: `ownerId / userId in the body are ignored; ownership stays server-derived`.

## Checklist OWASP API Security Top 10

| Riesgo | Revisión en Task Manager | Estado |
|---|---|---|
| API1 Broken object-level authorization | Todas las consultas filtran `WHERE id = $1 AND user_id = $2` con el dueño tomado del token | ✅ Probado |
| API2 Broken authentication | JWT HS256 con algoritmo fijo, 15 min de vida, `alg: none` rechazado; refresh opacos guardados como hash, rotación y detección de reutilización; logout-all invalida access tokens (`token_version`) | ✅ Probado |
| API3 Broken object property-level authorization | Lista blanca de campos; las respuestas no exponen `user_id` ni el hash de la contraseña | ✅ Probado |
| API4 Unrestricted resource consumption | Cuerpo ≤ 10 kB, `limit` ≤ 100 | ✅ Probado |
| API5 Broken function-level authorization | Todas las rutas de `/tasks` y `logout*` exigen token; no hay rutas de administrador | ✅ Probado |
| API6 Unrestricted access to sensitive business flows | Rate limit en `register`, `login` y `refresh` | ✅ Probado |
| API7 SSRF | La API no acepta URLs del usuario | ✅ N/A por diseño |
| API8 Security misconfiguration | `helmet` (sin `X-Powered-By`, `nosniff`…), CORS restringido, errores sin stack trace. HTTPS depende del despliegue | ✅ Local / ⚠️ Producción pendiente |
| API9 Improper inventory management | Solo existe `/api/v1`; las rutas sin versión devuelven `404` | ✅ Probado |
| API10 Unsafe consumption of APIs | La app valida cada tarea recibida (`Task.fromJson`) y maneja respuestas inválidas | ✅ Probado (`invalid task data from the server`) |

## Riesgos conocidos

- **Enumeración de cuentas en el registro:** `409` revela que un correo ya existe. El login sí responde igual para correo inexistente y contraseña mala. Se aceptó para mejorar la experiencia de registro.
- **Sin idempotencia:** POST repetidos crean duplicados (ver sesión exploratoria).
- **Refresh concurrente:** si un cliente envía el mismo refresh token dos veces a la vez, la segunda petición se trata como reutilización y se cierra la sesión. La app lo evita agrupando las rotaciones (`concurrent 401s share a single refresh`).

## Cuidado de la evidencia

Ningún archivo de evidencia contiene tokens o contraseñas reales: los scripts redactan los tokens y las cuentas son `@example.test`.

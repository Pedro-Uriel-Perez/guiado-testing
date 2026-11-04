# 3. Sesión exploratoria con charter

- **Charter:** explorar la creación y edición de tareas para encontrar problemas de pérdida de datos y de validación.
- **Duración:** 20 minutos (timebox).
- **Entorno:** API local (`npm start`) sobre PostgreSQL 16 en Docker; cuenta sintética nueva.
- **Herramientas:** `curl` primero y después `node scripts/explore-api.js` (reproducible). Evidencia: [`evidencias/exploratorio-api.txt`](evidencias/exploratorio-api.txt).

## Notas de sesión

| Tiempo | Acción o condición | Observación | Seguimiento |
|---|---|---|---|
| 00:00 | Registro de cuenta sintética | `201`, devuelve un par de tokens | Probar la lista vacía |
| 00:02 | Título de 120 y de 121 caracteres | 120 → `201`; 121 → `400` | Bien. Ya está en la tabla de límites |
| 00:04 | Solo espacios; solo `\t\n` | Ambos `400` | Bien |
| 00:06 | 120 emoji con `curl` | **`400`** aunque las pruebas automáticas daban `201` | ¿Bug o herramienta? |
| 00:08 | Se revisa el cuerpo enviado | La consola de Windows convirtió cada emoji en `?` (varios bytes) antes de que `curl` lo enviara | **Lección:** verifica tu herramienta. Se pasa a un script con `fetch` |
| 00:10 | 120 / 121 emoji con el script | 120 → `201`; 121 → `400` | Confirma la corrección de BUG-002 |
| 00:12 | Título con solo U+200B | **`201`**: tarea invisible | Reporte **BUG-003** |
| 00:13 | Título con solo U+00A0 (espacio de no separación) | `400`: `trim()` sí lo quita | Bien |
| 00:14 | `' OR '1'='1` y `<script>alert(1)</script>` | Se guardan literalmente, no se ejecutan | Bien. Ya hay pruebas de seguridad |
| 00:16 | 5 POST idénticos en paralelo (doble toque sin protección) | Se crean **5** tareas: la API no es idempotente | La app bloquea el botón mientras guarda (prueba `rapid repeated taps`). Riesgo restante: reintentos tras un timeout. Idea: cabecera `Idempotency-Key` |
| 00:18 | ID `abc`, token manipulado, sin token | `404`, `401`, `401` | Bien |
| 00:20 | Fin | — | — |

## Lo que me sorprendió

1. La primera "falla" fue de la herramienta, no de la app. Antes de reportar, reproduce el problema con otra herramienta.
2. `trim()` quita espacios Unicode "normales" (U+00A0), pero no los de ancho cero (U+200B).
3. La protección contra toques repetidos está solo en el cliente; la API no la tiene.

## Exploración de la app (ejercicio de la sección 3)

Se cubrió con pruebas de widgets reproducibles en `mobile/test/screens/task_list_screen_test.dart`:

| Condición | Resultado |
|---|---|
| Título largo (120) | Se acepta; el contador del campo marca 120/120. |
| Título en blanco | "Escribe un título."; no se llama a la API. |
| 5 toques rápidos en "Guardar" | 1 sola tarea creada. |
| Conexión interrumpida al guardar | Aparece "No se pudo conectar con el servidor." y **el texto escrito se conserva**. |
| Conexión interrumpida al completar | La tarea sigue como "Pendiente" y se explica el error. |

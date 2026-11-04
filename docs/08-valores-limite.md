# 8. Valores límite y particiones de equivalencia

## Título de tarea (1 a 120 caracteres)

| Partición o límite | Entrada | Esperado | API | App |
|---|---|---|---|---|
| Vacío | `""` | Rechazar | `400` ✅ | error ✅ |
| Solo espacios | `"   "` | Rechazar | `400` ✅ | error ✅ |
| Longitud mínima válida | `"a"` | Aceptar | `201` ✅ | ✅ |
| Título típico | `"Plan tests"` | Aceptar | `201` ✅ | ✅ |
| Longitud máxima válida | 120 caracteres | Aceptar | `201` ✅ | ✅ |
| Justo arriba del máximo | 121 caracteres | Rechazar | `400` ✅ | error ✅ |
| Tipo incorrecto en JSON | `title: 42` | Rechazar con seguridad | `400` ✅ | n/a |
| `null` | `title: null` | Rechazar | `400` ✅ | ✅ |
| Multibyte en el máximo | 120 × 🚀 | Aceptar | `201` ✅ (antes ❌, BUG-002) | ✅ |
| Multibyte sobre el máximo | 121 × 🚀 | Rechazar | `400` ✅ | ✅ |
| Invisible | `"​"` | Rechazar | `201` ❌ **BUG-003 abierto** | — |

Pruebas: `backend/tests/unit/validation.test.js`, `backend/tests/api/tasks.test.js › input validation`, `mobile/test/validators_test.dart`.

## Ejercicio: contraseña (8 a 128 caracteres)

Solo contraseñas sintéticas (`'a' * n`, `local-test-password`).

| Partición o límite | Entrada | Esperado | Resultado |
|---|---|---|---|
| Vacía | `""` | Rechazar | ✅ |
| Justo debajo del mínimo | 7 caracteres | Rechazar | `400` ✅ |
| Mínimo válido | 8 caracteres | Aceptar | `201` ✅ |
| Típica | `local-test-password` | Aceptar | ✅ |
| Máximo válido | 128 caracteres | Aceptar | `201` ✅ |
| Sobre el máximo | 129 caracteres | Rechazar | `400` ✅ |
| Tipo incorrecto | `12345678` (número) | Rechazar | `400` ✅ |
| Multibyte en el máximo | 128 × `ñ` (256 bytes) | Aceptar | ✅ |

**Hallazgo de diseño:** bcrypt solo usa los primeros 72 bytes de la contraseña. Con un máximo de 128 caracteres, dos contraseñas distintas que compartieran sus primeros 72 bytes habrían sido "iguales". Por eso la API aplica SHA-256 antes de bcrypt. La prueba `a password longer than 72 bytes is not truncated` lo verifica.

## Paginación (`limit` 1 a 100, `offset` ≥ 0)

| Entrada | Esperado |
|---|---|
| `limit=0`, `limit=101`, `limit=abc`, `limit=2.5`, `offset=-1` | `400` ✅ |
| `limit=1`, `limit=100`, `offset=0` | Aceptar ✅ |

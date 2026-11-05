# 15. Mocks y pruebas inestables

## Ejercicio: prueba con mock vs. prueba de integración

| | Cliente con HTTP simulado | API con base de pruebas real |
|---|---|---|
| Archivo | `mobile/test/services/api_client_test.dart` (`MockClient`) | `backend/tests/api/*.test.js` (Supertest + PostgreSQL) |
| Velocidad | ~milisegundos por prueba, sin red | ~decenas de ms; requiere PostgreSQL |
| **Qué detecta** | Que el cliente envía `Bearer`, rota el refresh **una sola vez** ante 401, agrupa refresh concurrentes, borra la sesión si falla el refresh, maneja red caída y JSON inválido, codifica IDs en la URL, no imprime tokens | Que el servidor valida, autoriza por dueño, guarda de verdad, rota y revoca tokens, aplica rate limit, y que el SQL es correcto |
| **Qué NO detecta** | Si el servidor realmente responde así (el mock podría estar desactualizado respecto a la API real); errores de SQL; autorización | Cómo reacciona la app (reintentos, mensajes, pérdida de datos); problemas de UI |
| Determinismo | Total (respuestas fijas) | Alto (datos aislados, `TRUNCATE` por prueba, `--runInBand`) |

La prueba E2E cubre el hueco entre ambas: confirma que el cliente y el servidor reales se entienden.

## Reglas aplicadas

- **Nunca se simula lo que se quiere verificar:** las pruebas de autorización (BOLA) corren contra el middleware y PostgreSQL reales, con dos cuentas reales, sin mocks.
- Los mocks se usan para la app (UI y cliente HTTP), donde se necesita velocidad y control de fallas.
- No hay servicios externos en las pruebas.

## Cómo se evitó que las pruebas fueran inestables

| Fuente de inestabilidad | Control aplicado |
|---|---|
| Datos compartidos | `TRUNCATE` antes de cada prueba; correos con UUID; Jest `--runInBand` |
| Tiempo | Tokens expirados generados con `exp` en el pasado (sin `sleep`); refresh expirado vía `UPDATE expires_at` |
| Red real en la E2E | `pumpUntilFound` con timeout explícito en lugar de solo `pumpAndSettle` |
| Respuestas lentas | `Completer` en el doble de la API (`createGate`) para controlar cuándo "llega" la respuesta |
| Concurrencia de refresh | Prueba determinista con 3 peticiones simultáneas → 1 refresh |
| Rate limit entre pruebas | Cada prueba de rate limit crea su propia app (`createApp({ authRateLimitMax })`) con su propio contador |
| Herramienta que altera datos | Unicode enviado por script (`fetch`), no por la consola (ver sesión exploratoria) |

## Caso real: la E2E falló en su primera corrida en CI

- **Síntoma:** `Found 2 widgets with text "Check release flow"` justo después de tocar "Guardar".
- **Causa:** la prueba esperaba a que apareciera el texto, pero ese texto **ya estaba** escrito en el campo del diálogo todavía abierto. La espera terminaba al instante y contaba 2 coincidencias: el campo y, a veces, la fila nueva. Según el tiempo de respuesta del servidor, podía pasar o fallar: una prueba inestable de manual.
- **Corrección:** esperar a que **desaparezca** el campo del diálogo (`pumpUntilGone`), que solo ocurre cuando la API respondió `201`, y después verificar que hay exactamente una coincidencia.
- **Lo que no se hizo:** volver a correr la prueba hasta que pasara. Se encontró la causa y se controló la sincronización.

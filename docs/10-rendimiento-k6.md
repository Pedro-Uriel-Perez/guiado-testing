# 10. Rendimiento y carga con k6 (solo local)

- **Autorización y alcance:** solo la API local en `localhost:3000`, sistema propio. Nada de producción.
- **Carga:** 5 usuarios virtuales durante 30 s, 1 petición/s cada uno, a `GET /health`.
- **Condición de paro:** umbrales `http_req_failed < 1 %` y `p95 < P95_MS`; Ctrl+C si se degrada la máquina.
- **Script:** [`backend/k6/health-test.js`](../backend/k6/health-test.js) (el del tutorial; el umbral es configurable con `P95_MS`).

## Cómo correrlo sin instalar k6 (con Docker)

```bash
cd backend
npm start   # en otra terminal
docker run --rm -i -e BASE_URL=http://host.docker.internal:3000 grafana/k6:0.54.0 run - < k6/health-test.js
# Con k6 instalado:
BASE_URL=http://localhost:3000 k6 run k6/health-test.js
```

## Resultados

| Corrida | Umbral p95 | p95 medido | Errores | Peticiones | Resultado |
|---|---|---|---|---|---|
| 1 | `< 500 ms` (tutorial) | **7.54 ms** | 0 % (0/150) | 150 (≈5/s) | ✅ Pasa (código de salida 0) |
| 2 | `< 1 ms` (ejercicio) | **9.39 ms** | 0 % (0/150) | 150 (≈5/s) | ❌ Falla: `thresholds on metrics 'http_req_duration' have been crossed` (código 99) |

Evidencia completa: [`evidencias/k6-umbral-500ms.txt`](evidencias/k6-umbral-500ms.txt), [`evidencias/k6-umbral-1ms.txt`](evidencias/k6-umbral-1ms.txt).

## Interpretación (ejercicio)

- El servicio no cambió entre corridas: en ambas el 100 % de los `check` pasó y no hubo errores. **Lo único que cambió fue la expectativa.**
- Con 1 ms, el umbral es más estricto que el costo de red de Docker → host (≈1.4 ms mínimo). Por eso falla aunque el servicio esté sano.
- k6 sale con código distinto de 0 cuando se cruza un umbral, así que un pipeline puede bloquear un despliegue por rendimiento.
- Un umbral útil se fija con base en lo que necesita el usuario (p. ej., p95 < 500 ms), no en el mejor número posible.
- Limitación: `/health` no toca la base. El siguiente paso sería medir `GET /api/v1/tasks` con usuarios sintéticos, vigilando CPU, memoria y conexiones del pool (`max: 10`).

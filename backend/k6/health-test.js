// Prueba de carga PEQUEÑA y AUTORIZADA, solo contra la API local.
// Ejecutar (con k6 instalado):   BASE_URL=http://localhost:3000 k6 run k6/health-test.js
// Con Docker (sin instalar k6):  ver docs/10-rendimiento-k6.md
// P95_MS permite cambiar el umbral para el ejercicio "cambia un umbral y vuelve a correr".
import http from 'k6/http';
import { check, sleep } from 'k6';

const p95 = __ENV.P95_MS || '500';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: [`p(95)<${p95}`],
  },
};

export default function () {
  const response = http.get(`${__ENV.BASE_URL}/health`);

  check(response, {
    'health returns 200': (r) => r.status === 200,
  });

  sleep(1);
}

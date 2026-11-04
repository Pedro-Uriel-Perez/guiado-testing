'use strict';

/**
 * Smoke test (sección 13): verificación rápida de lo crítico después de un deploy o build.
 *   node scripts/smoke.js [http://localhost:3000]
 * Usa una cuenta sintética nueva y borra la tarea que crea. Nunca imprime tokens.
 * Sale con código 1 si algún paso falla.
 */
const baseUrl = process.argv[2] || process.env.BASE_URL || 'http://localhost:3000';

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

async function main() {
  const email = `smoke-${Date.now()}@example.test`;
  const password = 'local-test-password';
  let token;
  let refreshToken;
  let taskId;

  const steps = [
    ['La API responde /health', async () => (await call('GET', '/health')).status === 200],
    [
      'Registro de cuenta sintética',
      async () => (await call('POST', '/api/v1/auth/register', { body: { email, password } })).status === 201,
    ],
    [
      'Login funciona',
      async () => {
        const r = await call('POST', '/api/v1/auth/login', { body: { email, password } });
        token = r.body?.accessToken;
        refreshToken = r.body?.refreshToken;
        return r.status === 200 && Boolean(token);
      },
    ],
    ['La lista de tareas carga', async () => (await call('GET', '/api/v1/tasks', { token })).status === 200],
    [
      'Se puede crear una tarea',
      async () => {
        const r = await call('POST', '/api/v1/tasks', { token, body: { title: 'Smoke test' } });
        taskId = r.body?.id;
        return r.status === 201;
      },
    ],
    [
      'Se puede borrar la tarea (limpieza)',
      async () => (await call('DELETE', `/api/v1/tasks/${taskId}`, { token })).status === 204,
    ],
    [
      'Logout funciona y revoca la sesión',
      async () => {
        const out = await call('POST', '/api/v1/auth/logout', { token, body: { refreshToken } });
        const again = await call('POST', '/api/v1/auth/refresh', { body: { refreshToken } });
        return out.status === 204 && again.status === 401;
      },
    ],
  ];

  console.log(`Smoke test contra ${baseUrl} (${new Date().toISOString()})`);
  let failed = 0;
  for (const [name, run] of steps) {
    let ok = false;
    try {
      ok = await run();
    } catch {
      ok = false;
    }
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
    if (!ok) {
      failed += 1;
      break; // en un smoke, si algo crítico falla no tiene sentido seguir
    }
  }
  console.log(failed ? 'Resultado: FALLÓ' : `Resultado: OK (${steps.length}/${steps.length})`);
  process.exit(failed ? 1 : 0);
}

main();

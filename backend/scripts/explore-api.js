'use strict';

/**
 * Sesión exploratoria reproducible contra la API LOCAL (sección 3 del tutorial).
 *   node scripts/explore-api.js [http://localhost:3000]
 * Se usa fetch desde Node (no curl en la consola) para que los caracteres Unicode
 * lleguen intactos: en Windows la consola convertía emoji y U+200B en "?".
 * Nunca imprime tokens.
 */
const base = `${process.argv[2] || 'http://localhost:3000'}/api/v1`;

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
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

function describe(value) {
  return Array.from(value)
    .slice(0, 3)
    .map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`)
    .join(' ');
}

async function main() {
  console.log(`# Sesión exploratoria contra ${base} (${new Date().toISOString()})`);
  const email = `explora-${Date.now()}@example.test`;
  const { body: session } = await call('POST', '/auth/register', {
    body: { email, password: 'local-test-password' },
  });
  const token = session.accessToken;
  console.log(`Usuario sintético: ${email} (token redactado)\n`);

  const titles = [
    ['120 caracteres', 'a'.repeat(120)],
    ['121 caracteres', 'a'.repeat(121)],
    ['solo espacios', '   '],
    ['solo tabulador y salto de línea', '\t\n'],
    ['120 emoji', '🚀'.repeat(120)],
    ['121 emoji', '🚀'.repeat(121)],
    ['solo espacio de ancho cero U+200B', '​'],
    ['solo espacio de no separación U+00A0', ' '],
    ['inyección SQL', "' OR '1'='1"],
    ['markup', '<script>alert(1)</script>'],
  ];
  console.log('| Entrada | HTTP | Resultado |');
  console.log('|---|---|---|');
  for (const [name, title] of titles) {
    const result = await call('POST', '/tasks', { token, body: { title } });
    const detail =
      result.status === 201
        ? `guardado (${Array.from(result.body.title).length} caracteres, empieza con ${describe(result.body.title)})`
        : result.body.error.message;
    console.log(`| ${name} | ${result.status} | ${detail} |`);
  }

  console.log('\n## 5 POST idénticos en paralelo (simula toques repetidos sin protección en el cliente)');
  const statuses = await Promise.all(
    Array.from({ length: 5 }, () => call('POST', '/tasks', { token, body: { title: 'Doble toque' } })),
  );
  const list = await call('GET', '/tasks?limit=100', { token });
  const duplicates = list.body.items.filter((t) => t.title === 'Doble toque').length;
  console.log(`Respuestas: ${statuses.map((s) => s.status).join(', ')} -> tareas "Doble toque" creadas: ${duplicates}`);

  console.log('\n## Otros');
  console.log(`ID con formato inválido -> ${(await call('GET', '/tasks/abc', { token })).status}`);
  console.log(`Token manipulado -> ${(await call('GET', '/tasks', { token: `${token}x` })).status}`);
  console.log(`Sin token -> ${(await call('GET', '/tasks')).status}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

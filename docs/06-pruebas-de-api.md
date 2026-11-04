# 6. Pruebas de API e integración del backend

Supertest ejercita rutas → middleware → servicio → **PostgreSQL real aislado** (`taskmanager_test`, puerto 5433).

## Aislamiento de datos

- `tests/global-setup.js` recrea el esquema antes de la suite. `scripts/migrate.js --reset` **se niega** a borrar una base cuyo nombre no termine en `_test`.
- `beforeEach(resetDb)` hace `TRUNCATE` de las tablas: ninguna prueba depende de otra.
- Las pruebas corren en serie (`--runInBand`) porque comparten la base.
- Cada usuario es sintético: `tester-<uuid>@example.test`.

## Cobertura funcional

| Archivo | Casos |
|---|---|
| `tests/api/tasks.test.js` | Las 3 pruebas del tutorial; CRUD completo; edición; solo mis tareas; respuesta sin `user_id`; límites del título; paginación; IDs inválidos; BOLA (leer, editar y borrar ajenas); `ownerId`/`userId` ignorados |
| `tests/api/auth.test.js` | Registro, duplicados, límites de contraseña, login, mismo error para correo inexistente y contraseña mala, contraseñas de más de 72 bytes, token expirado / manipulado / de usuario borrado, **rotación de refresh**, **detección de reutilización**, logout, logout-all, rate limit |
| `tests/api/security.test.js` | Inyección SQL, markup, cuerpo > 10 kB (`413`), JSON malformado, rutas desconocidas, cabeceras seguras, CORS |

## Ejercicio de la sección 6

- [x] ID de tarea inválido → `GET /tasks/not-a-uuid -> 404 (no 500)`
- [x] Título faltante → `missing title -> 400`
- [x] Un usuario intenta actualizar la tarea de otro → `a stranger cannot update another user's task` (además se comprueba que la tarea original no cambió)

## Política de "no revelar existencia"

Una tarea ajena y una inexistente responden **idéntico** (`404` + mismo cuerpo), así nadie puede adivinar qué IDs existen. Lo verifica `foreign and missing tasks look identical`.

## ¿Las pruebas detectan fallas reales?

Se rompió a propósito la consulta (`WHERE id = $1 OR user_id = $2` en vez de `AND`): **4 pruebas fallaron** y se restauró el código. Ver también el ejercicio de CI en [14](14-ci-y-cobertura.md).

## Inspección manual con curl

```bash
curl -i http://localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer LOCAL_TEST_ACCESS_TOKEN"
```

> En Windows, `curl` desde la consola puede alterar caracteres Unicode; para eso usa `npm run explore`.

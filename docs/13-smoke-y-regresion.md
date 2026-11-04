# 13. Smoke, regresión y datos de prueba

## Smoke test (`backend/scripts/smoke.js`)

Corre después de cada deploy o build, contra la URL indicada. Se detiene en el primer fallo y sale con código 1.

```bash
cd backend
npm run smoke                      # http://localhost:3000
node scripts/smoke.js http://otra-url-de-prueba:3000
```

Resultado local ([`evidencias/smoke-test.txt`](evidencias/smoke-test.txt)): **7/7 PASS**. La API responde, hay registro, login funciona, la lista carga, se crea y borra una tarea, y el logout revoca la sesión. En CI corre antes de la E2E.

## Checklist de regresión (ejercicio)

| Área | Caso | Automatizado en | ✓ |
|---|---|---|---|
| Creación | Título válido se guarda y aparece | `tasks.test.js`, `task_list_screen_test.dart`, E2E | ✅ |
| Creación | En blanco / 121 / tipo incorrecto se rechazan | `tasks.test.js › input validation` | ✅ |
| Creación | Toques repetidos crean una sola tarea | `task_list_screen_test.dart` | ✅ |
| Edición | Cambiar el título conserva `completed` | `tasks.test.js › editing the title keeps completed unchanged` | ✅ |
| Edición | Error de red no borra lo escrito | `task_list_screen_test.dart › a failed save keeps the typed title` | ✅ |
| Completar | La tarea completada sigue visible (BUG-001) | `tasks.test.js`, `task_list_screen_test.dart`, E2E | ✅ |
| Completar | Fallo de red deja el estado anterior | `a failed toggle keeps the previous state` | ✅ |
| Borrado | Se borra tras confirmar; después responde `404` | `tasks.test.js`, `task_list_screen_test.dart` | ✅ |
| Acceso cruzado | Leer / editar / borrar ajena → `404` | `tasks.test.js › ownership boundaries` | ✅ |
| Acceso cruzado | La lista solo muestra mis tareas | `the list only contains my own tasks` | ✅ |
| Sesión | Refresh, reutilización, logout, logout-all | `auth.test.js` | ✅ |

Toda la suite corre en cada push y pull request (ver [14](14-ci-y-cobertura.md)), así que la regresión completa es automática.

## Gestión de datos de prueba

- **Sintéticos:** correos `@example.test` (dominio reservado), contraseña `local-test-password`.
- **Reproducibles:** cada prueba crea sus propios datos; la E2E crea una cuenta nueva por corrida.
- **Solo bases de prueba:** `migrate.js --reset` rechaza cualquier base que no termine en `_test`; la base de pruebas de Docker vive en `tmpfs` (desaparece al apagar).
- **Entorno registrado:** cada archivo de evidencia lleva fecha, versión de Node/Flutter y base usada.

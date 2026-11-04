# 7. Recorridos completos (end-to-end)

`mobile/integration_test/app_test.dart` maneja la app real contra la API local y PostgreSQL:

1. Crea una cuenta sintética **nueva** por corrida (`e2e-<timestamp>@example.test`): datos aislados y reproducibles.
2. Arranca la app con `runTaskManager(storage: InMemoryTokenStorage())`: es el mismo código que `main()`, pero empieza sin sesión previa guardada en el dispositivo.
3. Inicia sesión → crea "Check release flow" → la ve en la lista.
4. **Ejercicio:** la marca como completada → la tarea sigue visible con "Completada".
5. **Ejercicio:** cierra sesión → aparece la pantalla de login.
6. Extra: vuelve a iniciar sesión y la tarea sigue completada (persistió en PostgreSQL).

Se usa `pumpUntilFound` en lugar de solo `pumpAndSettle`, porque una petición HTTP real no siempre programa frames y la prueba podría avanzar antes de tiempo (causa típica de pruebas inestables).

## Cómo correrla

```bash
# 1. Base y API locales (nunca producción)
docker compose up -d db
cd backend && npm run db:migrate && npm start

# 2. En otra terminal
cd mobile
flutter test integration_test -d windows        # o -d linux / -d <emulador>
# Emulador Android:
flutter test integration_test -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

> **Windows:** compilar plugins requiere activar el *Modo de desarrollador* (Configuración → Sistema → Para programadores). Sin él, Flutter falla con "Building with plugins requires symlink support".

## En CI

El job `e2e` de [`.github/workflows/tests.yml`](../.github/workflows/tests.yml) levanta PostgreSQL y la API, corre el smoke test y ejecuta esta prueba en Linux con `xvfb-run`.

Evidencia: [`evidencias/e2e.txt`](evidencias/e2e.txt) y la ejecución del job `e2e` en GitHub Actions.

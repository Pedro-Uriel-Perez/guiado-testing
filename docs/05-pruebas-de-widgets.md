# 5. Pruebas de widgets en Flutter

`TaskListPanel` (`mobile/lib/src/widgets/task_list_panel.dart`) recibe su estado por parámetros, así cada estado se prueba sin la API real. Las pantallas reciben una interfaz `TaskManagerApi`; en las pruebas se usa el doble `FakeTaskManagerApi` (`mobile/test/fakes.dart`).

| Archivo | Estados y comportamientos |
|---|---|
| `test/widgets/task_list_panel_test.dart` | Cargando, vacío, error, con datos (las 4 del tutorial); **botón de reintento llamado exactamente una vez**; el estado de carga tiene prioridad; estado "Completada" como texto; callbacks reciben la tarea correcta; markup mostrado como texto |
| `test/screens/task_list_screen_test.dart` | Crear, editar, completar y borrar tareas; título en blanco; toques repetidos; error de red sin pérdida de lo escrito; reintento; sesión expirada → login; logout |
| `test/screens/login_screen_test.dart` | Validación antes de llamar a la API, login correcto, error del servidor, regla de contraseña en registro, contraseña oculta |

## Ejercicio de la sección 5

> Agrega un botón de reintento al estado de error y prueba que tocarlo invoca un callback exactamente una vez.

- Implementación: `FilledButton` con `Key('retry-button')` en `TaskListPanel`.
- Prueba: `tapping retry invokes the callback exactly once`.
- Prueba extra a nivel pantalla: `load error shows retry, and retry reloads` (la API se llama 2 veces: carga inicial + reintento).

```bash
cd mobile
flutter test test/widgets test/screens
```

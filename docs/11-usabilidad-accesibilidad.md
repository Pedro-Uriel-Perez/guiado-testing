# 11. Usabilidad y accesibilidad

## Verificaciones automáticas (`mobile/test/accessibility_test.dart`)

| Checklist del tutorial | Cómo se verifica | Estado |
|---|---|---|
| Contraste suficiente | `meetsGuideline(textContrastGuideline)` en login y lista | ✅ |
| Botones y campos con nombre accesible | `labeledTapTargetGuideline`; tooltips semánticos en los botones de ícono ("Agregar tarea", "Cerrar sesión", "Eliminar …"); casillas con `semanticLabel` | ✅ |
| Lector de pantalla anuncia título, estado y errores | Cada fila tiene título + subtítulo "Pendiente"/"Completada"; el error de login usa `Semantics(liveRegion: true)` | ✅ automático / ⬜ manual |
| Usable con texto grande | Lista a escala 1.5× y 2.0× sin overflow | ✅ |
| Áreas táctiles fáciles | `androidTapTargetGuideline` (48 dp) e `iOSTapTargetGuideline` (44 pt) | ✅ |
| Errores explican cómo recuperarse | "Escribe un título.", "La contraseña debe tener entre 8 y 128 caracteres.", botón "Reintentar" | ✅ |
| El color no es la única señal | Completada = tachado + casilla marcada + texto "Completada" | ✅ |
| Teclado / switch | Campos con `textInputAction` y envío con Enter | ✅ parcial |

## Hallazgo durante las pruebas

La primera versión de la prueba buscaba "Agregar tarea" como `label` semántico y falló. Flutter expone el `tooltip` de un botón de ícono como propiedad semántica `tooltip`, no como `label`. Es justo lo que anuncian TalkBack y VoiceOver, así que **la prueba estaba mal, no la app**. Se corrigió para verificar `isSemantics(tooltip: …, isButton: true)`.

## Ejercicio manual (pendiente de dispositivo)

> Activa el lector de pantalla y texto grande. Crea una tarea, provoca un error de validación y anota controles sin etiqueta o cortados.

| Paso | TalkBack (Android) | VoiceOver (iOS) |
|---|---|---|
| Anuncia "Correo electrónico", "Contraseña", "Iniciar sesión" | ⬜ | ⬜ |
| Anuncia "Agregar tarea, botón" | ⬜ | ⬜ |
| Al guardar en blanco anuncia "Escribe un título." | ⬜ | ⬜ |
| Con texto al 200 % no hay controles cortados | ⬜ | ⬜ |
| Observaciones | | |

Las guías automáticas de Flutter detectan muchos problemas, pero no sustituyen escuchar la app con un lector de pantalla real.

import 'package:flutter/material.dart';

import '../models/task.dart';

/// Muestra las tareas o el estado actual: cargando, vacío o error.
///
/// No hace peticiones: recibe el estado y los callbacks, así cada estado se
/// prueba sin API real (sección 5 del tutorial).
class TaskListPanel extends StatelessWidget {
  /// Crea el panel.
  const TaskListPanel({
    super.key,
    required this.loading,
    required this.tasks,
    this.errorMessage,
    this.onRetry,
    this.onToggle,
    this.onEdit,
    this.onDelete,
  });

  /// Si se están cargando las tareas.
  final bool loading;

  /// Tareas a mostrar.
  final List<Task> tasks;

  /// Mensaje de error seguro, si lo hay.
  final String? errorMessage;

  /// Se llama al tocar "Reintentar" en el estado de error.
  final VoidCallback? onRetry;

  /// Se llama al marcar o desmarcar una tarea.
  final void Function(Task task, bool completed)? onToggle;

  /// Se llama al tocar una tarea para editarla.
  final void Function(Task task)? onEdit;

  /// Se llama al tocar el botón de borrar.
  final void Function(Task task)? onDelete;

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(
        child: CircularProgressIndicator(semanticsLabel: 'Cargando tareas'),
      );
    }
    if (errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48),
              const SizedBox(height: 12),
              Text(errorMessage!, textAlign: TextAlign.center),
              if (onRetry != null) ...[
                const SizedBox(height: 16),
                FilledButton.icon(
                  key: const Key('retry-button'),
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Reintentar'),
                ),
              ],
            ],
          ),
        ),
      );
    }
    if (tasks.isEmpty) {
      return const Center(child: Text('Aún no hay tareas.'));
    }
    return ListView(
      padding: const EdgeInsets.only(bottom: 88), // espacio para el botón flotante
      children: [for (final task in tasks) _TaskTile(task: task, panel: this)],
    );
  }
}

class _TaskTile extends StatelessWidget {
  const _TaskTile({required this.task, required this.panel});

  final Task task;
  final TaskListPanel panel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      key: Key('task-tile-${task.id}'),
      leading: Checkbox(
        key: Key('task-checkbox-${task.id}'),
        value: task.completed,
        semanticLabel: task.completed
            ? 'Marcar "${task.title}" como pendiente'
            : 'Marcar "${task.title}" como completada',
        onChanged: panel.onToggle == null
            ? null
            : (value) => panel.onToggle!(task, value ?? false),
      ),
      title: Text(
        task.title,
        style: task.completed
            ? theme.textTheme.bodyLarge?.copyWith(
                decoration: TextDecoration.lineThrough,
              )
            : null,
      ),
      // El estado no depende solo del color o del tachado: también hay texto.
      subtitle: Text(task.completed ? 'Completada' : 'Pendiente'),
      onTap: panel.onEdit == null ? null : () => panel.onEdit!(task),
      trailing: panel.onDelete == null
          ? null
          : IconButton(
              key: Key('delete-task-${task.id}'),
              tooltip: 'Eliminar "${task.title}"',
              icon: const Icon(Icons.delete_outline),
              onPressed: () => panel.onDelete!(task),
            ),
    );
  }
}

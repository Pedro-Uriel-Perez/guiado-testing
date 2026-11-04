import 'package:flutter/material.dart';

import '../models/task.dart';
import '../services/api_client.dart';
import '../validators.dart';
import '../widgets/task_list_panel.dart';

/// Pantalla principal: lista, crea, edita, completa y borra tareas.
class TaskListScreen extends StatefulWidget {
  /// Crea la pantalla.
  const TaskListScreen({super.key, required this.api, required this.onSignedOut});

  /// API a usar.
  final TaskManagerApi api;

  /// Se llama al cerrar sesión o cuando la sesión expira.
  final VoidCallback onSignedOut;

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen> {
  bool _loading = true;
  String? _error;
  List<Task> _tasks = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final tasks = await widget.api.fetchTasks();
      if (mounted) setState(() => _tasks = tasks);
    } on SessionExpiredException {
      widget.onSignedOut();
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Ejecuta una operación y muestra un aviso si falla, sin perder el estado actual.
  Future<T?> _guard<T>(Future<T> Function() action) async {
    try {
      return await action();
    } on SessionExpiredException {
      widget.onSignedOut();
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
    return null;
  }

  Future<void> _addTask() async {
    final created = await showDialog<Task>(
      context: context,
      builder: (_) => _TaskDialog(
        title: 'Nueva tarea',
        onSave: (title) => widget.api.createTask(title),
      ),
    );
    if (created != null && mounted) {
      setState(() => _tasks = [created, ..._tasks]);
    }
  }

  Future<void> _editTask(Task task) async {
    final updated = await showDialog<Task>(
      context: context,
      builder: (_) => _TaskDialog(
        title: 'Editar tarea',
        initialValue: task.title,
        onSave: (title) => widget.api.updateTask(task.id, title: title),
      ),
    );
    if (updated != null && mounted) _replace(updated);
  }

  Future<void> _toggle(Task task, bool completed) async {
    final updated = await _guard(
      () => widget.api.updateTask(task.id, completed: completed),
    );
    if (updated != null && mounted) _replace(updated);
  }

  Future<void> _delete(Task task) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Eliminar tarea?'),
        content: Text('Se eliminará "${task.title}".'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            key: const Key('confirm-delete-button'),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final ok = await _guard(() async {
      await widget.api.deleteTask(task.id);
      return true;
    });
    if (ok == true && mounted) {
      setState(() => _tasks = _tasks.where((t) => t.id != task.id).toList());
    }
  }

  void _replace(Task updated) {
    setState(() {
      _tasks = [for (final t in _tasks) t.id == updated.id ? updated : t];
    });
  }

  Future<void> _logout() async {
    await widget.api.logout();
    widget.onSignedOut();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis tareas'),
        actions: [
          IconButton(
            key: const Key('logout-button'),
            tooltip: 'Cerrar sesión',
            icon: const Icon(Icons.logout),
            onPressed: _logout,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: TaskListPanel(
          loading: _loading,
          tasks: _tasks,
          errorMessage: _error,
          onRetry: _load,
          onToggle: _toggle,
          onEdit: _editTask,
          onDelete: _delete,
        ),
      ),
      floatingActionButton: FloatingActionButton(
        key: const Key('add-task-button'),
        tooltip: 'Agregar tarea',
        onPressed: _loading ? null : _addTask,
        child: const Icon(Icons.add),
      ),
    );
  }
}

/// Diálogo para crear o editar. Valida igual que la API y bloquea toques repetidos.
class _TaskDialog extends StatefulWidget {
  const _TaskDialog({
    required this.title,
    required this.onSave,
    this.initialValue = '',
  });

  final String title;
  final String initialValue;
  final Future<Task> Function(String title) onSave;

  @override
  State<_TaskDialog> createState() => _TaskDialogState();
}

class _TaskDialogState extends State<_TaskDialog> {
  late final TextEditingController _controller =
      TextEditingController(text: widget.initialValue);
  bool _saving = false;
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_saving) return;
    final validation = validateTitle(_controller.text);
    if (validation != null) {
      setState(() => _error = validation);
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final task = await widget.onSave(_controller.text.trim());
      if (mounted) Navigator.of(context).pop(task);
    } on ApiException catch (error) {
      // El texto escrito se conserva para no perder datos (charter de exploración).
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: TextField(
        key: const Key('task-title-field'),
        controller: _controller,
        autofocus: true,
        maxLength: titleMaxLength,
        decoration: InputDecoration(
          labelText: 'Título',
          errorText: _error,
        ),
        textInputAction: TextInputAction.done,
        onSubmitted: (_) => _save(),
      ),
      actions: [
        TextButton(
          key: const Key('cancel-task-button'),
          onPressed: _saving ? null : () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          key: const Key('save-task-button'),
          onPressed: _saving ? null : _save,
          child: const Text('Guardar'),
        ),
      ],
    );
  }
}

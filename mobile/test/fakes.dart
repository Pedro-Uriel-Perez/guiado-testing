import 'dart:async';

import 'package:task_manager/src/models/task.dart';
import 'package:task_manager/src/services/api_client.dart';

/// Doble de prueba de la API: guarda tareas en memoria y cuenta llamadas.
/// Permite simular fallas y respuestas lentas sin red.
class FakeTaskManagerApi implements TaskManagerApi {
  FakeTaskManagerApi({List<Task>? tasks, this.signedIn = false})
      : tasks = [...?tasks];

  final List<Task> tasks;
  bool signedIn;

  /// Si no es null, la siguiente llamada que lo consulte lanza este error.
  ApiException? fetchError;
  ApiException? mutationError;
  ApiException? loginError;

  /// Si no es null, createTask espera a que se complete (simula red lenta).
  Completer<void>? createGate;

  int fetchCalls = 0;
  int createCalls = 0;
  int updateCalls = 0;
  int deleteCalls = 0;
  int logoutCalls = 0;
  final List<String> loginAttempts = [];
  int _nextId = 1;

  @override
  Future<bool> restoreSession() async => signedIn;

  @override
  Future<void> login(String email, String password) async {
    loginAttempts.add(email);
    if (loginError != null) throw loginError!;
    signedIn = true;
  }

  @override
  Future<void> register(String email, String password) => login(email, password);

  @override
  Future<void> logout() async {
    logoutCalls++;
    signedIn = false;
  }

  @override
  Future<List<Task>> fetchTasks() async {
    fetchCalls++;
    final error = fetchError;
    if (error != null) {
      fetchError = null;
      throw error;
    }
    return List.of(tasks);
  }

  @override
  Future<Task> createTask(String title) async {
    createCalls++;
    if (createGate != null) await createGate!.future;
    if (mutationError != null) throw mutationError!;
    final task = Task(id: 'task-${_nextId++}', title: title);
    tasks.insert(0, task);
    return task;
  }

  @override
  Future<Task> updateTask(String id, {String? title, bool? completed}) async {
    updateCalls++;
    if (mutationError != null) throw mutationError!;
    final index = tasks.indexWhere((t) => t.id == id);
    final updated = tasks[index].copyWith(title: title, completed: completed);
    tasks[index] = updated;
    return updated;
  }

  @override
  Future<void> deleteTask(String id) async {
    deleteCalls++;
    if (mutationError != null) throw mutationError!;
    tasks.removeWhere((t) => t.id == id);
  }
}

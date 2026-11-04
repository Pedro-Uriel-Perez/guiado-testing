/// Una tarea del usuario tal como la devuelve la API.
class Task {
  /// Crea una tarea.
  const Task({required this.id, required this.title, this.completed = false});

  /// Identificador único del servidor.
  final String id;

  /// Título visible para el usuario.
  final String title;

  /// Si la tarea está marcada como completada.
  final bool completed;

  /// Convierte un objeto JSON en una tarea.
  ///
  /// Lanza [FormatException] cuando faltan campos obligatorios o son inválidos.
  factory Task.fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    final title = json['title'];
    final completed = json['completed'] ?? false;

    if (id is! String ||
        id.isEmpty ||
        title is! String ||
        title.trim().isEmpty ||
        completed is! bool) {
      throw const FormatException('Invalid task data.');
    }

    return Task(id: id, title: title, completed: completed);
  }

  /// Devuelve una copia con los campos indicados reemplazados.
  Task copyWith({String? title, bool? completed}) => Task(
        id: id,
        title: title ?? this.title,
        completed: completed ?? this.completed,
      );

  @override
  bool operator ==(Object other) =>
      other is Task &&
      other.id == id &&
      other.title == title &&
      other.completed == completed;

  @override
  int get hashCode => Object.hash(id, title, completed);

  @override
  String toString() => 'Task($id, $title, completed: $completed)';
}

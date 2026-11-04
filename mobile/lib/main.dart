import 'package:flutter/material.dart';

import 'src/app.dart';
import 'src/config.dart';
import 'src/services/api_client.dart';
import 'src/services/token_storage.dart';

void main() => runTaskManager();

/// Arranca la app. Las pruebas end-to-end pasan un [storage] en memoria para que
/// cada corrida empiece sin sesión previa en el dispositivo.
void runTaskManager({TokenStorage? storage, String baseUrl = apiBaseUrl}) {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(TaskManagerApp(api: ApiClient(baseUrl: baseUrl, storage: storage)));
}

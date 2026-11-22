import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/notificacion_mesa_model.dart';
import 'auth_repository.dart' show baseUrl;

class NotificacionRepository {
  Future<Map<String, String>> _headers() async {
    final prefs = await SharedPreferences.getInstance();
    return {'Authorization': 'Bearer ${prefs.getString('token') ?? ''}'};
  }

  Future<List<NotificacionMesa>> listar() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/notificaciones'),
      headers: await _headers(),
    );
    if (response.statusCode != 200) {
      throw Exception('No se pudieron cargar las alertas.');
    }
    final List<dynamic> data = jsonDecode(response.body);
    return data.map((e) => NotificacionMesa.fromJson(e)).toList();
  }

  Future<void> atender(int id) async {
    final response = await http.put(
      Uri.parse('$baseUrl/api/notificaciones/$id/atender'),
      headers: await _headers(),
    );
    if (response.statusCode != 200) {
      throw Exception('No se pudo marcar la alerta como atendida.');
    }
  }
}

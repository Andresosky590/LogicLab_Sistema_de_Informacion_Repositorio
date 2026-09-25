import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/menu_dia_model.dart';
import 'auth_repository.dart' show baseUrl;

class MenuDiaException implements Exception {
  final String message;
  MenuDiaException(this.message);

  @override
  String toString() => message;
}

class MenuDiaRepository {
  Future<Map<String, String>> _headersConToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? "";
    return {
      "Authorization": "Bearer $token",
      "Content-Type": "application/json",
    };
  }

  // GET /api/menu-dia/hoy — pública (la consulta también VistaCliente en
  // la web sin login). Devuelve null si el admin no ha publicado hoy.
  Future<MenuDia?> obtenerMenuHoy() async {
    late http.Response response;
    try {
      response = await http.get(Uri.parse("$baseUrl/api/menu-dia/hoy"));
    } catch (e) {
      throw MenuDiaException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw MenuDiaException("No se pudo cargar el menú del día.");
    }
    if (response.body == "null" || response.body.trim().isEmpty) {
      return null;
    }
    final data = jsonDecode(response.body);
    if (data == null) return null;
    return MenuDia.fromJson(data);
  }

  // POST /api/menu-dia/publicar
  // items: cada uno con { id_Platos, categoria, nombreItem }.
  // Para la Corriente del Día: id_Platos = 9999, nombreItem = descripción armada.
  // Para un plato real: id_Platos real, categoria = id_Categoria, nombreItem = NombrePlato.
  Future<void> publicarMenu({
    required double precio,
    required List<Map<String, dynamic>> items,
  }) async {
    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.post(
        Uri.parse("$baseUrl/api/menu-dia/publicar"),
        headers: headers,
        body: jsonEncode({"precio": precio, "items": items}),
      );
    } catch (e) {
      throw MenuDiaException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 201) {
      final data = _tryDecode(response.body);
      throw MenuDiaException(
        data?['message'] ?? "No se pudo publicar el menú del día.",
      );
    }
  }

  // PUT /api/menu-dia/desactivar
  Future<void> desactivarMenu() async {
    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.put(
        Uri.parse("$baseUrl/api/menu-dia/desactivar"),
        headers: headers,
      );
    } catch (e) {
      throw MenuDiaException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw MenuDiaException("No se pudo desactivar el menú del día.");
    }
  }

  Map<String, dynamic>? _tryDecode(String body) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return null;
    }
  }
}
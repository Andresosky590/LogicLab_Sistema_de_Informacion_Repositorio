import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/mesa_model.dart';
import '../models/menu_dia_model.dart';
import '../models/pedido_model.dart';
import '../models/pqrsf_model.dart';
import 'auth_repository.dart' show baseUrl;

class AdminException implements Exception {
  final String message;
  AdminException(this.message);
}

class AdminRepository {
  Future<Map<String, String>> _headersConToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? "";
    return {"Authorization": "Bearer $token"};
  }

  // GET /api/pedidos/listar — requiere token (igual que en la web, usado
  // para calcular pedidos de hoy, ganancias y entregados).
  Future<List<Pedido>> obtenerPedidos() async {
    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.get(
        Uri.parse("$baseUrl/api/pedidos/listar"),
        headers: headers,
      );
    } catch (e) {
      throw AdminException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw AdminException("No se pudieron cargar los pedidos.");
    }
    final List<dynamic> data = jsonDecode(response.body);
    return data.map((e) => Pedido.fromJson(e)).toList();
  }

  // GET /api/mesas/listar — pública, la reutilizamos para el % de ocupación.
  Future<List<Mesa>> obtenerMesas() async {
    late http.Response response;
    try {
      response = await http.get(Uri.parse("$baseUrl/api/mesas/listar"));
    } catch (e) {
      throw AdminException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw AdminException("No se pudieron cargar las mesas.");
    }
    final List<dynamic> data = jsonDecode(response.body);
    return data.map((e) => Mesa.fromJson(e)).toList();
  }

  // GET /api/pqrsf/listar — requiere token.
  Future<List<Pqrsf>> obtenerPqrsf() async {
    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.get(
        Uri.parse("$baseUrl/api/pqrsf/listar"),
        headers: headers,
      );
    } catch (e) {
      throw AdminException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw AdminException("No se pudieron cargar los PQRSF.");
    }
    final List<dynamic> data = jsonDecode(response.body);
    return data.map((e) => Pqrsf.fromJson(e)).toList();
  }

  // GET /api/menu-dia/hoy — pública. A diferencia de la web (que en el
  // dashboard lee un caché en localStorage), aquí consultamos siempre el
  // backend directamente: no hay una pantalla previa que "deje guardado"
  // el menú, así que esta es la fuente confiable en el celular.
  Future<MenuDia?> obtenerMenuHoy() async {
    late http.Response response;
    try {
      response = await http.get(Uri.parse("$baseUrl/api/menu-dia/hoy"));
    } catch (e) {
      throw AdminException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw AdminException("No se pudo cargar el menú del día.");
    }
    if (response.body == "null" || response.body.isEmpty) return null;
    final data = jsonDecode(response.body);
    if (data == null) return null;
    return MenuDia.fromJson(data);
  }
}

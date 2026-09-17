import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/mesa_model.dart';
import '../models/pedido_mesero_model.dart';
import 'auth_repository.dart' show baseUrl;

class MeseroException implements Exception {
  final String message;
  MeseroException(this.message);
}

class MeseroRepository {
  Future<Map<String, String>> _headersConToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? "";
    return {"Authorization": "Bearer $token"};
  }

  // Id del mesero autenticado, guardado en el login (auth_controller.dart).
  Future<int?> obtenerIdUsuario() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt('usuarioId');
  }

  Future<String> obtenerNombreUsuario() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('usuarioNombre') ?? "Mesero";
  }

  // GET /api/mesas/listar — pública. Misma lista que usa Panel_Mesero.jsx
  // para pintar el grid de mesas.
  Future<List<Mesa>> obtenerMesas() async {
    late http.Response response;
    try {
      response = await http.get(Uri.parse("$baseUrl/api/mesas/listar"));
    } catch (e) {
      throw MeseroException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw MeseroException("No se pudieron cargar las mesas.");
    }
    final List<dynamic> data = jsonDecode(response.body);
    return data.map((e) => Mesa.fromJson(e)).toList();
  }

  // GET /api/pedidos/mesero/:idUsuario — requiere token. Es el mismo
  // endpoint que alimenta el historial del sidebar en la web
  // (LayoutMesero en Panel_Mesero.jsx).
  Future<List<PedidoMesero>> obtenerPedidos() async {
    final idUsuario = await obtenerIdUsuario();
    if (idUsuario == null) {
      throw MeseroException("Sesión inválida. Vuelve a iniciar sesión.");
    }

    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.get(
        Uri.parse("$baseUrl/api/pedidos/mesero/$idUsuario"),
        headers: headers,
      );
    } catch (e) {
      throw MeseroException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw MeseroException("No se pudo cargar el historial de pedidos.");
    }
    final List<dynamic> data = jsonDecode(response.body);
    return data.map((e) => PedidoMesero.fromJson(e)).toList();
  }
}

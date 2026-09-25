import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/pedido_cocina_model.dart';
import 'auth_repository.dart' show baseUrl;

class CocinaException implements Exception {
  final String message;
  CocinaException(this.message);

  // Sin esto, mostrar el error en pantalla imprime
  // "Instance of 'CocinaException'" en vez del mensaje real.
  @override
  String toString() => message;
}

class CocinaRepository {
  Future<Map<String, String>> _headersConToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? "";
    return {"Authorization": "Bearer $token"};
  }

  Future<String> obtenerNombreCompleto() async {
    final prefs = await SharedPreferences.getInstance();
    final nombre = prefs.getString('usuarioNombre') ?? "";
    final apellido = prefs.getString('usuarioApellido') ?? "";
    final completo = "$nombre $apellido".trim();
    return completo.isEmpty ? "Cocinero" : completo;
  }

  // GET /api/pedidos/estado/:estado — requiere token. Es el mismo
  // endpoint que usa Panel_Cocinero.jsx para pintar las órdenes por
  // preparar (aquí solo lo usamos para contar, no para el detalle).
  Future<List<PedidoCocina>> obtenerPedidosPorEstado(String estado) async {
    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.get(
        Uri.parse("$baseUrl/api/pedidos/estado/$estado"),
        headers: headers,
      );
    } catch (e) {
      throw CocinaException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw CocinaException("No se pudieron cargar los pedidos de $estado.");
    }
    final List<dynamic> data = jsonDecode(response.body);
    return data.map((e) => PedidoCocina.fromJson(e)).toList();
  }

  // PUT /api/pedidos/estado/:id — igual que "Marcar como listo" en
  // Panel_Cocinero.jsx.
  Future<void> marcarComoListo(int idPedido) async {
    final headers = await _headersConToken();
    headers["Content-Type"] = "application/json";
    late http.Response response;
    try {
      response = await http.put(
        Uri.parse("$baseUrl/api/pedidos/estado/$idPedido"),
        headers: headers,
        body: jsonEncode({"estado": "listo"}),
      );
    } catch (e) {
      throw CocinaException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw CocinaException("No se pudo actualizar el pedido.");
    }
  }
}

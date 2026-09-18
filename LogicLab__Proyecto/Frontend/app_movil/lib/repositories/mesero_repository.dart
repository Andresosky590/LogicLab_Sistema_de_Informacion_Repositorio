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
  // HU02: Obtener el menú del día desde el backend
  Future<List<dynamic>> obtenerMenuDelDia() async {
    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.get(
        Uri.parse(
          "$baseUrl/api/menu/dia",
        ), // Ajusta la ruta según tu API de Node.js
        headers: headers,
      );
    } catch (e) {
      throw MeseroException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw MeseroException("No se pudo cargar el menú del día.");
    }
    return jsonDecode(response.body);
  }

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
// ==========================================
// NUEVOS MÉTODOS PARA EL SPRINT 2 (HU09, HU10, HU16)
// ==========================================

// HU09: Cerrar cuenta y registrar método de pago
// POST /api/pedidos/:id/cerrar-cuenta (o la ruta que maneje tu backend)
Future<void> cerrarCuenta(int idPedido, String metodoPago) async {
  final headers = await _headersConToken();
  headers['Content-Type'] = 'application/json';

  late http.Response response;
  try {
    response = await http.post(
      Uri.parse("$baseUrl/api/pedidos/$idPedido/cerrar-cuenta"),
      headers: headers,
      body: jsonEncode({'metodo_pago': metodoPago}),
    );
  } catch (e) {
    throw MeseroException("No se pudo conectar con el servidor.");
  }

  if (response.statusCode != 200 && response.statusCode != 201) {
    final errorData = jsonDecode(response.body);
    throw MeseroException(
      errorData['message'] ?? "No se pudo cerrar la cuenta.",
    );
  }
}

// HU10: Cancelar pedido
// PUT o PATCH /api/pedidos/:id/cancelar
Future<void> cancelarPedido(int idPedido, String motivo) async {
  final headers = await _headersConToken();
  headers['Content-Type'] = 'application/json';

  late http.Response response;
  try {
    response = await http.put(
      Uri.parse("$baseUrl/api/pedidos/$idPedido/cancelar"),
      headers: headers,
      body: jsonEncode({'motivo': motivo}),
    );
  } catch (e) {
    throw MeseroException("No se pudo conectar con el servidor.");
  }

  if (response.statusCode != 200) {
    final errorData = jsonDecode(response.body);
    throw MeseroException(
      errorData['message'] ?? "No se pudo cancelar el pedido.",
    );
  }
}

// HU16: Modificar pedido
// PUT /api/pedidos/:id/modificar
Future<void> modificarPedido(
  int idPedido,
  List<Map<String, dynamic>> nuevosItems,
) async {
  final headers = await _headersConToken();
  headers['Content-Type'] = 'application/json';

  late http.Response response;
  try {
    response = await http.put(
      Uri.parse("$baseUrl/api/pedidos/$idPedido/modificar"),
      headers: headers,
      body: jsonEncode({'items': nuevosItems}),
    );
  } catch (e) {
    throw MeseroException("No se pudo conectar con el servidor.");
  }

  if (response.statusCode != 200) {
    final errorData = jsonDecode(response.body);
    throw MeseroException(
      errorData['message'] ?? "No se pudo modificar el pedido.",
    );
  }
}

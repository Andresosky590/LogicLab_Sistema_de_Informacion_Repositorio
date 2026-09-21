import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/mesa_model.dart';
import '../models/pedido_mesero_model.dart';
import 'auth_repository.dart' show baseUrl;

class MeseroException implements Exception {
  final String message;
  MeseroException(this.message);

  @override
  String toString() => message;
}

// Los 8 métodos válidos que acepta cerrarCuenta en el backend — mismo
// listado que valida PedidoController.cerrarCuenta, así que se deja
// fijo acá en vez de pedirlo por red.
const List<String> metodosPagoCierre = [
  "Efectivo",
  "Tarjeta",
  "Transferencia",
  "Nequi",
  "Daviplata",
  "PSE",
  "Tarjeta crédito",
  "Tarjeta débito",
];

class MeseroRepository {
  Future<Map<String, String>> _headers({bool conJson = false}) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? "";
    final h = {"Authorization": "Bearer $token"};
    if (conJson) h["Content-Type"] = "application/json";
    return h;
  }

  Future<int?> obtenerIdUsuario() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getInt('usuarioId');
  }

  // GET /api/mesas/listar — pública.
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

  // GET /api/metodo-pago/listar — todos los métodos (id + nombre), para
  // el selector de HU23 (distinto del listado de nombres de cerrarCuenta).
  Future<List<Map<String, dynamic>>> obtenerMetodosPago() async {
    final headers = await _headers();
    late http.Response response;
    try {
      response = await http.get(
        Uri.parse("$baseUrl/api/metodo-pago/listar"),
        headers: headers,
      );
    } catch (e) {
      throw MeseroException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw MeseroException("No se pudieron cargar los métodos de pago.");
    }
    final List<dynamic> data = jsonDecode(response.body);
    return data.cast<Map<String, dynamic>>();
  }

  // GET /api/platos/listar — requiere token.
  Future<List<Map<String, dynamic>>> obtenerPlatos() async {
    final headers = await _headers();
    late http.Response response;
    try {
      response = await http.get(
        Uri.parse("$baseUrl/api/platos/listar"),
        headers: headers,
      );
    } catch (e) {
      throw MeseroException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw MeseroException("No se pudieron cargar los platos.");
    }
    final List<dynamic> data = jsonDecode(response.body);
    return data.cast<Map<String, dynamic>>();
  }

  // PUT /api/mesas/estado/:id — "Liberar mesa" (marcarla disponible de nuevo).
  Future<void> liberarMesa(int idMesa) async {
    final headers = await _headers(conJson: true);
    late http.Response response;
    try {
      response = await http.put(
        Uri.parse("$baseUrl/api/mesas/estado/$idMesa"),
        headers: headers,
        body: jsonEncode({"estado": "disponible"}),
      );
    } catch (e) {
      throw MeseroException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw MeseroException("No se pudo liberar la mesa.");
    }
  }

  // GET /api/pedidos/mesero/:idUsuario — historial propio (HU08).
  Future<List<PedidoMesero>> obtenerMisPedidos() async {
    final idUsuario = await obtenerIdUsuario();
    if (idUsuario == null) {
      throw MeseroException("Sesión inválida. Vuelve a iniciar sesión.");
    }
    final headers = await _headers();
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

  // GET /api/pedidos/estado/:estado — colas de pendiente/preparando/listo.
  Future<List<PedidoMesero>> obtenerPorEstado(String estado) async {
    final headers = await _headers();
    late http.Response response;
    try {
      response = await http.get(
        Uri.parse("$baseUrl/api/pedidos/estado/$estado"),
        headers: headers,
      );
    } catch (e) {
      throw MeseroException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw MeseroException("No se pudieron cargar los pedidos.");
    }
    final List<dynamic> data = jsonDecode(response.body);
    return data.map((e) => PedidoMesero.fromJson(e)).toList();
  }

  // PUT /api/pedidos/asignar/:id — "Tomar pedido" (reclamar un pedido
  // de cliente para atenderlo).
  Future<void> tomarPedido(int idPedido) async {
    final idUsuario = await obtenerIdUsuario();
    if (idUsuario == null) {
      throw MeseroException("Sesión inválida. Vuelve a iniciar sesión.");
    }
    final headers = await _headers(conJson: true);
    late http.Response response;
    try {
      response = await http.put(
        Uri.parse("$baseUrl/api/pedidos/asignar/$idPedido"),
        headers: headers,
        body: jsonEncode({"idUsuario": idUsuario}),
      );
    } catch (e) {
      throw MeseroException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw MeseroException("No se pudo tomar el pedido.");
    }
  }

  // PUT /api/pedidos/estado/:id — mover el pedido de estado (usado para
  // "Enviar a cocina" (pendiente → preparando) y "Entregar" (listo → entregado)).
  Future<void> cambiarEstadoPedido(int idPedido, String nuevoEstado) async {
    final headers = await _headers(conJson: true);
    late http.Response response;
    try {
      response = await http.put(
        Uri.parse("$baseUrl/api/pedidos/estado/$idPedido"),
        headers: headers,
        body: jsonEncode({"estado": nuevoEstado}),
      );
    } catch (e) {
      throw MeseroException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw MeseroException("No se pudo actualizar el estado del pedido.");
    }
  }

  // PUT /api/pedidos/cancelar/:id
  Future<void> cancelarPedido(int idPedido, String motivo) async {
    final headers = await _headers(conJson: true);
    late http.Response response;
    try {
      response = await http.put(
        Uri.parse("$baseUrl/api/pedidos/cancelar/$idPedido"),
        headers: headers,
        body: jsonEncode({"motivo": motivo, "esMesero": true}),
      );
    } catch (e) {
      throw MeseroException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      final data = _tryDecode(response.body);
      throw MeseroException(
        data?['message'] ?? "No se pudo cancelar el pedido.",
      );
    }
  }

  // PUT /api/pedidos/modificar/:id
  Future<void> modificarPedido(
    int idPedido,
    List<Map<String, dynamic>> items,
  ) async {
    final headers = await _headers(conJson: true);
    late http.Response response;
    try {
      response = await http.put(
        Uri.parse("$baseUrl/api/pedidos/modificar/$idPedido"),
        headers: headers,
        body: jsonEncode({"items": items}),
      );
    } catch (e) {
      throw MeseroException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      final data = _tryDecode(response.body);
      throw MeseroException(
        data?['message'] ?? "No se pudo modificar el pedido.",
      );
    }
  }

  // PUT /api/pedidos/cuenta/:id — HU09, cerrar cuenta con el método de
  // pago con el que el cliente pagó en persona.
  Future<void> cerrarCuenta(int idPedido, String metodoPago) async {
    final headers = await _headers(conJson: true);
    late http.Response response;
    try {
      response = await http.put(
        Uri.parse("$baseUrl/api/pedidos/cuenta/$idPedido"),
        headers: headers,
        body: jsonEncode({"metodoPago": metodoPago}),
      );
    } catch (e) {
      throw MeseroException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      final data = _tryDecode(response.body);
      throw MeseroException(data?['message'] ?? "No se pudo cerrar la cuenta.");
    }
  }

  // POST /api/pedidos/crear — HU23, pedido asistido.
  Future<void> crearPedidoAsistido({
    required int idMesa,
    required double totalPagar,
    required List<Map<String, dynamic>> items,
    required int idMetodoPago,
  }) async {
    final headers = await _headers(conJson: true);
    late http.Response response;
    try {
      response = await http.post(
        Uri.parse("$baseUrl/api/pedidos/crear"),
        headers: headers,
        body: jsonEncode({
          "idMesa": idMesa,
          "totalPagar": totalPagar,
          "items": items,
          "idMetodoPago": idMetodoPago,
        }),
      );
    } catch (e) {
      throw MeseroException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 201) {
      final data = _tryDecode(response.body);
      throw MeseroException(data?['message'] ?? "No se pudo enviar el pedido.");
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

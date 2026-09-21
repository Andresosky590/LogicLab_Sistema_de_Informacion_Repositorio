import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/mesa_model.dart';
import '../models/pedido_cliente_model.dart';
import 'auth_repository.dart' show baseUrl;

class ClienteException implements Exception {
  final String message;
  ClienteException(this.message);

  @override
  String toString() => message;
}

// A diferencia de los demás repositorios, este NO manda token —
// el cliente no inicia sesión, y los dos endpoints que usa
// (/api/mesas/qr/:token y /api/pedidos/mesa/:numero) son públicos
// a propósito, para que cualquiera con el QR pueda usarlos.
class ClienteRepository {
  // GET /api/mesas/qr/:token — resuelve el token del QR a una mesa real.
  Future<Mesa> resolverMesaPorToken(String token) async {
    late http.Response response;
    try {
      response = await http.get(Uri.parse("$baseUrl/api/mesas/qr/$token"));
    } catch (e) {
      throw ClienteException("No se pudo conectar con el servidor.");
    }

    if (response.statusCode == 404) {
      throw ClienteException("Este código QR no es válido o ya no existe.");
    }
    if (response.statusCode != 200) {
      throw ClienteException("No se pudo leer el código QR.");
    }

    return Mesa.fromJson(jsonDecode(response.body));
  }

  // GET /api/pedidos/mesa/:numero — pedidos activos (no cancelados)
  // de esa mesa. Normalmente 0 o 1, pero el backend devuelve una lista.
  Future<List<PedidoCliente>> obtenerPedidosActivos(int numeroMesa) async {
    late http.Response response;
    try {
      response = await http.get(
        Uri.parse("$baseUrl/api/pedidos/mesa/$numeroMesa"),
      );
    } catch (e) {
      throw ClienteException("No se pudo conectar con el servidor.");
    }

    if (response.statusCode != 200) {
      throw ClienteException("No se pudo consultar el estado del pedido.");
    }

    final List<dynamic> data = jsonDecode(response.body);
    return data
        .whereType<Map<String, dynamic>>()
        .map(PedidoCliente.fromJson)
        .toList();
  }
}

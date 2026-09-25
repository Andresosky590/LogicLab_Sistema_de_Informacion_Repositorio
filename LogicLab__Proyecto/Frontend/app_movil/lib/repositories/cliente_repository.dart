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
// el cliente no inicia sesión, y los endpoints que usa son públicos
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

  // POST /api/pedidos/crear — sin idMetodoPago (a diferencia del
  // mesero): el cliente todavía no eligió cómo pagar, el pedido nace
  // con EstadoPago "pendiente" hasta que pase por la pasarela.
  // Devuelve el id del pedido recién creado.
  Future<int> crearPedido({
    required int idMesa,
    required double totalPagar,
    required List<Map<String, dynamic>> items,
  }) async {
    late http.Response response;
    try {
      response = await http.post(
        Uri.parse("$baseUrl/api/pedidos/crear"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "idMesa": idMesa,
          "totalPagar": totalPagar,
          "items": items,
        }),
      );
    } catch (e) {
      throw ClienteException("No se pudo conectar con el servidor.");
    }

    if (response.statusCode != 201) {
      final data = _tryDecode(response.body);
      throw ClienteException(data?['message'] ?? "No se pudo crear el pedido.");
    }

    final data = jsonDecode(response.body);
    final idPedido = data['idPedido'];
    if (idPedido == null) {
      throw ClienteException("El servidor no devolvió el id del pedido.");
    }
    return idPedido as int;
  }

  // GET /api/metodo-pago/online — solo los métodos que el cliente
  // puede pagar él mismo (Nequi, Daviplata, PSE, tarjetas). Los
  // presenciales (Efectivo/Tarjeta/Transferencia) son cosa del
  // mesero al cerrar la cuenta, no de acá.
  Future<List<Map<String, dynamic>>> obtenerMetodosPagoOnline() async {
    late http.Response response;
    try {
      response = await http.get(Uri.parse("$baseUrl/api/metodo-pago/online"));
    } catch (e) {
      throw ClienteException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw ClienteException("No se pudieron cargar los métodos de pago.");
    }
    final List<dynamic> data = jsonDecode(response.body);
    return data.cast<Map<String, dynamic>>();
  }

  // PUT /api/pedidos/simular-pago/:id
  //
  // Si el backend rechaza el pago (datos inválidos, tarjeta vencida,
  // etc.) responde 400, así que ese caso siempre lanza ClienteException
  // — igual que en la web, no hay un "resultado: rechazado" en el 200.
  Future<void> simularPago({
    required int idPedido,
    required int idMetodoPago,
    required Map<String, dynamic> datos,
  }) async {
    late http.Response response;
    try {
      response = await http.put(
        Uri.parse("$baseUrl/api/pedidos/simular-pago/$idPedido"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"idMetodoPago": idMetodoPago, "datos": datos}),
      );
    } catch (e) {
      throw ClienteException("No se pudo conectar con el servidor.");
    }

    if (response.statusCode != 200) {
      final data = _tryDecode(response.body);
      throw ClienteException(
        data?['message'] ?? "No se pudo procesar el pago.",
      );
    }
  }

  // PUT /api/mesas/estado/:id — al salir, se libera la mesa (queda
  // "disponible" para el siguiente cliente). Pública, sin token.
  // Esto además dispara la limpieza de pedidos abandonados sin pagar
  // que ya tiene el backend para esta misma mesa.
  Future<void> liberarMesa(int idMesa) async {
    try {
      await http.put(
        Uri.parse("$baseUrl/api/mesas/estado/$idMesa"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"estado": "disponible"}),
      );
    } catch (e) {
      // Si falla, no bloqueamos la salida del cliente — el peor caso
      // es que el mesero tenga que liberar la mesa a mano.
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

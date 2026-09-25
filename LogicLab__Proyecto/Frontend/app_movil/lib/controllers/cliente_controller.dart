import 'package:shared_preferences/shared_preferences.dart';

import '../models/mesa_model.dart';
import '../models/menu_dia_model.dart';
import '../models/pedido_cliente_model.dart';
import '../repositories/cliente_repository.dart';
import '../repositories/menu_dia_repository.dart';

// Claves de SharedPreferences para la sesión de mesa del cliente —
// separadas de las de sesión de personal (token/usuarioId/rolId), el
// cliente nunca tiene esas.
const _kMesaId = 'clienteMesaId';
const _kMesaNumero = 'clienteMesaNumero';

class ClienteController {
  final ClienteRepository _repository = ClienteRepository();
  final MenuDiaRepository _menuRepository = MenuDiaRepository();

  Future<Mesa> resolverMesaPorToken(String token) {
    return _repository.resolverMesaPorToken(token);
  }

  Future<List<PedidoCliente>> obtenerPedidosActivos(int numeroMesa) {
    return _repository.obtenerPedidosActivos(numeroMesa);
  }

  Future<int> crearPedido({
    required int idMesa,
    required double totalPagar,
    required List<Map<String, dynamic>> items,
  }) {
    return _repository.crearPedido(
      idMesa: idMesa,
      totalPagar: totalPagar,
      items: items,
    );
  }

  Future<List<Map<String, dynamic>>> obtenerMetodosPagoOnline() {
    return _repository.obtenerMetodosPagoOnline();
  }

  Future<void> simularPago({
    required int idPedido,
    required int idMetodoPago,
    required Map<String, dynamic> datos,
  }) {
    return _repository.simularPago(
      idPedido: idPedido,
      idMetodoPago: idMetodoPago,
      datos: datos,
    );
  }

  // GET /api/menu-dia/hoy — pública, la misma que usa VistaCliente.jsx.
  // Devuelve null cuando el admin todavía no ha publicado el menú de hoy.
  Future<MenuDia?> obtenerMenuHoy() {
    return _menuRepository.obtenerMenuHoy();
  }

  // ================================================================
  // SESIÓN DE MESA (BUGFIX) — en Flutter Web, refrescar la página
  // reinicia toda la app desde main() y perdía la mesa del cliente,
  // devolviéndolo al login sin ninguna forma de volver salvo escanear
  // el QR de nuevo. Guardando la mesa acá, MangataApp puede llevarlo
  // derecho de vuelta a su mesa en vez de al login. La única forma de
  // cerrar esta sesión es el botón SALIR (cerrarSesionMesa).
  // ================================================================

  Future<void> guardarSesionMesa(Mesa mesa) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kMesaId, mesa.id);
    await prefs.setInt(_kMesaNumero, mesa.numero);
  }

  Future<Mesa?> obtenerSesionMesaGuardada() async {
    final prefs = await SharedPreferences.getInstance();
    final id = prefs.getInt(_kMesaId);
    final numero = prefs.getInt(_kMesaNumero);
    if (id == null || numero == null) return null;
    return Mesa(id: id, numero: numero, estado: "ocupada");
  }

  Future<void> cerrarSesionMesa() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kMesaId);
    await prefs.remove(_kMesaNumero);
  }

  Future<void> liberarMesa(int idMesa) => _repository.liberarMesa(idMesa);
}

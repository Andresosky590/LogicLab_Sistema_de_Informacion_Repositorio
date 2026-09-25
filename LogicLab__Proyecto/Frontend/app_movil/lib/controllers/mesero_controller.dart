import '../models/mesa_model.dart';
import '../models/menu_dia_model.dart';
import '../models/pedido_mesero_model.dart';
import '../repositories/menu_dia_repository.dart';
import '../repositories/mesero_repository.dart';

// Igual cálculo que hace LayoutMesero en Panel_Mesero.jsx con su
// historial: filtra "hoy" y agrupa pagos aprobados por método.
class ResumenMesero {
  final int pedidosHoy;
  final int entregadosHoy;
  final double cobradoHoy;
  final Map<String, double> pagosPorMetodo;
  final List<PedidoMesero> historial;

  ResumenMesero({
    required this.pedidosHoy,
    required this.entregadosHoy,
    required this.cobradoHoy,
    required this.pagosPorMetodo,
    required this.historial,
  });
}

class MeseroController {
  final MeseroRepository _repository = MeseroRepository();
  final MenuDiaRepository _menuRepository = MenuDiaRepository();

  Future<MenuDia?> cargarMenuHoy() => _menuRepository.obtenerMenuHoy();

  Future<List<Mesa>> cargarMesas() => _repository.obtenerMesas();

  Future<void> liberarMesa(int idMesa) => _repository.liberarMesa(idMesa);

  Future<ResumenMesero> cargarResumen() async {
    final pedidos = await _repository.obtenerMisPedidos();
    final hoy = pedidos.where((p) => p.esDeHoy).toList();
    final entregados = hoy.where((p) => p.estadoPedido == "entregado").toList();
    final pagados = hoy.where((p) => p.pagoAprobado).toList();

    final cobrado = pagados.fold<double>(0, (a, p) => a + p.totalPagar);

    final porMetodo = <String, double>{};
    for (final p in pagados) {
      final metodo = p.metodoPago ?? "Sin método";
      porMetodo[metodo] = (porMetodo[metodo] ?? 0) + p.totalPagar;
    }

    return ResumenMesero(
      pedidosHoy: hoy.length,
      entregadosHoy: entregados.length,
      cobradoHoy: cobrado,
      pagosPorMetodo: porMetodo,
      historial: pedidos,
    );
  }

  Future<List<PedidoMesero>> cargarPorEstado(String estado) =>
      _repository.obtenerPorEstado(estado);

  Future<void> tomarPedido(int idPedido) => _repository.tomarPedido(idPedido);

  Future<void> enviarACocina(int idPedido) =>
      _repository.cambiarEstadoPedido(idPedido, "preparando");

  Future<void> entregarPedido(int idPedido) =>
      _repository.cambiarEstadoPedido(idPedido, "entregado");

  Future<void> cancelarPedido(int idPedido, String motivo) =>
      _repository.cancelarPedido(idPedido, motivo);

  Future<void> modificarPedido(int idPedido, List<ItemPedidoMesero> items) {
    final payload = items
        .map(
          (i) => {
            "idPlato": i.idPlato,
            "nombrePlato": i.nombrePlato,
            "cantidadPedido": i.cantidad,
            "notasEspeciales": i.notas,
            "precioFinal": i.precioFinal,
            "idCategoria": i.idCategoria,
          },
        )
        .toList();
    return _repository.modificarPedido(idPedido, payload);
  }

  Future<void> agregarItemAPedido(int idPedido, Map<String, dynamic> item) =>
      _repository.agregarItem(idPedido, item);

  Future<void> quitarItemDePedido(int idPedido, int idDetalle) =>
      _repository.quitarItem(idPedido, idDetalle);

  Future<void> actualizarCantidadItem(
    int idPedido,
    int idDetalle,
    int cantidad,
    double precioFinal,
  ) => _repository.actualizarCantidadItem(
    idPedido,
    idDetalle,
    cantidad,
    precioFinal,
  );

  Future<void> cerrarCuenta(int idPedido, String metodoPago) =>
      _repository.cerrarCuenta(idPedido, metodoPago);

  Future<void> marcarPagoPresencial(int idPedido, String metodoPago) =>
      _repository.marcarPagoPresencial(idPedido, metodoPago);

  Future<List<Map<String, dynamic>>> cargarMetodosPago() =>
      _repository.obtenerMetodosPago();

  Future<List<Map<String, dynamic>>> cargarPlatos() =>
      _repository.obtenerPlatos();

  Future<void> crearPedidoAsistido({
    required int idMesa,
    required double totalPagar,
    required List<Map<String, dynamic>> items,
    required int idMetodoPago,
  }) => _repository.crearPedidoAsistido(
    idMesa: idMesa,
    totalPagar: totalPagar,
    items: items,
    idMetodoPago: idMetodoPago,
  );
}

import '../models/mesa_model.dart';
import '../models/pedido_mesero_model.dart';
import '../repositories/mesero_repository.dart';

// Snapshot ya calculado de la vista general del mesero — mismo cálculo
// que hace LayoutMesero en Panel_Mesero.jsx (pedidos de hoy, entregados,
// ganado hoy) más el listado de pedidos de hoy para el historial.
class ResumenMesero {
  final String nombre;
  final int pedidosHoy;
  final int entregadosHoy;
  final double gananciaHoy;
  final List<PedidoMesero> historialHoy;

  ResumenMesero({
    required this.nombre,
    required this.pedidosHoy,
    required this.entregadosHoy,
    required this.gananciaHoy,
    required this.historialHoy,
  });
}

class MeseroController {
  final MeseroRepository _repository = MeseroRepository();

  Future<ResumenMesero> cargarResumen() async {
    final resultados = await Future.wait([
      _repository.obtenerPedidos(),
      _repository.obtenerNombreUsuario(),
    ]);

    final pedidos = resultados[0] as List<PedidoMesero>;
    final nombre = resultados[1] as String;

    final pedidosHoy = pedidos.where((p) => p.esDeHoy).toList();
    final entregadosHoy = pedidosHoy
        .where((p) => p.estado == "entregado")
        .toList();
    final gananciaHoy = entregadosHoy.fold<double>(
      0,
      (acc, p) => acc + p.totalPagar,
    );

    return ResumenMesero(
      nombre: nombre,
      pedidosHoy: pedidosHoy.length,
      entregadosHoy: entregadosHoy.length,
      gananciaHoy: gananciaHoy,
      historialHoy: pedidosHoy,
    );
  }

  Future<List<Mesa>> cargarMesas() => _repository.obtenerMesas();
}

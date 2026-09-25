import '../models/menu_dia_model.dart';
import '../models/pedido_cocina_model.dart';
import '../repositories/cocina_repository.dart';
import '../repositories/menu_dia_repository.dart';

// Snapshot ya calculado de la vista general del cocinero: cuántos
// pedidos están pendientes, en preparación y ya listos hoy.
class ResumenCocina {
  final String nombreCompleto;
  final int pendientesHoy;
  final int preparandoHoy;
  final int listosHoy;

  ResumenCocina({
    required this.nombreCompleto,
    required this.pendientesHoy,
    required this.preparandoHoy,
    required this.listosHoy,
  });

  int get totalHoy => pendientesHoy + preparandoHoy + listosHoy;
}

class CocineroController {
  final CocinaRepository _repository = CocinaRepository();
  final MenuDiaRepository _menuRepository = MenuDiaRepository();

  Future<ResumenCocina> cargarResumen() async {
    final resultados = await Future.wait([
      _repository.obtenerPedidosPorEstado("pendiente"),
      _repository.obtenerPedidosPorEstado("preparando"),
      _repository.obtenerPedidosPorEstado("listo"),
      _repository.obtenerNombreCompleto(),
    ]);

    final pendientes = resultados[0] as List<PedidoCocina>;
    final preparando = resultados[1] as List<PedidoCocina>;
    final listos = resultados[2] as List<PedidoCocina>;
    final nombre = resultados[3] as String;

    return ResumenCocina(
      nombreCompleto: nombre,
      pendientesHoy: pendientes.where((p) => p.esDeHoy).length,
      preparandoHoy: preparando.where((p) => p.esDeHoy).length,
      listosHoy: listos.where((p) => p.esDeHoy).length,
    );
  }

  Future<List<PedidoCocina>> cargarPreparando() =>
      _repository.obtenerPedidosPorEstado("preparando");

  Future<void> marcarComoListo(int idPedido) =>
      _repository.marcarComoListo(idPedido);

  Future<MenuDia?> cargarMenuHoy() => _menuRepository.obtenerMenuHoy();
}

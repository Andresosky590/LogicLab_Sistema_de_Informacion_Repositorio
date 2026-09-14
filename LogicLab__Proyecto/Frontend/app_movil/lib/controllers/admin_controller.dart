import '../models/menu_dia_model.dart';
import '../models/pqrsf_model.dart';
import '../repositories/admin_repository.dart';

// Snapshot ya calculado del dashboard — mismo cálculo que hace
// cargarDashboard() en Panel_Administrador.jsx (pedidos de hoy, ganancias,
// entregados, % de mesas ocupadas).
class DashboardAdmin {
  final int pedidosHoy;
  final double gananciasHoy;
  final int entregadosHoy;
  final int mesasOcupadas;
  final int totalMesas;
  final MenuDia? menuHoy;
  final List<Pqrsf> pqrsf;

  DashboardAdmin({
    required this.pedidosHoy,
    required this.gananciasHoy,
    required this.entregadosHoy,
    required this.mesasOcupadas,
    required this.totalMesas,
    required this.menuHoy,
    required this.pqrsf,
  });

  int get porcentajeOcupadas =>
      totalMesas > 0 ? ((mesasOcupadas / totalMesas) * 100).round() : 0;
}

class AdminController {
  final AdminRepository _repository = AdminRepository();

  Future<DashboardAdmin> cargarDashboard() async {
    final resultados = await Future.wait([
      _repository.obtenerPedidos(),
      _repository.obtenerMesas(),
      _repository.obtenerPqrsf(),
      _repository.obtenerMenuHoy(),
    ]);

    final pedidos = resultados[0] as List;
    final mesas = resultados[1] as List;
    final pqrsf = resultados[2] as List<Pqrsf>;
    final menuHoy = resultados[3] as MenuDia?;

    final hoy = DateTime.now();
    final hoyStr =
        "${hoy.year}-${hoy.month.toString().padLeft(2, '0')}-${hoy.day.toString().padLeft(2, '0')}";

    final pedidosHoy =
        pedidos.where((p) => p.fechaPedido.startsWith(hoyStr)).toList();
    final gananciasHoy = pedidosHoy.fold<double>(
      0,
      (acc, p) => acc + p.totalPagar,
    );
    final entregadosHoy =
        pedidosHoy.where((p) => p.estado == "entregado").length;
    final mesasOcupadas = mesas.where((m) => !m.disponible).length;

    return DashboardAdmin(
      pedidosHoy: pedidosHoy.length,
      gananciasHoy: gananciasHoy,
      entregadosHoy: entregadosHoy,
      mesasOcupadas: mesasOcupadas,
      totalMesas: mesas.length,
      menuHoy: menuHoy,
      pqrsf: pqrsf,
    );
  }
}

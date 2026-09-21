import '../models/mesa_model.dart';
import '../models/menu_dia_model.dart';
import '../models/pedido_cliente_model.dart';
import '../repositories/cliente_repository.dart';
import '../repositories/menu_dia_repository.dart';

class ClienteController {
  final ClienteRepository _repository = ClienteRepository();
  final MenuDiaRepository _menuRepository = MenuDiaRepository();

  Future<Mesa> resolverMesaPorToken(String token) {
    return _repository.resolverMesaPorToken(token);
  }

  Future<List<PedidoCliente>> obtenerPedidosActivos(int numeroMesa) {
    return _repository.obtenerPedidosActivos(numeroMesa);
  }

  // GET /api/menu-dia/hoy — pública, la misma que usa VistaCliente.jsx.
  // Devuelve null cuando el admin todavía no ha publicado el menú de hoy.
  Future<MenuDia?> obtenerMenuHoy() {
    return _menuRepository.obtenerMenuHoy();
  }
}

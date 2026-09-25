import '../models/mesa_model.dart';
import '../repositories/mesa_repository.dart';

class MesaController {
  final MesaRepository _repository = MesaRepository();

  Future<List<Mesa>> cargarMesas() {
    return _repository.obtenerMesasConQr();
  }

  Future<void> regenerarQr(int idMesa) {
    return _repository.regenerarQr(idMesa);
  }
}

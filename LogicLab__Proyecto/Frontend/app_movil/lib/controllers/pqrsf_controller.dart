import '../repositories/pqrsf_repository.dart';

class PqrsfController {
  final PqrsfRepository _repository = PqrsfRepository();

  Future<List<TipoPqrsf>> cargarTipos() => _repository.obtenerTipos();

  Future<void> enviar({
    required int idTipoPqrsf,
    required String mensaje,
    String? nombre,
  }) {
    return _repository.enviar(
      idTipoPqrsf: idTipoPqrsf,
      mensaje: mensaje,
      nombre: nombre,
    );
  }
}

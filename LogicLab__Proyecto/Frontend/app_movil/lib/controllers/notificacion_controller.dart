import '../models/notificacion_mesa_model.dart';
import '../repositories/notificacion_repository.dart';

class NotificacionController {
  final _repository = NotificacionRepository();
  Future<List<NotificacionMesa>> listar() => _repository.listar();
  Future<void> atender(int id) => _repository.atender(id);
}

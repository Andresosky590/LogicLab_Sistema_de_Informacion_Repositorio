import '../models/empleado_model.dart';
import '../repositories/empleado_repository.dart';

class EmpleadoController {
  final EmpleadoRepository _repository = EmpleadoRepository();

  Future<List<Empleado>> cargarEmpleados() => _repository.obtenerEmpleados();

  Future<void> crearEmpleado({
    required String nombre,
    required String apellido,
    required String email,
    required String password,
    required int rolId,
  }) {
    return _repository.crearEmpleado(
      nombre: nombre,
      apellido: apellido,
      email: email,
      password: password,
      rolId: rolId,
    );
  }

  Future<void> actualizarEmpleado({
    required int id,
    required String nombre,
    required String apellido,
    required String email,
    required int rolId,
    String? password,
  }) {
    return _repository.actualizarEmpleado(
      id: id,
      nombre: nombre,
      apellido: apellido,
      email: email,
      rolId: rolId,
      password: password,
    );
  }

  Future<void> eliminarEmpleado(int id) => _repository.eliminarEmpleado(id);

  // ── Solicitudes de registro ──
  Future<List<Empleado>> cargarSolicitudes() =>
      _repository.obtenerSolicitudes();

  Future<void> aprobarSolicitud(int id, int rolId) =>
      _repository.aprobarSolicitud(id, rolId);

  Future<void> descartarSolicitud(int id) => _repository.descartarSolicitud(id);
}

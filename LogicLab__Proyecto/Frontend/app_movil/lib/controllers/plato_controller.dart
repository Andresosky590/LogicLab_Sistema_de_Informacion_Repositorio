import 'package:image_picker/image_picker.dart' show XFile;

import '../models/plato_model.dart';
import '../repositories/plato_repository.dart';

// Snapshot de datos que necesita la pantalla de platos: la carta
// completa + las categorías activas, cargadas juntas.
class DatosPlatos {
  final List<Plato> platos;
  final List<Categoria> categorias;

  DatosPlatos({required this.platos, required this.categorias});
}

class PlatoController {
  final PlatoRepository _repository = PlatoRepository();

  Future<DatosPlatos> cargarPlatos() async {
    final resultados = await Future.wait([
      _repository.obtenerPlatos(),
      _repository.obtenerCategorias(),
    ]);

    return DatosPlatos(
      platos: resultados[0] as List<Plato>,
      categorias: resultados[1] as List<Categoria>,
    );
  }

  Future<int> crearPlato({
    required String nombre,
    required String? descripcion,
    required double precio,
    required int idCategoria,
  }) {
    return _repository.crearPlato(
      nombre: nombre,
      descripcion: descripcion,
      precio: precio,
      idCategoria: idCategoria,
    );
  }

  Future<void> actualizarPlato({
    required int id,
    required String? descripcion,
    required double precio,
  }) {
    return _repository.actualizarPlato(
      id: id,
      descripcion: descripcion,
      precio: precio,
    );
  }

  Future<void> eliminarPlato(int id) {
    return _repository.eliminarPlato(id);
  }

  Future<void> cambiarDisponibilidad(int id, bool disponible) {
    return _repository.cambiarDisponibilidad(id, disponible);
  }

  Future<String> subirImagen(int idPlato, XFile archivo) {
    return _repository.subirImagen(idPlato, archivo);
  }
}

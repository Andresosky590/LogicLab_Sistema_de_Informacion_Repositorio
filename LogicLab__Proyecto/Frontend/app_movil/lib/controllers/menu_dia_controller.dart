import '../models/menu_dia_model.dart';
import '../models/plato_model.dart';
import '../repositories/menu_dia_repository.dart';
import '../repositories/plato_repository.dart';

// Snapshot de datos que necesita la pantalla: la carta completa, las
// categorías, y el menú ya publicado hoy (si existe).
class DatosMenuDia {
  final List<Plato> platos;
  final List<Categoria> categorias;
  final MenuDia? menuActual;

  DatosMenuDia({
    required this.platos,
    required this.categorias,
    required this.menuActual,
  });
}

// Una sección mientras el admin la está armando en la pantalla.
class SeccionEditable {
  // Clave fija para que Flutter no confunda las secciones al reordenarlas
  final int clave;
  String nombre;
  final List<int> platos; // ids de los platos, en orden

  SeccionEditable({
    required this.clave,
    required this.nombre,
    List<int>? platos,
  }) : platos = platos ?? [];
}

class MenuDiaController {
  final MenuDiaRepository _menuRepo = MenuDiaRepository();
  final PlatoRepository _platoRepo = PlatoRepository();

  Future<DatosMenuDia> cargarDatos() async {
    final resultados = await Future.wait([
      _platoRepo.obtenerPlatos(),
      _platoRepo.obtenerCategorias(),
      _menuRepo.obtenerMenuHoy(),
    ]);

    return DatosMenuDia(
      platos: resultados[0] as List<Plato>,
      categorias: resultados[1] as List<Categoria>,
      menuActual: resultados[2] as MenuDia?,
    );
  }

  // Mismas reglas que valida el backend. Devuelve el error o null.
  String? validar(List<SeccionEditable> secciones) {
    if (secciones.isEmpty) return "Agrega al menos una sección.";
    for (final s in secciones) {
      final nombre = s.nombre.trim();
      if (nombre.isEmpty) return "Todas las secciones necesitan un nombre.";
      if (s.platos.isEmpty) return "La sección \"$nombre\" está vacía.";
    }
    return null;
  }

  Future<void> publicar(List<SeccionEditable> secciones) {
    return _menuRepo.publicarMenu(
      secciones
          .map((s) => {"nombre": s.nombre.trim(), "platos": s.platos})
          .toList(),
    );
  }

  Future<void> desactivar() => _menuRepo.desactivarMenu();
}

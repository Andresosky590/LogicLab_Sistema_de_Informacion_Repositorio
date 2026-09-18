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

// Precio fijo de la Corriente del Día — igual que en Admin/Menus.jsx.
const double precioCorriente = 15000;

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

  // Publica el menú de hoy.
  // platosSeleccionados: platos reales elegidos en la sección 2.
  // corriente: null si no se armó Corriente del Día; si no, el mapa con
  // las listas de sopas/proteínas/principios/acompañantes elegidas.
  Future<void> publicar({
    required List<Plato> platosSeleccionados,
    required Map<String, List<String>> corriente,
  }) async {
    final hayCorriente = corriente.values.any((lista) => lista.isNotEmpty);

    final items = <Map<String, dynamic>>[
      if (hayCorriente)
        {
          "id_Platos": MenuDiaItem.idCorriente,
          "categoria": "Corriente",
          "nombreItem": _descripcionCorriente(corriente),
        },
      ...platosSeleccionados.map(
        (p) => {
          "id_Platos": p.id,
          "categoria": p.idCategoria.toString(),
          "nombreItem": p.nombre,
        },
      ),
    ];

    await _menuRepo.publicarMenu(precio: precioCorriente, items: items);
  }

  Future<void> desactivar() {
    return _menuRepo.desactivarMenu();
  }

  String _descripcionCorriente(Map<String, List<String>> corriente) {
    final partes = <String>[];
    void agregar(String etiqueta, String clave) {
      final lista = corriente[clave] ?? [];
      if (lista.isNotEmpty) partes.add("$etiqueta: ${lista.join(" o ")}");
    }

    agregar("Sopa", "sopas");
    agregar("Proteína", "proteinas");
    agregar("Principio", "principios");
    agregar("Acompañante", "acompanantes");
    return partes.join(" • ");
  }
}

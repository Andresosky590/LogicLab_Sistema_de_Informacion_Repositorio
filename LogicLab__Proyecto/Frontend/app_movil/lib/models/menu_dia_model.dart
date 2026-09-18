// Representa el menú del día y coincide con lo que devuelve
// GET /api/menu-dia/hoy: { id_Menu, Fecha, Precio, activo, items: [...] }.
// El backend responde `null` (200 OK) cuando el admin aún no ha publicado
// el menú de hoy — eso se maneja como MenuDia? nulo, no como error.
class MenuDia {
  final int id;
  final String fecha;
  final double precio;
  final List<MenuDiaItem> items;

  MenuDia({
    required this.id,
    required this.fecha,
    required this.precio,
    required this.items,
  });

  factory MenuDia.fromJson(Map<String, dynamic> json) {
    return MenuDia(
      id: json['id_Menu'],
      fecha: json['Fecha'].toString(),
      precio: double.tryParse(json['Precio'].toString()) ?? 0,
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => MenuDiaItem.fromJson(e))
          .toList(),
    );
  }
}

// Cada ítem del menú es, o bien un plato real de la carta (id_Platos
// coincide con un Plato de /api/platos/listar), o la "Corriente del Día",
// que reutiliza el sentinel id_Platos = 9999 (no es un plato real: se
// arma con las sopas/proteínas/principios/acompañantes que eligió el
// admin, igual que en la web).
class MenuDiaItem {
  static const int idCorriente = 9999;

  final int idPlatos;
  final String nombrePlato;
  final String? descripcion;
  final double precio;
  final int idCategoria;

  MenuDiaItem({
    required this.idPlatos,
    required this.nombrePlato,
    required this.descripcion,
    required this.precio,
    required this.idCategoria,
  });

  bool get esCorriente => idPlatos == idCorriente;

  factory MenuDiaItem.fromJson(Map<String, dynamic> json) {
    return MenuDiaItem(
      idPlatos: json['id_Platos'],
      nombrePlato: json['NombrePlato'] ?? "",
      descripcion: json['Descripcion'],
      precio: double.tryParse(json['Precio'].toString()) ?? 0,
      idCategoria: json['id_Categoria'],
    );
  }
}

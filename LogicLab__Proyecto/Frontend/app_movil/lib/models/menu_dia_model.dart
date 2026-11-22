// Representa el menú del día y coincide con lo que devuelve
// GET /api/menu-dia/hoy: { id_Menu, Fecha, activo, secciones: [...], items: [...] }.
// El backend responde `null` (200 OK) cuando el admin aún no ha publicado
// el menú de hoy — eso se maneja como MenuDia? nulo, no como error.
class MenuDia {
  final int id;
  final String fecha;
  // Secciones en el orden que armó el admin (ej. "Corriente del día",
  // "Comida rápida", "Bebidas"), cada una con sus platos.
  final List<MenuSeccion> secciones;
  // Todos los platos del menú en una sola lista, para las pantallas
  // que no necesitan las secciones (pedido asistido, editar pedido).
  final List<MenuDiaItem> items;

  MenuDia({
    required this.id,
    required this.fecha,
    required this.secciones,
    required this.items,
  });

  factory MenuDia.fromJson(Map<String, dynamic> json) {
    return MenuDia(
      id: json['id_Menu'],
      fecha: json['Fecha'].toString(),
      secciones: (json['secciones'] as List<dynamic>? ?? [])
          .map((e) => MenuSeccion.fromJson(e))
          .toList(),
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => MenuDiaItem.fromJson(e))
          .toList(),
    );
  }
}

class MenuSeccion {
  final int id;
  final String nombre;
  final List<MenuDiaItem> platos;

  MenuSeccion({required this.id, required this.nombre, required this.platos});

  factory MenuSeccion.fromJson(Map<String, dynamic> json) {
    return MenuSeccion(
      id: json['id_Seccion'],
      nombre: json['Nombre'] ?? "",
      platos: (json['platos'] as List<dynamic>? ?? [])
          .map((e) => MenuDiaItem.fromJson(e))
          .toList(),
    );
  }
}

// Cada ítem del menú es un plato real de la carta (id_Platos coincide
// con un Plato de /api/platos/listar).
class MenuDiaItem {
  // Ya no se usa: antes la "Corriente del Día" era un ítem especial con
  // este id. Se deja para no romper pantallas viejas; siempre da false.
  static const int idCorriente = 9999;

  final int idPlatos;
  final String nombrePlato;
  final String? descripcion;
  final double precio;
  final int idCategoria;
  final String? imagenUrl; // null = sin foto (se muestra un ícono)
  final bool disponible;

  MenuDiaItem({
    required this.idPlatos,
    required this.nombrePlato,
    required this.descripcion,
    required this.precio,
    required this.idCategoria,
    required this.imagenUrl,
    required this.disponible,
  });

  bool get esCorriente => idPlatos == idCorriente;

  factory MenuDiaItem.fromJson(Map<String, dynamic> json) {
    return MenuDiaItem(
      idPlatos: json['id_Platos'],
      nombrePlato: json['NombrePlato'] ?? "",
      descripcion: json['Descripcion'],
      precio: double.tryParse(json['Precio'].toString()) ?? 0,
      idCategoria: json['id_Categoria'],
      imagenUrl: json['ImagenUrl'],
      // Si el backend no manda el campo, se asume disponible
      disponible: json['Disponible'] != "Agotado",
    );
  }
}

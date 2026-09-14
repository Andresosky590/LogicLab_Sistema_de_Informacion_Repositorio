// Representa el "Corriente del día" y coincide con lo que devuelve
// GET /api/menu-dia/hoy: { id_Menu, Fecha, Precio, activo, items: [...] }
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

  // Agrupa los ítems por categoría (Sopa, Principio, Proteína, ...) tal como
  // los arma Admin/Menus.jsx en la web.
  Map<String, List<String>> get itemsPorCategoria {
    final Map<String, List<String>> agrupado = {};

    for (final item in items) {
      agrupado.putIfAbsent(item.categoria, () => []).add(item.nombreItem);
    }

    return agrupado;
  }

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

class MenuDiaItem {
  final String categoria;
  final String nombreItem;

  MenuDiaItem({required this.categoria, required this.nombreItem});

  factory MenuDiaItem.fromJson(Map<String, dynamic> json) {
    return MenuDiaItem(
      categoria: json['Categoria'] ?? "",
      nombreItem: json['NombreItem'] ?? "",
    );
  }
}

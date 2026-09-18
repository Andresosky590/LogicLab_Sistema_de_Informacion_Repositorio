// Representa una categoría de la carta.
// Coincide con GET /api/categorias/listar ({ id_Categoria, NombreCategoria }).
class Categoria {
  final int id;
  final String nombre;

  Categoria({required this.id, required this.nombre});

  factory Categoria.fromJson(Map<String, dynamic> json) {
    return Categoria(
      id: json['id_Categoria'],
      nombre: json['NombreCategoria'] ?? "",
    );
  }
}

// Representa un plato de la carta.
// Coincide con GET /api/platos/listar
// ({ id_Platos, NombrePlato, Precio, Descripcion, id_Categoria, Disponible, ImagenUrl }).
class Plato {
  final int id;
  final String nombre;
  final String? descripcion;
  final double precio;
  final int idCategoria;
  final bool disponible;
  final String?
  imagenUrl; // ruta relativa, ej. "/uploads/platos/plato_12_....jpg"

  Plato({
    required this.id,
    required this.nombre,
    required this.descripcion,
    required this.precio,
    required this.idCategoria,
    required this.disponible,
    required this.imagenUrl,
  });

  factory Plato.fromJson(Map<String, dynamic> json) {
    return Plato(
      id: json['id_Platos'],
      nombre: json['NombrePlato'] ?? "",
      descripcion: json['Descripcion'],
      precio: double.tryParse(json['Precio'].toString()) ?? 0,
      idCategoria: json['id_Categoria'],
      // La columna Disponible es ENUM('Agotado','Disponible') en la BD
      // (antes era 0/1) — comparamos contra el texto, no contra 1.
      disponible: json['Disponible'] == "Disponible",
      imagenUrl: json['ImagenUrl'],
    );
  }

  // Útil para reflejar en la UI el resultado de un toggle de
  // disponibilidad o de una subida de imagen sin tener que recargar
  // toda la lista del backend.
  Plato copyWith({bool? disponible, String? imagenUrl}) {
    return Plato(
      id: id,
      nombre: nombre,
      descripcion: descripcion,
      precio: precio,
      idCategoria: idCategoria,
      disponible: disponible ?? this.disponible,
      imagenUrl: imagenUrl ?? this.imagenUrl,
    );
  }
}

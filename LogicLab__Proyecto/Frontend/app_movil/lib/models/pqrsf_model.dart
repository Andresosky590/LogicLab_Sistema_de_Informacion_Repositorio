// Un registro de PQRSF (Petición/Queja/Reclamo/Felicitación/Sugerencia)
// tal como lo devuelve GET /api/pqrsf/listar.
class Pqrsf {
  final int id;
  final String tipo;
  final String nombre;
  final String mensaje;
  final String fecha;

  Pqrsf({
    required this.id,
    required this.tipo,
    required this.nombre,
    required this.mensaje,
    required this.fecha,
  });

  factory Pqrsf.fromJson(Map<String, dynamic> json) {
    return Pqrsf(
      id: json['id_Registro_PQRSF'],
      tipo: json['TipoPQRSF'] ?? "",
      nombre: json['Nombre'] ?? "Anónimo",
      mensaje: json['Mensaje'] ?? "",
      fecha: json['Fecha'] ?? "",
    );
  }
}

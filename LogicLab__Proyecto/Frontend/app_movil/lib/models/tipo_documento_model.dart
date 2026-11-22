// Tipo de documento que se puede elegir al solicitar registro.
// Viene de GET /api/tipos-documento (solo los activos).
class TipoDocumento {
  final int id;
  final String descripcion;

  TipoDocumento({required this.id, required this.descripcion});

  factory TipoDocumento.fromJson(Map<String, dynamic> json) {
    return TipoDocumento(
      id: json['id_Tipo_Documento'],
      descripcion: json['Descripcion_Documento'] ?? "",
    );
  }
}

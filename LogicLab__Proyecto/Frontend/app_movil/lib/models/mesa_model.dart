// Representa una mesa del restaurante.
// Coincide con el objeto que devuelve GET /api/mesas/listar
// ({ id_Mesas, Numero_mesa, Estado }) — no incluye QR_Token (eso es solo
// para el panel de admin).
class Mesa {
  final int id;
  final int numero;
  final String estado;

  Mesa({required this.id, required this.numero, required this.estado});

  bool get disponible => estado.toLowerCase() == "disponible";

  factory Mesa.fromJson(Map<String, dynamic> json) {
    return Mesa(
      id: json['id_Mesas'],
      numero: json['Numero_mesa'],
      estado: json['Estado'] ?? "disponible",
    );
  }
}

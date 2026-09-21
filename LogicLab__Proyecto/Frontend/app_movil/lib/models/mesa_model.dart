// Representa una mesa del restaurante.
// Coincide con GET /api/mesas/listar ({ id_Mesas, Numero_mesa, Estado }),
// y con GET /api/mesas/admin/listar, que además trae QR_Token.
class Mesa {
  final int id;
  final int numero;
  final String estado;
  final String? qrToken; // null salvo que venga del endpoint de admin

  Mesa({
    required this.id,
    required this.numero,
    required this.estado,
    this.qrToken,
  });

  bool get disponible => estado.toLowerCase() == "disponible";

  factory Mesa.fromJson(Map<String, dynamic> json) {
    return Mesa(
      id: json['id_Mesas'],
      numero: json['Numero_mesa'],
      estado: json['Estado'] ?? "disponible",
      qrToken: json['QR_Token'],
    );
  }
}

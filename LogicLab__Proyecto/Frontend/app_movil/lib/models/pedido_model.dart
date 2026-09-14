// Versión resumida de un pedido — solo los campos que necesita el
// dashboard del admin (GET /api/pedidos/listar).
class Pedido {
  final int id;
  final String fechaPedido;
  final String estado;
  final double totalPagar;

  Pedido({
    required this.id,
    required this.fechaPedido,
    required this.estado,
    required this.totalPagar,
  });

  factory Pedido.fromJson(Map<String, dynamic> json) {
    return Pedido(
      id: json['id_Pedidos'],
      fechaPedido: json['Fecha_Pedido']?.toString() ?? "",
      estado: json['EstadoPedido'] ?? "pendiente",
      totalPagar: double.tryParse(json['TotalPagar'].toString()) ?? 0,
    );
  }
}

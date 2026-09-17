// Un pedido del historial propio del mesero.
// Coincide con lo que devuelve GET /api/pedidos/mesero/:idUsuario
// ({ id_Pedidos, Fecha_Pedido, EstadoPedido, TotalPagar, MetodoPago,
//   Numero_mesa }) — ver PedidoModel.findByMesero en el backend.
class PedidoMesero {
  final int id;
  final DateTime? fecha;
  final String estado;
  final double totalPagar;
  final String? metodoPago;
  final int? numeroMesa;

  PedidoMesero({
    required this.id,
    required this.fecha,
    required this.estado,
    required this.totalPagar,
    this.metodoPago,
    this.numeroMesa,
  });

  // Compara solo año/mes/día contra "ahora" — igual que hoyStr() +
  // startsWith() en Panel_Mesero.jsx.
  bool get esDeHoy {
    if (fecha == null) return false;
    final ahora = DateTime.now();
    return fecha!.year == ahora.year &&
        fecha!.month == ahora.month &&
        fecha!.day == ahora.day;
  }

  factory PedidoMesero.fromJson(Map<String, dynamic> json) {
    return PedidoMesero(
      id: json['id_Pedidos'],
      fecha: DateTime.tryParse(json['Fecha_Pedido']?.toString() ?? ""),
      estado: json['EstadoPedido'] ?? "pendiente",
      totalPagar: double.tryParse(json['TotalPagar'].toString()) ?? 0,
      metodoPago: json['MetodoPago'],
      numeroMesa: json['Numero_mesa'] is int
          ? json['Numero_mesa']
          : int.tryParse(json['Numero_mesa']?.toString() ?? ""),
    );
  }
}

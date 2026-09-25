// Un pedido tal como lo devuelve GET /api/pedidos/estado/:estado
// ({ id_Pedidos, Fecha_Pedido, EstadoPedido, TotalPagar, Numero_mesa,
//   NombreMesero, detalles: [...] }) — ver PedidoModel.findByEstado en
// el backend.

class ItemPedidoCocina {
  final String nombrePlato;
  final int cantidad;
  final String? notas;
  final int idCategoria;

  ItemPedidoCocina({
    required this.nombrePlato,
    required this.cantidad,
    required this.notas,
    required this.idCategoria,
  });

  factory ItemPedidoCocina.fromJson(Map<String, dynamic> json) {
    return ItemPedidoCocina(
      nombrePlato: json['NombrePlato']?.toString() ?? "Plato",
      cantidad: int.tryParse(json['CantidadPedido']?.toString() ?? "") ?? 1,
      notas: json['NotasEspeciales'],
      idCategoria: int.tryParse(json['id_Categoria']?.toString() ?? "") ?? 0,
    );
  }
}

class PedidoCocina {
  final int id;
  final DateTime? fecha;
  final String estado;
  final int? numeroMesa;
  final List<ItemPedidoCocina> detalles;

  PedidoCocina({
    required this.id,
    required this.fecha,
    required this.estado,
    this.numeroMesa,
    this.detalles = const [],
  });

  // Compara solo año/mes/día contra "ahora" — mismo criterio que usa
  // PedidoMesero.esDeHoy para el resumen del mesero.
  bool get esDeHoy {
    if (fecha == null) return false;
    final ahora = DateTime.now();
    return fecha!.year == ahora.year &&
        fecha!.month == ahora.month &&
        fecha!.day == ahora.day;
  }

  // Mismo criterio que usa Panel_Cocinero.jsx: categoría 4 = bebidas,
  // todo lo demás va junto como "platos".
  List<ItemPedidoCocina> get platos =>
      detalles.where((d) => d.idCategoria != 4).toList();
  List<ItemPedidoCocina> get bebidas =>
      detalles.where((d) => d.idCategoria == 4).toList();

  factory PedidoCocina.fromJson(Map<String, dynamic> json) {
    final detallesJson = json['detalles'];
    return PedidoCocina(
      id: json['id_Pedidos'],
      fecha: DateTime.tryParse(json['Fecha_Pedido']?.toString() ?? ""),
      estado: json['EstadoPedido'] ?? "pendiente",
      numeroMesa: json['Numero_mesa'] is int
          ? json['Numero_mesa']
          : int.tryParse(json['Numero_mesa']?.toString() ?? ""),
      detalles: detallesJson is List
          ? detallesJson
                .whereType<Map<String, dynamic>>()
                .map(ItemPedidoCocina.fromJson)
                .toList()
          : const [],
    );
  }
}

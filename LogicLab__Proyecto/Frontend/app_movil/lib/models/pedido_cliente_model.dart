// Modelos para la vista general del cliente (HU24).
//
// Coincide con GET /api/pedidos/mesa/:numero — un array de pedidos
// activos de esa mesa (normalmente 0 o 1, pero el backend no lo limita,
// así que se maneja como lista).

double _aDouble(dynamic valor) {
  if (valor == null) return 0;
  return double.tryParse(valor.toString()) ?? 0;
}

class ItemPedidoCliente {
  final String nombrePlato;
  final int cantidad;

  ItemPedidoCliente({required this.nombrePlato, required this.cantidad});

  factory ItemPedidoCliente.fromJson(Map<String, dynamic> json) {
    return ItemPedidoCliente(
      nombrePlato: json['NombrePlato']?.toString() ?? "Plato",
      cantidad: int.tryParse(json['CantidadPedido']?.toString() ?? "") ?? 1,
    );
  }
}

class PedidoCliente {
  final int id;
  final String estadoPedido;
  final double totalPagar;
  final List<ItemPedidoCliente> items;

  PedidoCliente({
    required this.id,
    required this.estadoPedido,
    required this.totalPagar,
    required this.items,
  });

  factory PedidoCliente.fromJson(Map<String, dynamic> json) {
    final detalles = json['detalles'];
    return PedidoCliente(
      id: json['id_Pedidos'],
      estadoPedido: json['EstadoPedido']?.toString() ?? "pendiente",
      totalPagar: _aDouble(json['TotalPagar']),
      items: detalles is List
          ? detalles
                .whereType<Map<String, dynamic>>()
                .map(ItemPedidoCliente.fromJson)
                .toList()
          : <ItemPedidoCliente>[],
    );
  }

  // Texto y color sugeridos para el estado, en un solo lugar para que
  // la pantalla no repita este switch.
  String get estadoLegible {
    switch (estadoPedido) {
      case "pendiente":
        return "Recibido, esperando cocina";
      case "preparando":
        return "En preparación";
      case "listo":
        return "¡Listo! Ya casi llega";
      case "entregado":
        return "Entregado";
      default:
        return estadoPedido;
    }
  }
}

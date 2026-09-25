// Modelos para la vista general del cliente (HU24) y para el flujo de
// "seguir agregando mientras no haya pagado" (modificarPedido, HU16
// reutilizada del lado del cliente).
//
// Coincide con GET /api/pedidos/mesa/:numero — un array de pedidos
// activos de esa mesa (normalmente 0 o 1, pero el backend no lo limita,
// así que se maneja como lista).

double _aDouble(dynamic valor) {
  if (valor == null) return 0;
  return double.tryParse(valor.toString()) ?? 0;
}

int _aInt(dynamic valor) {
  if (valor == null) return 0;
  return int.tryParse(valor.toString()) ?? 0;
}

class ItemPedidoCliente {
  final int? idPlato;
  final String nombrePlato;
  final int cantidad;
  final double precioFinal;
  final String? notas;
  final int idCategoria;

  ItemPedidoCliente({
    required this.idPlato,
    required this.nombrePlato,
    required this.cantidad,
    required this.precioFinal,
    required this.notas,
    required this.idCategoria,
  });

  double get precioUnitario => cantidad > 0 ? precioFinal / cantidad : 0;

  factory ItemPedidoCliente.fromJson(Map<String, dynamic> json) {
    return ItemPedidoCliente(
      idPlato: json['id_Platos'] == null ? null : _aInt(json['id_Platos']),
      nombrePlato: json['NombrePlato']?.toString() ?? "Plato",
      cantidad: _aInt(json['CantidadPedido']) == 0
          ? 1
          : _aInt(json['CantidadPedido']),
      precioFinal: _aDouble(json['PrecioFinal']),
      notas: json['NotasEspeciales'],
      idCategoria: _aInt(json['id_Categoria']),
    );
  }

  // Para reenviar en PUT /api/pedidos/modificar/:id, que espera la
  // lista COMPLETA de ítems (reemplaza, no suma) — así que cada
  // adición del cliente manda "lo que ya tenía" + "lo nuevo".
  Map<String, dynamic> toJson() => {
    "idPlato": idPlato,
    "nombrePlato": nombrePlato,
    "cantidadPedido": cantidad,
    "notasEspeciales": notas,
    "precioFinal": precioFinal,
    "idCategoria": idCategoria,
  };
}

class PedidoCliente {
  final int id;
  final String estadoPedido;
  final String estadoPago;
  final double totalPagar;
  final List<ItemPedidoCliente> items;

  PedidoCliente({
    required this.id,
    required this.estadoPedido,
    required this.estadoPago,
    required this.totalPagar,
    required this.items,
  });

  // Mientras esto sea true, el cliente todavía puede seguir
  // agregando cosas a ESTE mismo pedido — en cuanto paga, se sella
  // (ver PedidoController.modificarPedido en el backend, que ahora
  // rechaza cualquier cambio una vez EstadoPago === "aprobado").
  // ¿Sigue sin pagarse? El mesero manda a cocina sin exigir pago —
  // el cliente paga después, mientras su pedido se prepara (o, como
  // último recurso, al momento de entregarlo).
  bool get faltaPagar => estadoPago != "aprobado";

  factory PedidoCliente.fromJson(Map<String, dynamic> json) {
    final detalles = json['detalles'];
    return PedidoCliente(
      id: json['id_Pedidos'],
      estadoPedido: json['EstadoPedido']?.toString() ?? "pendiente",
      estadoPago: json['EstadoPago']?.toString() ?? "pendiente",
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

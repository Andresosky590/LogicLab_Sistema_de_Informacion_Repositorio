// Pedido tal como lo ve el mesero — coincide con lo que devuelven
// GET /api/pedidos/mesero/:idUsuario (historial propio) y
// GET /api/pedidos/estado/:estado (colas de pendiente/preparando/listo),
// que traen los mismos campos más `detalles`.

double _aDouble(dynamic v) => double.tryParse(v?.toString() ?? "") ?? 0;
int _aInt(dynamic v) => int.tryParse(v?.toString() ?? "") ?? 0;

class ItemPedidoMesero {
  final int idDetalle;
  final int? idPlato;
  final String nombrePlato;
  final int cantidad;
  final double precioFinal;
  final String? notas;
  final int idCategoria;

  ItemPedidoMesero({
    required this.idDetalle,
    required this.idPlato,
    required this.nombrePlato,
    required this.cantidad,
    required this.precioFinal,
    required this.notas,
    required this.idCategoria,
  });

  double get precioUnitario => cantidad > 0 ? precioFinal / cantidad : 0;

  factory ItemPedidoMesero.fromJson(Map<String, dynamic> json) {
    return ItemPedidoMesero(
      idDetalle: _aInt(json['id_Detalle_Pedidos']),
      idPlato: json['id_Platos'] == null ? null : _aInt(json['id_Platos']),
      nombrePlato: json['NombrePlato']?.toString() ?? "Plato",
      cantidad: _aInt(json['CantidadPedido']),
      precioFinal: _aDouble(json['PrecioFinal']),
      notas: json['NotasEspeciales'],
      idCategoria: _aInt(json['id_Categoria']),
    );
  }

  // Para mandar de vuelta en "modificar pedido" con una cantidad nueva,
  // manteniendo el mismo precio unitario.
  ItemPedidoMesero copyWith({int? cantidad}) {
    final nuevaCantidad = cantidad ?? this.cantidad;
    return ItemPedidoMesero(
      idDetalle: idDetalle,
      idPlato: idPlato,
      nombrePlato: nombrePlato,
      cantidad: nuevaCantidad,
      precioFinal: precioUnitario * nuevaCantidad,
      notas: notas,
      idCategoria: idCategoria,
    );
  }
}

class PedidoMesero {
  final int id;
  final DateTime? fecha;
  final String estadoPedido;
  final String estadoPago;
  final double totalPagar;
  final String? metodoPago;
  final int? numeroMesa;
  final String? nombreMesero;
  final List<ItemPedidoMesero> detalles;

  PedidoMesero({
    required this.id,
    required this.fecha,
    required this.estadoPedido,
    required this.estadoPago,
    required this.totalPagar,
    required this.metodoPago,
    required this.numeroMesa,
    required this.nombreMesero,
    required this.detalles,
  });

  bool get esDeHoy {
    if (fecha == null) return false;
    final ahora = DateTime.now();
    return fecha!.year == ahora.year &&
        fecha!.month == ahora.month &&
        fecha!.day == ahora.day;
  }

  bool get pagoAprobado => estadoPago.toLowerCase() == "aprobado";

  List<ItemPedidoMesero> get platos =>
      detalles.where((d) => d.idCategoria != 4).toList();

  List<ItemPedidoMesero> get bebidas =>
      detalles.where((d) => d.idCategoria == 4).toList();

  factory PedidoMesero.fromJson(Map<String, dynamic> json) {
    final detallesJson = json['detalles'];
    return PedidoMesero(
      id: _aInt(json['id_Pedidos']),
      fecha: DateTime.tryParse(json['Fecha_Pedido']?.toString() ?? ""),
      estadoPedido: json['EstadoPedido']?.toString() ?? "pendiente",
      estadoPago: json['EstadoPago']?.toString() ?? "",
      totalPagar: _aDouble(json['TotalPagar']),
      metodoPago: json['MetodoPago'],
      numeroMesa: json['Numero_mesa'] == null
          ? null
          : _aInt(json['Numero_mesa']),
      nombreMesero: json['NombreMesero'],
      detalles: detallesJson is List
          ? detallesJson
                .whereType<Map<String, dynamic>>()
                .map(ItemPedidoMesero.fromJson)
                .toList()
          : <ItemPedidoMesero>[],
    );
  }
}

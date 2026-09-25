// Modelos del reporte de ventas — GET /api/reportes/ventas?periodo=...
//
// OJO con los tipos: las columnas que salen de SUM()/AVG() en MySQL son
// DECIMAL, y el driver las manda como String en el JSON (no como número).
// Por eso todo lo que venga de una suma se parsea con double.tryParse
// sobre toString(), en vez de castear directo a num.

// Períodos que acepta el backend, con su etiqueta para la UI.
enum PeriodoReporte {
  estaSemana("esta_semana", "Esta semana"),
  esteMes("este_mes", "Este mes"),
  mesPasado("mes_pasado", "Mes pasado");

  final String valor;
  final String etiqueta;

  const PeriodoReporte(this.valor, this.etiqueta);
}

double _aDouble(dynamic valor) {
  if (valor == null) return 0;
  return double.tryParse(valor.toString()) ?? 0;
}

int _aInt(dynamic valor) {
  if (valor == null) return 0;
  return int.tryParse(valor.toString()) ?? 0;
}

// ────────────────────────────────────────────────────────────────
// MÉTRICAS GENERALES DEL PERÍODO
// ────────────────────────────────────────────────────────────────

class MetricasReporte {
  final int totalPedidos;
  final int entregados;
  final int cancelados;
  final double ingresosTotales;
  final double ticketPromedio;

  MetricasReporte({
    required this.totalPedidos,
    required this.entregados,
    required this.cancelados,
    required this.ingresosTotales,
    required this.ticketPromedio,
  });

  factory MetricasReporte.fromJson(Map<String, dynamic> json) {
    return MetricasReporte(
      totalPedidos: _aInt(json['total_pedidos']),
      entregados: _aInt(json['entregados']),
      cancelados: _aInt(json['cancelados']),
      ingresosTotales: _aDouble(json['ingresos_totales']),
      ticketPromedio: _aDouble(json['ticket_promedio']),
    );
  }

  // Vacío, para cuando el período no tiene ningún pedido.
  factory MetricasReporte.vacio() {
    return MetricasReporte(
      totalPedidos: 0,
      entregados: 0,
      cancelados: 0,
      ingresosTotales: 0,
      ticketPromedio: 0,
    );
  }
}

// ────────────────────────────────────────────────────────────────
// VENTAS POR DÍA (para la gráfica de barras)
// ────────────────────────────────────────────────────────────────

class VentaPorDia {
  final DateTime? fecha;
  final int pedidos;
  final double ingresos;

  VentaPorDia({
    required this.fecha,
    required this.pedidos,
    required this.ingresos,
  });

  factory VentaPorDia.fromJson(Map<String, dynamic> json) {
    return VentaPorDia(
      fecha: DateTime.tryParse(json['fecha']?.toString() ?? ""),
      pedidos: _aInt(json['pedidos']),
      ingresos: _aDouble(json['ingresos']),
    );
  }

  // Etiqueta corta para el eje de la gráfica: "18/09"
  String get etiquetaCorta {
    if (fecha == null) return "—";
    final dia = fecha!.day.toString().padLeft(2, '0');
    final mes = fecha!.month.toString().padLeft(2, '0');
    return "$dia/$mes";
  }
}

// ────────────────────────────────────────────────────────────────
// RANKING DE PLATOS MÁS VENDIDOS
// ────────────────────────────────────────────────────────────────

class PlatoRanking {
  final String nombrePlato;
  final int vecesPedido;
  final double ingresoGenerado;

  PlatoRanking({
    required this.nombrePlato,
    required this.vecesPedido,
    required this.ingresoGenerado,
  });

  factory PlatoRanking.fromJson(Map<String, dynamic> json) {
    return PlatoRanking(
      nombrePlato: json['NombrePlato']?.toString() ?? "Sin nombre",
      vecesPedido: _aInt(json['veces_pedido']),
      ingresoGenerado: _aDouble(json['ingreso_generado']),
    );
  }
}

// ────────────────────────────────────────────────────────────────
// PAGOS APROBADOS POR MÉTODO
// ────────────────────────────────────────────────────────────────

class PagoPorMetodo {
  final String metodo;
  final int cantidad;
  final double total;

  PagoPorMetodo({
    required this.metodo,
    required this.cantidad,
    required this.total,
  });

  factory PagoPorMetodo.fromJson(Map<String, dynamic> json) {
    return PagoPorMetodo(
      metodo: json['metodo']?.toString() ?? "Sin método",
      cantidad: _aInt(json['cantidad']),
      total: _aDouble(json['total']),
    );
  }
}

// ────────────────────────────────────────────────────────────────
// REPORTE COMPLETO
// ────────────────────────────────────────────────────────────────

class ReporteVentas {
  final MetricasReporte metricas;
  final List<VentaPorDia> porDia;
  final List<PlatoRanking> ranking;
  final List<PagoPorMetodo> porMetodo;

  ReporteVentas({
    required this.metricas,
    required this.porDia,
    required this.ranking,
    required this.porMetodo,
  });

  factory ReporteVentas.fromJson(Map<String, dynamic> json) {
    List<T> lista<T>(
      String clave,
      T Function(Map<String, dynamic>) constructor,
    ) {
      final valor = json[clave];
      if (valor is! List) return <T>[];
      return valor
          .whereType<Map<String, dynamic>>()
          .map(constructor)
          .toList();
    }

    return ReporteVentas(
      metricas: json['metricas'] is Map<String, dynamic>
          ? MetricasReporte.fromJson(json['metricas'])
          : MetricasReporte.vacio(),
      porDia: lista('porDia', VentaPorDia.fromJson),
      ranking: lista('ranking', PlatoRanking.fromJson),
      porMetodo: lista('porMetodo', PagoPorMetodo.fromJson),
    );
  }

  bool get sinDatos => metricas.totalPedidos == 0;
}
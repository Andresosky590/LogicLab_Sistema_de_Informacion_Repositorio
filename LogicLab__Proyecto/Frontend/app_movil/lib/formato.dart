// Formato de números al estilo es-CO (separador de miles con punto).
//
// Están acá y no dentro de una pantalla porque las usan varias:
// reportes_screen, el generador de PDF, y las que vengan después
// (mesero, cocinero) también van a mostrar precios.

String fmtMiles(num valor) {
  final texto = valor.round().abs().toString();
  final buffer = StringBuffer();

  for (int i = 0; i < texto.length; i++) {
    final posDesdeElFinal = texto.length - i;
    buffer.write(texto[i]);
    if (posDesdeElFinal > 1 && posDesdeElFinal % 3 == 1) buffer.write(".");
  }

  return "${valor < 0 ? "-" : ""}$buffer";
}

String fmtPesos(num valor) => "\$${fmtMiles(valor)}";

// Versión compacta para etiquetas donde no cabe el número completo:
// 1.250.000 → "$1,3M", 45.000 → "$45k".
String fmtCompacto(num valor) {
  if (valor >= 1000000) {
    final millones = (valor / 1000000).toStringAsFixed(1).replaceAll('.', ',');
    return "\$${millones}M";
  }
  if (valor >= 1000) return "\$${(valor / 1000).round()}k";
  return "\$${valor.round()}";
}

const _meses = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// "18 de septiembre de 2026" — sin depender del paquete intl.
String fmtFechaLarga(DateTime fecha) {
  return "${fecha.day} de ${_meses[fecha.month - 1]} de ${fecha.year}";
}

// "18/09/2026"
String fmtFechaCorta(DateTime? fecha) {
  if (fecha == null) return "—";
  final dia = fecha.day.toString().padLeft(2, '0');
  final mes = fecha.month.toString().padLeft(2, '0');
  return "$dia/$mes/${fecha.year}";
}
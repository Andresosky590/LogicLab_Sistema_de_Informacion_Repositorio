import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';

import 'models/reporte_model.dart';
import 'formato.dart';

// ================================================================
// GENERADOR DEL PDF DEL REPORTE DE VENTAS
// ================================================================
//
// Equivale al exportarPDF() de la web (Admin/reportes.jsx), que arma
// un HTML y llama a window.print() para que el usuario lo guarde
// como PDF. Acá se construye el PDF de verdad y se abre el diálogo
// de impresión del sistema, donde Android ofrece "Guardar como PDF".
//
// Sobre las fuentes: se usan las que el paquete pdf trae incorporadas
// (Helvetica), que sí manejan tildes y ñ. Por eso en el PDF no se
// usan los emojis de medalla (🥇) del ranking en pantalla — esas
// fuentes no los tienen y saldrían como cuadros vacíos.

const _rojo = PdfColor.fromInt(0xFFCC0011);
const _grisTexto = PdfColor.fromInt(0xFF444444);
const _grisSuave = PdfColor.fromInt(0xFF888888);
const _bordeSuave = PdfColor.fromInt(0xFFDDDDDD);
const _fondoSuave = PdfColor.fromInt(0xFFF7F7F7);

class ReportePdf {
  // Construye el PDF y abre el diálogo de impresión / guardar del
  // sistema. No necesita permisos: quien decide dónde se guarda es
  // el propio Android, no la app.
  static Future<void> generarYCompartir({
    required ReporteVentas reporte,
    required PeriodoReporte periodo,
  }) async {
    final doc = await _construirDocumento(
      reporte: reporte,
      periodo: periodo,
    );

    final bytes = await doc.save();

    await Printing.layoutPdf(
      onLayout: (_) async => bytes,
      name: "Reporte_${periodo.valor}_${_sufijoFecha()}",
    );
  }

  // Variante por si se prefiere el menú de compartir (WhatsApp,
  // Drive, correo) en vez del diálogo de impresión.
  static Future<void> compartir({
    required ReporteVentas reporte,
    required PeriodoReporte periodo,
  }) async {
    final doc = await _construirDocumento(
      reporte: reporte,
      periodo: periodo,
    );

    await Printing.sharePdf(
      bytes: await doc.save(),
      filename: "Reporte_${periodo.valor}_${_sufijoFecha()}.pdf",
    );
  }

  static String _sufijoFecha() {
    final hoy = DateTime.now();
    final mes = hoy.month.toString().padLeft(2, '0');
    final dia = hoy.day.toString().padLeft(2, '0');
    return "${hoy.year}$mes$dia";
  }

  // --------------------------------------------------------------
  // DOCUMENTO
  // --------------------------------------------------------------

  static Future<pw.Document> _construirDocumento({
    required ReporteVentas reporte,
    required PeriodoReporte periodo,
  }) async {
    final doc = pw.Document();

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.fromLTRB(32, 32, 32, 28),

        header: (context) {
          // El encabezado completo solo en la primera página; en las
          // siguientes basta una línea discreta.
          if (context.pageNumber == 1) return pw.SizedBox();
          return pw.Container(
            alignment: pw.Alignment.centerRight,
            margin: const pw.EdgeInsets.only(bottom: 12),
            child: pw.Text(
              "Restaurante Mangata · Reporte de ventas",
              style: const pw.TextStyle(fontSize: 9, color: _grisSuave),
            ),
          );
        },

        footer: (context) => pw.Container(
          alignment: pw.Alignment.centerRight,
          margin: const pw.EdgeInsets.only(top: 10),
          child: pw.Text(
            "Página ${context.pageNumber} de ${context.pagesCount}",
            style: const pw.TextStyle(fontSize: 9, color: _grisSuave),
          ),
        ),

        build: (context) => [
          _encabezado(periodo),
          pw.SizedBox(height: 20),
          _bloqueMetricas(reporte.metricas),
          pw.SizedBox(height: 24),
          _tituloSeccion("INGRESOS POR DÍA"),
          _tablaPorDia(reporte.porDia),
          pw.SizedBox(height: 22),
          _tituloSeccion("PAGOS APROBADOS POR MÉTODO"),
          _tablaPorMetodo(reporte.porMetodo),
          pw.SizedBox(height: 22),
          _tituloSeccion("PLATOS MÁS VENDIDOS"),
          _tablaRanking(reporte.ranking),
        ],
      ),
    );

    return doc;
  }

  // --------------------------------------------------------------
  // ENCABEZADO
  // --------------------------------------------------------------

  static pw.Widget _encabezado(PeriodoReporte periodo) {
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          "RESTAURANTE MANGATA",
          style: pw.TextStyle(
            fontSize: 20,
            fontWeight: pw.FontWeight.bold,
            color: _rojo,
            letterSpacing: 2,
          ),
        ),
        pw.SizedBox(height: 3),
        pw.Text(
          "Reporte de ventas · ${periodo.etiqueta}",
          style: pw.TextStyle(
            fontSize: 12,
            fontWeight: pw.FontWeight.bold,
            color: _grisTexto,
          ),
        ),
        pw.SizedBox(height: 2),
        pw.Text(
          "Generado el ${fmtFechaLarga(DateTime.now())}",
          style: const pw.TextStyle(fontSize: 9.5, color: _grisSuave),
        ),
        pw.SizedBox(height: 10),
        pw.Divider(color: _rojo, thickness: 1.2),
      ],
    );
  }

  static pw.Widget _tituloSeccion(String texto) {
    return pw.Container(
      margin: const pw.EdgeInsets.only(bottom: 8),
      child: pw.Text(
        texto,
        style: pw.TextStyle(
          fontSize: 10.5,
          fontWeight: pw.FontWeight.bold,
          color: _rojo,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  // --------------------------------------------------------------
  // MÉTRICAS
  // --------------------------------------------------------------

  static pw.Widget _bloqueMetricas(MetricasReporte m) {
    return pw.Column(
      children: [
        pw.Row(
          children: [
            _tarjeta("Ingresos del período", fmtPesos(m.ingresosTotales),
                destacada: true),
            pw.SizedBox(width: 10),
            _tarjeta("Ticket promedio", fmtPesos(m.ticketPromedio)),
          ],
        ),
        pw.SizedBox(height: 10),
        pw.Row(
          children: [
            _tarjeta("Pedidos totales", fmtMiles(m.totalPedidos)),
            pw.SizedBox(width: 10),
            _tarjeta("Entregados", fmtMiles(m.entregados)),
            pw.SizedBox(width: 10),
            _tarjeta("Cancelados", fmtMiles(m.cancelados)),
          ],
        ),
      ],
    );
  }

  static pw.Widget _tarjeta(
    String etiqueta,
    String valor, {
    bool destacada = false,
  }) {
    return pw.Expanded(
      child: pw.Container(
        padding: const pw.EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: pw.BoxDecoration(
          color: destacada ? const PdfColor.fromInt(0xFFFFF0F1) : _fondoSuave,
          border: pw.Border.all(color: destacada ? _rojo : _bordeSuave),
          borderRadius: pw.BorderRadius.circular(6),
        ),
        child: pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              etiqueta.toUpperCase(),
              style: const pw.TextStyle(fontSize: 7.5, color: _grisSuave),
            ),
            pw.SizedBox(height: 3),
            pw.Text(
              valor,
              style: pw.TextStyle(
                fontSize: destacada ? 15 : 12.5,
                fontWeight: pw.FontWeight.bold,
                color: destacada ? _rojo : _grisTexto,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // --------------------------------------------------------------
  // TABLAS
  // --------------------------------------------------------------
  //
  // Se arman a mano con pw.Table en vez de usar el atajo
  // Table.fromTextArray, que cambió de lugar entre versiones del
  // paquete pdf y rompería la compilación según cuál se instale.

  static pw.Widget _tabla({
    required List<String> encabezados,
    required List<List<String>> filas,
    required List<int> pesos,
    String mensajeVacio = "Sin datos en este período.",
  }) {
    if (filas.isEmpty) {
      return pw.Container(
        width: double.infinity,
        padding: const pw.EdgeInsets.symmetric(vertical: 14),
        alignment: pw.Alignment.center,
        decoration: pw.BoxDecoration(
          color: _fondoSuave,
          border: pw.Border.all(color: _bordeSuave),
          borderRadius: pw.BorderRadius.circular(6),
        ),
        child: pw.Text(
          mensajeVacio,
          style: const pw.TextStyle(fontSize: 9.5, color: _grisSuave),
        ),
      );
    }

    final anchos = <int, pw.TableColumnWidth>{
      for (int i = 0; i < pesos.length; i++)
        i: pw.FlexColumnWidth(pesos[i].toDouble()),
    };

    return pw.Table(
      columnWidths: anchos,
      border: pw.TableBorder.all(color: _bordeSuave, width: 0.5),
      children: [
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: _fondoSuave),
          children: encabezados
              .map(
                (h) => pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 6,
                  ),
                  child: pw.Text(
                    h,
                    style: pw.TextStyle(
                      fontSize: 8.5,
                      fontWeight: pw.FontWeight.bold,
                      color: _rojo,
                    ),
                  ),
                ),
              )
              .toList(),
        ),
        ...filas.map(
          (fila) => pw.TableRow(
            children: fila
                .map(
                  (celda) => pw.Padding(
                    padding: const pw.EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 5,
                    ),
                    child: pw.Text(
                      celda,
                      style: const pw.TextStyle(
                        fontSize: 9,
                        color: _grisTexto,
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
        ),
      ],
    );
  }

  static pw.Widget _tablaPorDia(List<VentaPorDia> porDia) {
    return _tabla(
      encabezados: const ["Fecha", "Pedidos", "Ingresos"],
      pesos: const [2, 1, 2],
      filas: porDia
          .map(
            (d) => [
              fmtFechaCorta(d.fecha),
              fmtMiles(d.pedidos),
              fmtPesos(d.ingresos),
            ],
          )
          .toList(),
      mensajeVacio: "Sin ingresos registrados en este período.",
    );
  }

  static pw.Widget _tablaPorMetodo(List<PagoPorMetodo> porMetodo) {
    return _tabla(
      encabezados: const ["Método de pago", "Pagos", "Total"],
      pesos: const [3, 1, 2],
      filas: porMetodo
          .map(
            (m) => [m.metodo, fmtMiles(m.cantidad), fmtPesos(m.total)],
          )
          .toList(),
      mensajeVacio: "Sin pagos aprobados en este período.",
    );
  }

  static pw.Widget _tablaRanking(List<PlatoRanking> ranking) {
    return _tabla(
      encabezados: const ["#", "Plato", "Unidades", "Ingreso generado"],
      pesos: const [1, 5, 2, 3],
      filas: List.generate(
        ranking.length,
        (i) => [
          "${i + 1}",
          ranking[i].nombrePlato,
          fmtMiles(ranking[i].vecesPedido),
          fmtPesos(ranking[i].ingresoGenerado),
        ],
      ),
      mensajeVacio: "Sin platos entregados en este período.",
    );
  }
}
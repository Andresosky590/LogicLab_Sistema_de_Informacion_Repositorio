import 'dart:typed_data';
import 'dart:ui' show Color, ImageByteFormat;

import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:qr_flutter/qr_flutter.dart';

import 'models/mesa_model.dart';
import 'repositories/auth_repository.dart' show webBaseUrl;

// ================================================================
// GENERADOR DEL PDF DE QR DE MESAS (HU15)
// ================================================================
//
// Un QR por mesa, en una grilla de 2 columnas, con el número de mesa
// debajo para poder recortar e ir pegando cada uno en su mesa física.
//
// El contenido de cada QR es la URL de la vista del cliente con el
// token de esa mesa: $webBaseUrl/vistacliente?mesa=<QR_Token>.

const _rojo = PdfColor.fromInt(0xFFCC0011);
const _grisTexto = PdfColor.fromInt(0xFF444444);
const _grisSuave = PdfColor.fromInt(0xFF888888);
const _bordeSuave = PdfColor.fromInt(0xFFDDDDDD);

class MesaQrPdf {
  // Construye el PDF con todas las mesas y abre el diálogo de
  // impresión/guardado del sistema (igual que en el reporte de ventas).
  static Future<void> imprimirTodas(List<Mesa> mesas) async {
    final doc = await _construirDocumento(mesas);
    final bytes = await doc.save();

    await Printing.layoutPdf(
      onLayout: (_) async => bytes,
      name: "QR_Mesas_Mangata",
    );
  }

  // Solo el QR de una mesa — para cuando se regenera una sola y no
  // hace falta reimprimir todo el lote.
  static Future<void> imprimirUna(Mesa mesa) async {
    final doc = await _construirDocumento([mesa]);
    final bytes = await doc.save();

    await Printing.layoutPdf(
      onLayout: (_) async => bytes,
      name: "QR_Mesa_${mesa.numero}",
    );
  }

  static Future<pw.Document> _construirDocumento(List<Mesa> mesas) async {
    final doc = pw.Document();

    // Cada QR se genera como imagen PNG con QrPainter, sin necesidad
    // de un widget en pantalla ni de tomarle una captura.
    final imagenes = <pw.MemoryImage>[];
    for (final mesa in mesas) {
      final bytes = await _generarPngQr(_contenidoQr(mesa));
      imagenes.add(pw.MemoryImage(bytes));
    }

    doc.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(28),
        header: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Text(
              "RESTAURANTE MANGATA",
              style: pw.TextStyle(
                fontSize: 16,
                fontWeight: pw.FontWeight.bold,
                color: _rojo,
                letterSpacing: 1.5,
              ),
            ),
            pw.Text(
              "Códigos QR de mesas",
              style: pw.TextStyle(fontSize: 10.5, color: _grisTexto),
            ),
            pw.SizedBox(height: 6),
            pw.Divider(color: _rojo, thickness: 1),
            pw.SizedBox(height: 8),
          ],
        ),
        build: (context) => [
          pw.Wrap(
            spacing: 16,
            runSpacing: 16,
            children: List.generate(mesas.length, (i) {
              return pw.Container(
                width: 220,
                padding: const pw.EdgeInsets.all(14),
                decoration: pw.BoxDecoration(
                  border: pw.Border.all(color: _bordeSuave),
                  borderRadius: pw.BorderRadius.circular(8),
                ),
                child: pw.Column(
                  children: [
                    pw.Image(imagenes[i], width: 170, height: 170),
                    pw.SizedBox(height: 8),
                    pw.Text(
                      "MESA ${mesas[i].numero}",
                      style: pw.TextStyle(
                        fontSize: 13,
                        fontWeight: pw.FontWeight.bold,
                        color: _grisTexto,
                      ),
                    ),
                    pw.SizedBox(height: 2),
                    pw.Text(
                      "Escanea para pedir",
                      style: const pw.TextStyle(
                        fontSize: 8.5,
                        color: _grisSuave,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );

    return doc;
  }

  static String _contenidoQr(Mesa mesa) {
    return "$webBaseUrl/vistacliente?mesa=${mesa.qrToken}";
  }

  static Future<Uint8List> _generarPngQr(String contenido) async {
    final painter = QrPainter(
      data: contenido,
      version: QrVersions.auto,
      gapless: true,
      color: const Color(0xFF000000),
      emptyColor: const Color(0xFFFFFFFF),
    );

    final imagenData = await painter.toImageData(
      600,
      format: ImageByteFormat.png,
    );

    return imagenData!.buffer.asUint8List();
  }
}

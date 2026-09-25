import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../controllers/mesa_controller.dart';
import '../models/mesa_model.dart';
import '../mesa_qr_pdf.dart';
import '../repositories/auth_repository.dart' show webBaseUrl;
import '../widgets/admin_drawer.dart';

// ================================================================
// COLORES — misma paleta neón del resto del panel admin
// ================================================================

const Color _mqNeon = Color(0xFFFF1744);
const Color _mqNeonBorder = Color(0x4DFF1744);
const Color _mqBg = Color(0xFF0A0A0A);
const Color _mqCard = Color(0x0AFFFFFF);
const Color _mqMuted = Color(0xFF888888);

class MesasScreen extends StatefulWidget {
  const MesasScreen({super.key});

  @override
  State<MesasScreen> createState() => _MesasScreenState();
}

class _MesasScreenState extends State<MesasScreen> {
  final _controller = MesaController();

  bool _cargando = true;
  bool _generandoPdf = false;
  String? _error;
  List<Mesa> _mesas = [];

  // Mesas cuyo QR se está regenerando en este momento — para
  // deshabilitar solo su botón, no toda la pantalla.
  final Set<int> _regenerando = {};

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });

    try {
      final mesas = await _controller.cargarMesas();
      if (!mounted) return;
      setState(() {
        _mesas = mesas;
        _cargando = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _cargando = false;
      });
    }
  }

  // ==============================================================
  // REGENERAR
  // ==============================================================

  Future<void> _confirmarRegenerar(Mesa mesa) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF161616),
        title: Text(
          "¿Regenerar QR de la Mesa ${mesa.numero}?",
          style: GoogleFonts.spaceGrotesk(color: Colors.white, fontSize: 15),
        ),
        content: Text(
          "El QR impreso que tengas pegado en esa mesa dejará de funcionar. "
          "Vas a tener que imprimir y pegar el nuevo.",
          style: GoogleFonts.inter(color: _mqMuted, fontSize: 12.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text("Cancelar", style: TextStyle(color: _mqMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text("Regenerar", style: TextStyle(color: _mqNeon)),
          ),
        ],
      ),
    );

    if (confirmar != true) return;
    await _regenerar(mesa);
  }

  Future<void> _regenerar(Mesa mesa) async {
    setState(() => _regenerando.add(mesa.id));

    try {
      await _controller.regenerarQr(mesa.id);
      await _cargar();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: const Color(0xFFE74C3C),
        ),
      );
    } finally {
      if (mounted) setState(() => _regenerando.remove(mesa.id));
    }
  }

  // ==============================================================
  // IMPRIMIR / DESCARGAR
  // ==============================================================

  Future<void> _imprimirTodas() async {
    if (_mesas.isEmpty) return;

    setState(() => _generandoPdf = true);
    try {
      await MesaQrPdf.imprimirTodas(_mesas);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("No se pudo generar el PDF: $e"),
          backgroundColor: const Color(0xFFE74C3C),
        ),
      );
    } finally {
      if (mounted) setState(() => _generandoPdf = false);
    }
  }

  Future<void> _imprimirUna(Mesa mesa) async {
    setState(() => _generandoPdf = true);
    try {
      await MesaQrPdf.imprimirUna(mesa);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("No se pudo generar el PDF: $e"),
          backgroundColor: const Color(0xFFE74C3C),
        ),
      );
    } finally {
      if (mounted) setState(() => _generandoPdf = false);
    }
  }

  String _contenidoQr(Mesa mesa) =>
      "$webBaseUrl/vistacliente?mesa=${mesa.qrToken}";

  // ==============================================================
  // BUILD
  // ==============================================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _mqBg,
      drawer: const AdminDrawer(seccionActiva: "Mesas"),
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          "QR DE MESAS",
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
            fontSize: 13,
          ),
        ),
        actions: [
          IconButton(
            icon: _generandoPdf
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: _mqNeon,
                    ),
                  )
                : const Icon(Icons.print_rounded, color: _mqNeon),
            tooltip: "Imprimir todas",
            onPressed: (_cargando || _generandoPdf || _mesas.isEmpty)
                ? null
                : _imprimirTodas,
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: _mqNeon),
            tooltip: "Actualizar",
            onPressed: _cargando ? null : _cargar,
          ),
        ],
      ),
      body: _buildCuerpo(),
    );
  }

  Widget _buildCuerpo() {
    if (_cargando) {
      return const Center(child: CircularProgressIndicator(color: _mqNeon));
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, color: _mqMuted, size: 40),
              const SizedBox(height: 14),
              Text(
                "No se pudieron cargar las mesas",
                style: GoogleFonts.spaceGrotesk(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: _mqMuted, fontSize: 12.5),
              ),
              const SizedBox(height: 14),
              TextButton(
                onPressed: _cargar,
                child: const Text(
                  "Reintentar",
                  style: TextStyle(color: _mqNeon),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_mesas.isEmpty) {
      return Center(
        child: Text(
          "No hay mesas registradas todavía.",
          style: GoogleFonts.inter(color: _mqMuted, fontSize: 13),
        ),
      );
    }

    return RefreshIndicator(
      color: _mqNeon,
      backgroundColor: Colors.black,
      onRefresh: _cargar,
      child: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 0.72,
        ),
        itemCount: _mesas.length,
        itemBuilder: (context, index) {
          final mesa = _mesas[index];
          return _TarjetaMesa(
            mesa: mesa,
            contenidoQr: _contenidoQr(mesa),
            regenerando: _regenerando.contains(mesa.id),
            onRegenerar: () => _confirmarRegenerar(mesa),
            onImprimir: () => _imprimirUna(mesa),
          );
        },
      ),
    );
  }
}

// ================================================================
// TARJETA DE MESA
// ================================================================

class _TarjetaMesa extends StatelessWidget {
  final Mesa mesa;
  final String contenidoQr;
  final bool regenerando;
  final VoidCallback onRegenerar;
  final VoidCallback onImprimir;

  const _TarjetaMesa({
    required this.mesa,
    required this.contenidoQr,
    required this.regenerando,
    required this.onRegenerar,
    required this.onImprimir,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _mqCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _mqNeonBorder),
      ),
      child: Column(
        children: [
          Text(
            "MESA ${mesa.numero}",
            style: GoogleFonts.spaceGrotesk(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
              ),
              child: regenerando
                  ? const Center(
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: _mqNeon,
                      ),
                    )
                  : QrImageView(
                      data: contenidoQr,
                      version: QrVersions.auto,
                      backgroundColor: Colors.white,
                      padding: EdgeInsets.zero,
                    ),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                onPressed: regenerando ? null : onRegenerar,
                icon: const Icon(Icons.refresh_rounded, size: 19),
                color: _mqNeon,
                tooltip: "Regenerar QR",
                visualDensity: VisualDensity.compact,
              ),
              IconButton(
                onPressed: regenerando ? null : onImprimir,
                icon: const Icon(Icons.print_outlined, size: 19),
                color: Colors.white,
                tooltip: "Imprimir esta mesa",
                visualDensity: VisualDensity.compact,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

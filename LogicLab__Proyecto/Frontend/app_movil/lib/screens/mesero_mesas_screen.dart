import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/mesero_controller.dart';
import '../models/mesa_model.dart';
import 'mesero_placeholder_screen.dart';

// ================================================================
// COLORES — mismos que Hojas_de_Estilo/Mesero.css (--m-verde,
// --m-rojo, --m-naranja, --m-card, --m-border, --m-muted)
// ================================================================
const Color _mVerde = Color(0xFF2ECC71);
const Color _mRojo = Color(0xFFE74C3C);
const Color _mNaranja = Color(0xFFE87D2A);
const Color _mMuted = Color(0xFF888888);
const Color _mBg = Color(0xFF0A0A0A);

// ================================================================
// PANTALLA DE PÁGINA COMPLETA — por si se necesita acceso directo
// a "Mesas" (ej. desde un enlace externo). La vista general del
// mesero (HU21) ya no navega aquí: embebe MesasPanel directamente.
// ================================================================
class MeseroMesasScreen extends StatelessWidget {
  const MeseroMesasScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _mBg,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          "MESAS DEL RESTAURANTE",
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            letterSpacing: 1,
            fontSize: 13,
          ),
        ),
      ),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: MesasPanel(mostrarTitulo: false),
      ),
    );
  }
}

// ================================================================
// PANEL DE MESAS — REUTILIZABLE
// ================================================================
// Se usa tanto en MeseroMesasScreen (pantalla completa) como
// embebido al lado derecho de la vista general del mesero (HU21).
// No trae su propio Scaffold ni Scrollable: quien lo use debe
// colocarlo dentro de un contenedor con scroll (ListView,
// SingleChildScrollView, etc).
class MesasPanel extends StatefulWidget {
  final bool mostrarTitulo;

  const MesasPanel({super.key, this.mostrarTitulo = true});

  @override
  State<MesasPanel> createState() => _MesasPanelState();
}

class _MesasPanelState extends State<MesasPanel> {
  final _controller = MeseroController();

  Timer? _polling;
  bool _cargando = true;
  String? _error;
  List<Mesa> _mesas = [];

  @override
  void initState() {
    super.initState();
    _cargarMesas();

    // Misma cadencia que el polling de 30s en Panel_Mesero.jsx.
    _polling = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _cargarMesas(silencioso: true),
    );
  }

  @override
  void dispose() {
    _polling?.cancel();
    super.dispose();
  }

  Future<void> _cargarMesas({bool silencioso = false}) async {
    if (!silencioso) {
      setState(() {
        _cargando = true;
        _error = null;
      });
    }

    try {
      final mesas = await _controller.cargarMesas();

      if (!mounted) return;

      setState(() {
        _mesas = mesas;
        _error = null;
        _cargando = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _error = e.toString().replaceFirst("MeseroException: ", "");
        _cargando = false;
      });
    }
  }

  void _onMesaTap(Mesa mesa) {
    if (!mesa.disponible) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Mesa ${mesa.numero} está ocupada")),
      );
      return;
    }

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const MeseroPlaceholderScreen(
          titulo: "Pedido asistido",
          icono: Icons.add_circle_outline,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_cargando) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 50),
        child: Center(child: CircularProgressIndicator(color: _mNaranja)),
      );
    }

    if (_error != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 30),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off_rounded, color: _mMuted, size: 36),
            const SizedBox(height: 12),
            Text(
              "No se pudieron cargar las mesas",
              textAlign: TextAlign.center,
              style: GoogleFonts.spaceGrotesk(
                color: Colors.white,
                fontSize: 13.5,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: _mMuted, fontSize: 11.5),
            ),
            const SizedBox(height: 10),
            TextButton(
              onPressed: () => _cargarMesas(),
              child: const Text("Reintentar", style: TextStyle(color: _mNaranja)),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (widget.mostrarTitulo) ...[
          Text(
            "MESAS DEL RESTAURANTE",
            style: GoogleFonts.spaceGrotesk(
              color: _mNaranja,
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 10),
        ],

        // ------------------------------------------------------------
        // LEYENDA (Disponible / Ocupada)
        // ------------------------------------------------------------
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: const [
            _LeyendaBadge(color: _mVerde, texto: "Disponible"),
            _LeyendaBadge(color: _mRojo, texto: "Ocupada"),
          ],
        ),

        const SizedBox(height: 14),

        // ------------------------------------------------------------
        // GRID DE MESAS — el ancho de cada celda es fijo
        // (maxCrossAxisExtent) para que no se deformen sin importar
        // si el panel está a pantalla completa o embebido y angosto.
        // ------------------------------------------------------------
        _mesas.isEmpty
            ? const _SinMesas()
            : GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _mesas.length,
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 105,
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 0.92,
                ),
                itemBuilder: (context, index) {
                  final mesa = _mesas[index];
                  return _MesaCard(mesa: mesa, onTap: () => _onMesaTap(mesa));
                },
              ),
      ],
    );
  }
}

// ================================================================
// LEYENDA
// ================================================================
class _LeyendaBadge extends StatelessWidget {
  final Color color;
  final String texto;

  const _LeyendaBadge({required this.color, required this.texto});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Text(
        texto,
        style: GoogleFonts.inter(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ================================================================
// TARJETA DE MESA
// ================================================================
class _MesaCard extends StatelessWidget {
  final Mesa mesa;
  final VoidCallback onTap;

  const _MesaCard({required this.mesa, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final libre = mesa.disponible;
    final color = libre ? _mVerde : _mRojo;

    return Material(
      color: color.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withValues(alpha: 0.35), width: 2),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                "${mesa.numero}",
                style: GoogleFonts.spaceGrotesk(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 6),
              Text("●", style: TextStyle(color: color, fontSize: 9)),
              const SizedBox(height: 4),
              Text(
                libre ? "DISPONIBLE" : "OCUPADA",
                style: GoogleFonts.inter(
                  color: color,
                  fontSize: 8,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ================================================================
// SIN MESAS
// ================================================================
class _SinMesas extends StatelessWidget {
  const _SinMesas();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Center(
        child: Text(
          "No hay mesas registradas",
          style: GoogleFonts.inter(color: _mMuted, fontSize: 13),
        ),
      ),
    );
  }
}
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/mesero_controller.dart';
import '../formato.dart';
import '../models/pedido_mesero_model.dart';
import '../notificacion_sonido.dart';
import '../widgets/mesero_drawer.dart';

const Color _mNaranja = Color(0xFFE87D2A);
const Color _mNaranjaBorder = Color(0x4DE87D2A);
const Color _mBg = Color(0xFF0A0A0A);
const Color _mCard = Color(0x0AFFFFFF);
const Color _mMuted = Color(0xFF888888);
const Color _mVerdeOk = Color(0xFF19A971);

// Cuánto tiempo se destaca visualmente un pedido recién marcado como
// listo (borde + chip "NUEVO") antes de volver a verse normal.
const Duration _duracionDestacado = Duration(seconds: 12);

class MeseroMensajesCocinaScreen extends StatefulWidget {
  const MeseroMensajesCocinaScreen({super.key});

  @override
  State<MeseroMensajesCocinaScreen> createState() =>
      _MeseroMensajesCocinaScreenState();
}

class _MeseroMensajesCocinaScreenState
    extends State<MeseroMensajesCocinaScreen> {
  final _controller = MeseroController();

  bool _cargando = true;
  String? _error;
  List<PedidoMesero> _pedidos = [];
  final Set<int> _entregando = {};

  // ==============================================================
  // ALERTAS DE PEDIDOS LISTOS
  // ==============================================================
  //
  // Antes esta pantalla solo cargaba una vez al entrar — si el
  // mesero no volvía a abrirla, nunca se enteraba de que un plato
  // ya estaba listo para recoger. Ahora hace polling como el resto
  // de la app, y avisa con vibración + sonido + un banner cada vez
  // que aparece un pedido "listo" que no se le había mostrado antes
  // (_idsConocidos guarda cuáles ya se mostraron).
  Timer? _polling;
  final Set<int> _idsConocidos = {};
  final Set<int> _idsRecientes = {};
  bool _primeraCarga = true;

  @override
  void initState() {
    super.initState();
    _cargar();
    // Se bajó de 15s a 4s para que el mesero se entere casi al
    // instante de que el cocinero marcó un plato como listo.
    _polling = Timer.periodic(
      const Duration(seconds: 4),
      (_) => _cargar(silencioso: true),
    );
  }

  @override
  void dispose() {
    _polling?.cancel();
    super.dispose();
  }

  Future<void> _cargar({bool silencioso = false}) async {
    if (!silencioso) {
      setState(() {
        _cargando = true;
        _error = null;
      });
    }
    try {
      final pedidos = await _controller.cargarPorEstado("listo");
      if (!mounted) return;

      // En la primera carga (al entrar a la pantalla) no se alerta:
      // esos pedidos ya estaban listos antes de que el mesero abriera
      // la pantalla, no acaban de llegar recién ahora.
      if (!_primeraCarga) {
        final nuevos = pedidos
            .where((p) => !_idsConocidos.contains(p.id))
            .toList();
        if (nuevos.isNotEmpty) _alertarPedidosListos(nuevos);
      }

      setState(() {
        _pedidos = pedidos;
        _idsConocidos
          ..clear()
          ..addAll(pedidos.map((p) => p.id));
        _cargando = false;
        _primeraCarga = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _cargando = false;
      });
    }
  }

  void _alertarPedidosListos(List<PedidoMesero> nuevos) {
    HapticFeedback.mediumImpact();
    NotificacionSonido.reproducir();

    setState(() => _idsRecientes.addAll(nuevos.map((p) => p.id)));
    Future.delayed(_duracionDestacado, () {
      if (!mounted) return;
      setState(() => _idsRecientes.removeAll(nuevos.map((p) => p.id)));
    });

    final mensaje = nuevos.length == 1
        ? "🔔 ¡Pedido listo! Mesa ${nuevos.first.numeroMesa ?? "—"} — ve a recogerlo"
        : "🔔 ${nuevos.length} pedidos listos para recoger";

    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: _mVerdeOk,
        duration: const Duration(seconds: 4),
        content: Text(
          mensaje,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  Future<void> _entregar(PedidoMesero p) async {
    setState(() => _entregando.add(p.id));
    try {
      await _controller.entregarPedido(p.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("¡Pedido entregado en mesa!")),
      );
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
      if (mounted) setState(() => _entregando.remove(p.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _mBg,
      drawer: const MeseroDrawer(seccionActiva: "Mensajes cocina"),
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          "MENSAJES COCINA",
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 13,
            letterSpacing: 1.2,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: _mNaranja),
            onPressed: _cargando ? null : _cargar,
          ),
        ],
      ),
      body: _buildCuerpo(),
    );
  }

  Widget _buildCuerpo() {
    if (_cargando) {
      return const Center(child: CircularProgressIndicator(color: _mNaranja));
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, color: _mMuted, size: 40),
              const SizedBox(height: 14),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: _mMuted, fontSize: 12.5),
              ),
              const SizedBox(height: 14),
              TextButton(
                onPressed: _cargar,
                child: const Text(
                  "Reintentar",
                  style: TextStyle(color: _mNaranja),
                ),
              ),
            ],
          ),
        ),
      );
    }
    if (_pedidos.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.notifications_none_rounded,
              color: _mMuted,
              size: 40,
            ),
            const SizedBox(height: 12),
            Text(
              "No hay pedidos listos por ahora.",
              style: GoogleFonts.inter(color: _mMuted, fontSize: 13),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: _mNaranja,
      backgroundColor: Colors.black,
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: _pedidos.map((p) {
          final entregando = _entregando.contains(p.id);
          final esReciente = _idsRecientes.contains(p.id);
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: esReciente ? const Color(0x2619A971) : _mCard,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: _mVerdeOk, width: esReciente ? 2 : 1),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.notifications_active_rounded,
                  color: Color(0xFF19A971),
                  size: 22,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Mesa ${p.numeroMesa ?? "—"} · Pedido #${p.id}",
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        fmtPesos(p.totalPagar),
                        style: GoogleFonts.inter(color: _mMuted, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                if (esReciente) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 3,
                    ),
                    decoration: BoxDecoration(
                      color: _mVerdeOk,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      "NUEVO",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                ElevatedButton(
                  onPressed: entregando ? null : () => _entregar(p),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF19A971),
                    foregroundColor: Colors.white,
                  ),
                  child: Text(entregando ? "..." : "Entregar"),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

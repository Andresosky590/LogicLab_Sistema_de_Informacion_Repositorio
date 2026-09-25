import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/cocinero_controller.dart';
import '../models/pedido_cocina_model.dart';
import '../notificacion_sonido.dart';

const Color _cVerde = Color(0xFF39FF14);
const Color _cVerdeSoft = Color(0x2639FF14);
const Color _cCard = Color(0x0AFFFFFF);
const Color _cBorder = Color(0x14FFFFFF);
const Color _cMuted = Color(0xFF888888);
const Color _cBg = Color(0xFF0A0A0A);
const Color _cAmarillo = Color(0xFFF1C40F);

// Cuánto tiempo se destaca visualmente una tarjeta recién llegada
// (borde amarillo + chip "NUEVO") antes de volver a verse normal.
const Duration _duracionDestacado = Duration(seconds: 12);

class CocineroPedidosScreen extends StatefulWidget {
  const CocineroPedidosScreen({super.key});

  @override
  State<CocineroPedidosScreen> createState() => _CocineroPedidosScreenState();
}

class _CocineroPedidosScreenState extends State<CocineroPedidosScreen> {
  final _controller = CocineroController();

  Timer? _polling;
  bool _cargando = true;
  String? _error;
  List<PedidoCocina> _pedidos = [];
  final Set<int> _marcando = {};

  // ==============================================================
  // ALERTAS DE PEDIDOS NUEVOS
  // ==============================================================
  //
  // El mesero manda un pedido a cocina cambiándolo a "preparando"
  // (MeseroMensajesClienteScreen → enviarACocina). Esta pantalla ya
  // hacía polling cada 15s para traer la cola actualizada, pero lo
  // hacía en silencio: un pedido nuevo aparecía en la lista sin que
  // el cocinero se enterara si no estaba mirando la pantalla en ese
  // instante. _idsConocidos guarda qué pedidos ya se le mostraron,
  // para poder distinguir "esto ya estaba" de "esto acaba de
  // llegar" en cada vuelta del polling.
  final Set<int> _idsConocidos = {};
  final Set<int> _idsRecientes = {};
  bool _primeraCarga = true;

  @override
  void initState() {
    super.initState();
    _cargar();
    // Antes esperaba 15s como el resto de la app — se bajó a 4s para
    // que el cocinero se entere casi al instante de que el mesero
    // mandó un pedido nuevo, sin tener que esperar la vuelta larga
    // del polling.
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
      final pedidos = await _controller.cargarPreparando();
      if (!mounted) return;

      // En la primera carga (al entrar a la pantalla) NO se alerta
      // por nada: esos pedidos ya estaban ahí antes de que el
      // cocinero abriera la pantalla, no acaban de llegar. Recién a
      // partir de la segunda vuelta del polling se compara contra
      // lo que ya se había mostrado.
      if (!_primeraCarga) {
        final nuevos = pedidos
            .where((p) => !_idsConocidos.contains(p.id))
            .toList();
        if (nuevos.isNotEmpty) _alertarNuevosPedidos(nuevos);
      }

      setState(() {
        _pedidos = pedidos;
        _idsConocidos
          ..clear()
          ..addAll(pedidos.map((p) => p.id));
        _error = null;
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

  void _alertarNuevosPedidos(List<PedidoCocina> nuevos) {
    HapticFeedback.mediumImpact();
    NotificacionSonido.reproducir();

    setState(() => _idsRecientes.addAll(nuevos.map((p) => p.id)));
    // Quita el destacado visual solo de estos pedidos después de un
    // rato — sin tocar los que hayan llegado (o vuelto a llegar)
    // mientras tanto.
    Future.delayed(_duracionDestacado, () {
      if (!mounted) return;
      setState(() => _idsRecientes.removeAll(nuevos.map((p) => p.id)));
    });

    final mensaje = nuevos.length == 1
        ? "🔔 Nuevo pedido — Mesa ${nuevos.first.numeroMesa ?? "—"}"
        : "🔔 ${nuevos.length} pedidos nuevos en cocina";

    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: const Color(0xFF19A971),
        duration: const Duration(seconds: 4),
        content: Text(
          mensaje,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  Future<void> _marcarListo(PedidoCocina pedido) async {
    // Suena de inmediato al tocar el botón, sin esperar al polling
    // de la pantalla del mesero.
    HapticFeedback.mediumImpact();
    NotificacionSonido.reproducir();

    setState(() => _marcando.add(pedido.id));
    try {
      await _controller.marcarComoListo(pedido.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("¡El pedido está listo para ser entregado!"),
        ),
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
      if (mounted) setState(() => _marcando.remove(pedido.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _cBg,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          "PEDIDOS ENTRANTES",
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 13,
            letterSpacing: 1.2,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: _cVerde),
            onPressed: _cargando ? null : () => _cargar(),
          ),
        ],
      ),
      body: _buildCuerpo(),
    );
  }

  Widget _buildCuerpo() {
    if (_cargando) {
      return const Center(child: CircularProgressIndicator(color: _cVerde));
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, color: _cMuted, size: 40),
              const SizedBox(height: 14),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: _cMuted, fontSize: 12.5),
              ),
              const SizedBox(height: 14),
              TextButton(
                onPressed: () => _cargar(),
                child: const Text(
                  "Reintentar",
                  style: TextStyle(color: _cVerde),
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
            const Icon(Icons.soup_kitchen_outlined, color: _cMuted, size: 40),
            const SizedBox(height: 12),
            Text(
              "No hay pedidos pendientes. ¡Buen trabajo Chef!",
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: _cMuted, fontSize: 13),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      color: _cVerde,
      backgroundColor: Colors.black,
      onRefresh: () => _cargar(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: _pedidos.map(_tarjeta).toList(),
      ),
    );
  }

  Widget _tarjeta(PedidoCocina pedido) {
    final marcando = _marcando.contains(pedido.id);
    final esReciente = _idsRecientes.contains(pedido.id);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: esReciente ? const Color(0x26F1C40F) : _cCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: esReciente ? _cAmarillo : _cBorder,
          width: esReciente ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: _cVerdeSoft,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  "MESA ${pedido.numeroMesa ?? "—"}",
                  style: GoogleFonts.inter(
                    color: _cVerde,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  "Pedido #${pedido.id}",
                  style: GoogleFonts.spaceGrotesk(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              if (esReciente)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: _cAmarillo,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    "NUEVO",
                    style: TextStyle(
                      color: Colors.black,
                      fontSize: 9.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 10),
          if (pedido.platos.isNotEmpty) ..._grupo("Platos", pedido.platos),
          if (pedido.bebidas.isNotEmpty) ..._grupo("Bebidas", pedido.bebidas),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: marcando ? null : () => _marcarListo(pedido),
              style: ElevatedButton.styleFrom(
                backgroundColor: _cVerde,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 11),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(9),
                ),
              ),
              child: Text(
                marcando ? "..." : "Marcar como listo",
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _grupo(String titulo, List<ItemPedidoCocina> items) {
    return [
      Text(
        titulo,
        style: GoogleFonts.inter(
          color: _cMuted,
          fontSize: 10.5,
          fontWeight: FontWeight.w700,
        ),
      ),
      const SizedBox(height: 3),
      ...items.map(
        (d) => Padding(
          padding: const EdgeInsets.only(bottom: 3),
          child: Text(
            "${d.cantidad}x ${d.nombrePlato}${(d.notas ?? "").isNotEmpty ? " — ${d.notas}" : ""}",
            style: GoogleFonts.inter(color: Colors.white, fontSize: 12.5),
          ),
        ),
      ),
      const SizedBox(height: 6),
    ];
  }
}

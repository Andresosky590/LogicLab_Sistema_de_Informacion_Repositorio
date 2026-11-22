import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/mesero_controller.dart';
import '../formato.dart';
import '../models/pedido_mesero_model.dart';
import '../notificacion_sonido.dart';
import '../repositories/mesero_repository.dart' show metodosPagoCierre;
import '../widgets/mesero_drawer.dart';
import 'mesero_editar_pedido_screen.dart';

const Color _mNaranja = Color(0xFFE87D2A);
const Color _mNaranjaSoft = Color(0x26E87D2A);
const Color _mNaranjaBorder = Color(0x4DE87D2A);
const Color _mAmarillo = Color(0xFFF1C40F);
const Color _mBg = Color(0xFF0A0A0A);
const Color _mCard = Color(0x0AFFFFFF);
const Color _mMuted = Color(0xFF888888);
const Color _mRojo = Color(0xFFE74C3C);

// Cuánto tiempo se destaca visualmente un pedido de cliente recién
// llegado (borde amarillo + chip "NUEVO") antes de volver a verse normal.
const Duration _duracionDestacado = Duration(seconds: 12);

class MeseroMensajesClienteScreen extends StatefulWidget {
  const MeseroMensajesClienteScreen({super.key});

  @override
  State<MeseroMensajesClienteScreen> createState() =>
      _MeseroMensajesClienteScreenState();
}

class _MeseroMensajesClienteScreenState
    extends State<MeseroMensajesClienteScreen> {
  final _controller = MeseroController();

  Timer? _polling;
  bool _cargando = true;
  String? _error;
  List<PedidoMesero> _pedidos = [];
  final Set<int> _procesando = {};
  int? _miId;

  // Solo se alerta por pedidos que no se habían mostrado antes
  // (nunca en la primera carga).
  final Set<int> _idsConocidos = {};
  final Set<int> _idsRecientes = {};
  bool _primeraCarga = true;

  @override
  void initState() {
    super.initState();
    _controller.obtenerIdUsuario().then((id) {
      if (mounted) setState(() => _miId = id);
    });
    _cargar();
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
      final resultados = await Future.wait([
        _controller.cargarPorEstado("pendiente"),
        _controller.cargarPorEstado("preparando"),
      ]);
      if (!mounted) return;

      final pedidos = [...resultados[0], ...resultados[1]];

      // Solo se avisa por pedidos "pendiente" nuevos: son los que un
      // cliente acaba de mandar sin que ningún mesero lo haya tomado.
      if (!_primeraCarga) {
        final nuevos = resultados[0]
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
      if (silencioso) {
        setState(() => _cargando = false);
        return;
      }
      setState(() {
        _error = e.toString();
        _cargando = false;
      });
    }
  }

  void _alertarNuevosPedidos(List<PedidoMesero> nuevos) {
    HapticFeedback.mediumImpact();
    NotificacionSonido.reproducir();

    setState(() => _idsRecientes.addAll(nuevos.map((p) => p.id)));
    Future.delayed(_duracionDestacado, () {
      if (!mounted) return;
      setState(() => _idsRecientes.removeAll(nuevos.map((p) => p.id)));
    });

    final mensaje = nuevos.length == 1
        ? "🔔 Nuevo pedido — Mesa ${nuevos.first.numeroMesa ?? "—"}"
        : "🔔 ${nuevos.length} pedidos nuevos de clientes";

    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        backgroundColor: _mNaranja,
        duration: const Duration(seconds: 4),
        content: Text(
          mensaje,
          style: const TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  // ==============================================================
  // RESTRICCIÓN: el pedido debe estar tomado por el mesero logueado
  // ==============================================================

  bool _esMio(PedidoMesero p) => p.idMesero != null && p.idMesero == _miId;

  void _mostrarAviso(String mensaje) {
    showDialog<void>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF161616),
        title: Text(
          "Aviso",
          style: GoogleFonts.spaceGrotesk(color: Colors.white, fontSize: 15),
        ),
        content: Text(
          mensaje,
          style: GoogleFonts.inter(color: _mMuted, fontSize: 12.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text("Entendido", style: TextStyle(color: _mNaranja)),
          ),
        ],
      ),
    );
  }

  // true si el mesero logueado puede seguir; si no, muestra el aviso.
  bool _exigirPedidoTomado(PedidoMesero p) {
    if (_esMio(p)) return true;
    _mostrarAviso(
      p.idMesero != null
          ? "🔒 Este pedido lo atiende ${p.nombreMesero ?? "otro mesero"}.\n\nSolo ese mesero puede modificarlo, cobrarlo, cancelarlo o enviarlo a cocina."
          : "⚠️ Primero debes tomar el pedido.\n\nToca \"Tomar pedido\" en esta tarjeta antes de continuar.",
    );
    return false;
  }

  Future<void> _accion(int id, Future<void> Function() accion) async {
    setState(() => _procesando.add(id));
    try {
      await accion();
      await _cargar();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: _mRojo),
      );
      // Si el servidor rechazó la acción (p. ej. otro mesero tomó el
      // pedido primero), se refresca para mostrar el estado real.
      await _cargar(silencioso: true);
    } finally {
      if (mounted) setState(() => _procesando.remove(id));
    }
  }

  // Suena de inmediato al tocar el botón — no espera al polling de la
  // pantalla de cocina para confirmarle al mesero que sí se envió.
  void _enviarACocina(PedidoMesero p) {
    if (!_exigirPedidoTomado(p)) return;
    HapticFeedback.mediumImpact();
    NotificacionSonido.reproducir();
    _accion(p.id, () => _controller.enviarACocina(p.id));
  }

  Future<void> _tomarPedido(PedidoMesero p) async {
    if (_esMio(p)) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("Este pedido ya es tuyo.")));
      return;
    }
    if (p.idMesero != null) {
      _mostrarAviso(
        "🔒 Este pedido ya fue tomado por ${p.nombreMesero ?? "otro mesero"}.\n\nSolo ese mesero puede atenderlo.",
      );
      return;
    }
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF161616),
        title: Text(
          "Pedido #${p.id}",
          style: GoogleFonts.spaceGrotesk(color: Colors.white, fontSize: 15),
        ),
        content: Text(
          "¿Tomar este pedido?",
          style: GoogleFonts.inter(color: _mMuted, fontSize: 12.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text("Cancelar", style: TextStyle(color: _mMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text("Tomar", style: TextStyle(color: _mNaranja)),
          ),
        ],
      ),
    );
    if (confirmar == true) _accion(p.id, () => _controller.tomarPedido(p.id));
  }

  Future<void> _cancelarPedido(PedidoMesero p) async {
    if (!_exigirPedidoTomado(p)) return;
    final motivoCtrl = TextEditingController();
    final motivo = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: const Color(0xFF121212),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (_) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 18,
          bottom: 24 + MediaQuery.of(context).viewInsets.bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Cancelar Pedido #${p.id}",
              style: GoogleFonts.spaceGrotesk(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: motivoCtrl,
              maxLines: 3,
              style: GoogleFonts.inter(color: Colors.white, fontSize: 13.5),
              decoration: InputDecoration(
                hintText: "Motivo de la cancelación...",
                hintStyle: GoogleFonts.inter(color: _mMuted, fontSize: 13),
                filled: true,
                fillColor: const Color(0x14FFFFFF),
                contentPadding: const EdgeInsets.all(12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text("Volver", style: TextStyle(color: _mMuted)),
                ),
                const SizedBox(width: 6),
                ElevatedButton(
                  onPressed: () {
                    if (motivoCtrl.text.trim().isEmpty) return;
                    Navigator.of(context).pop(motivoCtrl.text.trim());
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _mRojo,
                    foregroundColor: Colors.white,
                  ),
                  child: const Text("Confirmar"),
                ),
              ],
            ),
          ],
        ),
      ),
    );
    if (motivo != null && motivo.isNotEmpty) {
      _accion(p.id, () => _controller.cancelarPedido(p.id, motivo));
    }
  }

  Future<void> _modificarPedido(PedidoMesero p) async {
    if (p.estadoPedido != "pendiente") {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Solo se puede modificar mientras está Pendiente."),
        ),
      );
      return;
    }
    if (!_exigirPedidoTomado(p)) return;
    // El editor detallado hace sus cambios directo contra el backend
    // (uno por uno, ver mesero_editar_pedido_screen.dart) — al volver
    // solo hace falta refrescar la lista para ver el resultado.
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => MeseroEditarPedidoScreen(pedidoInicial: p),
      ),
    );
    await _cargar();
  }

  Future<void> _cobrarEnPersona(PedidoMesero p) async {
    if (!_exigirPedidoTomado(p)) return;
    final metodo = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: const Color(0xFF121212),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (_) => _HojaCobrarPresencial(pedido: p),
    );
    if (metodo == null) return;

    _accion(p.id, () => _controller.marcarPagoPresencial(p.id, metodo));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _mBg,
      drawer: const MeseroDrawer(seccionActiva: "Pedidos clientes"),
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          "PEDIDOS CLIENTES",
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
        child: Text(
          "No hay pedidos pendientes o en preparación.",
          style: GoogleFonts.inter(color: _mMuted, fontSize: 13),
        ),
      );
    }

    return RefreshIndicator(
      color: _mNaranja,
      backgroundColor: Colors.black,
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: _pedidos.map(_tarjeta).toList(),
      ),
    );
  }

  Widget _tarjeta(PedidoMesero p) {
    final procesando = _procesando.contains(p.id);
    final esReciente = _idsRecientes.contains(p.id);
    final mio = _esMio(p);
    final tomadoPorOtro = p.idMesero != null && !mio;

    final Color chipFondo = mio
        ? const Color(0x2619A971)
        : tomadoPorOtro
        ? const Color(0x14FFFFFF)
        : _mNaranjaSoft;
    final Color chipTexto = mio
        ? const Color(0xFF19A971)
        : tomadoPorOtro
        ? const Color(0xFFAAAAAA)
        : _mNaranja;
    final String chipLabel = mio
        ? "✔ Tomado por ti"
        : tomadoPorOtro
        ? "🔒 Tomado por ${p.nombreMesero ?? "otro mesero"}"
        : "Tomar pedido";

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: esReciente ? const Color(0x26F1C40F) : _mCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: esReciente ? _mAmarillo : _mNaranjaBorder,
          width: esReciente ? 1.5 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              if (esReciente)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: _mAmarillo,
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
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: _mNaranjaSoft,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  "MESA ${p.numeroMesa ?? "—"}",
                  style: GoogleFonts.inter(
                    color: _mNaranja,
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              GestureDetector(
                onTap: procesando ? null : () => _tomarPedido(p),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: chipFondo,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    chipLabel,
                    style: GoogleFonts.inter(
                      color: chipTexto,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              Text(
                fmtPesos(p.totalPagar),
                style: GoogleFonts.spaceGrotesk(
                  color: Colors.white,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          if (!mio) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: _mNaranjaSoft,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                tomadoPorOtro
                    ? "🔒 Este pedido lo atiende ${p.nombreMesero ?? "otro mesero"}. Solo puedes verlo."
                    : "⚠️ Toma este pedido para poder modificarlo, cobrarlo o enviarlo a cocina.",
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  color: _mNaranja,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
          const SizedBox(height: 10),
          if (p.platos.isNotEmpty) ..._grupo("Platos", p.platos),
          if (p.bebidas.isNotEmpty) ..._grupo("Bebidas", p.bebidas),
          const SizedBox(height: 10),
          // Atenuado pero tocable a propósito: al tocar sin haber
          // tomado el pedido sale el aviso de _exigirPedidoTomado.
          Opacity(
            opacity: mio ? 1 : 0.45,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: (procesando || p.estadoPedido != "pendiente")
                            ? null
                            : () => _modificarPedido(p),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: _mNaranja),
                          padding: const EdgeInsets.symmetric(vertical: 9),
                        ),
                        child: Text(
                          "Modificar",
                          style: GoogleFonts.inter(
                            color: _mNaranja,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: procesando ? null : () => _cancelarPedido(p),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: _mRojo),
                          padding: const EdgeInsets.symmetric(vertical: 9),
                        ),
                        child: Text(
                          "Cancelar",
                          style: GoogleFonts.inter(
                            color: _mRojo,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                if (p.estadoPedido == "pendiente") ...[
                  if (!p.pagoAprobado) ...[
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: procesando ? null : () => _cobrarEnPersona(p),
                      icon: const Icon(
                        Icons.payments_outlined,
                        size: 16,
                        color: _mAmarillo,
                      ),
                      label: Text(
                        "Cobrar aquí (opcional, si el cliente ya te va a pagar)",
                        style: GoogleFonts.inter(
                          color: _mAmarillo,
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: _mAmarillo),
                        padding: const EdgeInsets.symmetric(vertical: 9),
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  // El pago NO es requisito para mandar a cocina — el
                  // cliente paga después, mientras se prepara.
                  ElevatedButton(
                    onPressed: procesando ? null : () => _enviarACocina(p),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _mNaranja,
                      foregroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      disabledBackgroundColor: _mNaranja.withValues(
                        alpha: 0.25,
                      ),
                    ),
                    child: Text(
                      procesando ? "..." : "Enviar a cocina",
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _grupo(String titulo, List<ItemPedidoMesero> items) {
    return [
      Text(
        titulo,
        style: GoogleFonts.inter(
          color: _mMuted,
          fontSize: 10.5,
          fontWeight: FontWeight.w700,
        ),
      ),
      const SizedBox(height: 3),
      ...items.map(
        (d) => Padding(
          padding: const EdgeInsets.only(bottom: 3),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  "${d.cantidad}x ${d.nombrePlato}",
                  style: GoogleFonts.inter(color: Colors.white, fontSize: 12.5),
                ),
              ),
              Text(
                fmtPesos(d.precioFinal),
                style: GoogleFonts.inter(color: _mMuted, fontSize: 11.5),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 6),
    ];
  }
}

// ================================================================
// HOJA: cobrar en persona un pedido que el cliente armó por su
// cuenta desde el QR pero prefiere pagarte a ti directamente (en
// vez de usar la pasarela online). Solo marca el pago — el pedido
// sigue su camino normal hacia cocina, no salta a "entregado" como
// sí hace "Cerrar cuenta" (esa es para cuando ya se sirvió la comida).
// ================================================================

class _HojaCobrarPresencial extends StatelessWidget {
  final PedidoMesero pedido;
  const _HojaCobrarPresencial({required this.pedido});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "COBRAR EN PERSONA",
            style: GoogleFonts.spaceGrotesk(
              color: _mAmarillo,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            "Pedido #${pedido.id} · ${fmtPesos(pedido.totalPagar)}",
            style: GoogleFonts.spaceGrotesk(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            "¿Con qué te paga el cliente?",
            style: GoogleFonts.inter(color: _mMuted, fontSize: 12),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: metodosPagoCierre
                .map(
                  (m) => GestureDetector(
                    onTap: () => Navigator.of(context).pop(m),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0x26F1C40F),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: _mAmarillo),
                      ),
                      child: Text(
                        m,
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                )
                .toList(),
          ),
        ],
      ),
    );
  }
}

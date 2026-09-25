import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/mesero_controller.dart';
import '../formato.dart';
import '../models/pedido_mesero_model.dart';
import '../repositories/mesero_repository.dart' show metodosPagoCierre;
import '../widgets/mesero_drawer.dart';

const Color _mNaranja = Color(0xFFE87D2A);
const Color _mNaranjaSoft = Color(0x26E87D2A);
const Color _mNaranjaBorder = Color(0x4DE87D2A);
const Color _mBg = Color(0xFF0A0A0A);
const Color _mCard = Color(0x0AFFFFFF);
const Color _mMuted = Color(0xFF888888);
const Color _mRojo = Color(0xFFE74C3C);

const Map<String, Color> _colorEstado = {
  "pendiente": Color(0xFFF1C40F),
  "preparando": Color(0xFF2FC8FF),
  "listo": Color(0xFF19A971),
  "entregado": Color(0xFF888888),
  "cancelado": Color(0xFFE74C3C),
};

class MeseroPedidosScreen extends StatefulWidget {
  const MeseroPedidosScreen({super.key});

  @override
  State<MeseroPedidosScreen> createState() => _MeseroPedidosScreenState();
}

class _MeseroPedidosScreenState extends State<MeseroPedidosScreen> {
  final _controller = MeseroController();

  bool _cargando = true;
  String? _error;
  ResumenMesero? _resumen;
  final Set<int> _cerrando = {};

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
      final resumen = await _controller.cargarResumen();
      if (!mounted) return;
      setState(() {
        _resumen = resumen;
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

  Future<void> _abrirCerrarCuenta(PedidoMesero pedido) async {
    final metodo = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: const Color(0xFF121212),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (_) => _HojaMetodoPago(pedido: pedido),
    );
    if (metodo == null) return;

    setState(() => _cerrando.add(pedido.id));
    try {
      await _controller.cerrarCuenta(pedido.id, metodo);
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
      if (mounted) setState(() => _cerrando.remove(pedido.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _mBg,
      drawer: const MeseroDrawer(seccionActiva: "Mis pedidos"),
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          "MIS PEDIDOS",
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

    final resumen = _resumen!;

    return RefreshIndicator(
      color: _mNaranja,
      backgroundColor: Colors.black,
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                child: _mini("Pedidos hoy", fmtMiles(resumen.pedidosHoy)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _mini("Entregados", fmtMiles(resumen.entregadosHoy)),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _mini("Cobrado hoy", fmtPesos(resumen.cobradoHoy)),
              ),
            ],
          ),
          const SizedBox(height: 18),
          if (resumen.historial.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 40),
              child: Center(
                child: Text(
                  "Sin pedidos registrados",
                  style: GoogleFonts.inter(color: _mMuted, fontSize: 13),
                ),
              ),
            )
          else
            ...resumen.historial.map((p) => _tarjetaPedido(p)),
        ],
      ),
    );
  }

  Widget _mini(String etiqueta, String valor) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: _mCard,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _mNaranjaBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            etiqueta.toUpperCase(),
            style: GoogleFonts.inter(color: _mMuted, fontSize: 8.5),
          ),
          const SizedBox(height: 3),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              valor,
              style: GoogleFonts.spaceGrotesk(
                color: _mNaranja,
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tarjetaPedido(PedidoMesero p) {
    final color = _colorEstado[p.estadoPedido] ?? _mMuted;
    // Cerrar cuenta solo tiene sentido si ya se entregó y el pago
    // sigue sin marcarse como aprobado — si ya está aprobado (pagó en
    // línea o ya se cerró antes), no hay nada que cerrar.
    final puedeCerrar = p.estadoPedido == "entregado" && !p.pagoAprobado;
    final cerrando = _cerrando.contains(p.id);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _mCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _mNaranjaBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                "#${p.id}",
                style: GoogleFonts.spaceGrotesk(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                "Mesa ${p.numeroMesa ?? "—"}",
                style: GoogleFonts.inter(color: _mMuted, fontSize: 12),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  p.estadoPedido.toUpperCase(),
                  style: GoogleFonts.inter(
                    color: color,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(
                p.pagoAprobado
                    ? Icons.check_circle_rounded
                    : p.estadoPedido == "cancelado"
                    ? Icons.cancel_outlined
                    : Icons.hourglass_bottom_rounded,
                size: 13,
                color: p.pagoAprobado
                    ? const Color(0xFF19A971)
                    : p.estadoPedido == "cancelado"
                    ? _mRojo
                    : const Color(0xFFF1C40F),
              ),
              const SizedBox(width: 5),
              Text(
                // Si se canceló sin haberse pagado nunca, se distingue
                // de un "pendiente" normal — este ya no va a pagarse.
                p.pagoAprobado
                    ? "Pagado · ${p.metodoPago ?? "Método no indicado"}"
                    : p.estadoPedido == "cancelado"
                    ? "Pago no realizado"
                    : "Pago pendiente",
                style: GoogleFonts.inter(color: _mMuted, fontSize: 11.5),
              ),
              const Spacer(),
              Text(
                fmtPesos(p.totalPagar),
                style: GoogleFonts.spaceGrotesk(
                  color: _mNaranja,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          if (puedeCerrar) ...[
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: cerrando ? null : () => _abrirCerrarCuenta(p),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: _mNaranja),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(
                  cerrando ? "Cerrando..." : "Cerrar cuenta",
                  style: GoogleFonts.inter(
                    color: _mNaranja,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ================================================================
// HOJA: elegir método de pago para cerrar la cuenta
// ================================================================

class _HojaMetodoPago extends StatelessWidget {
  final PedidoMesero pedido;
  const _HojaMetodoPago({required this.pedido});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "CERRAR CUENTA",
            style: GoogleFonts.spaceGrotesk(
              color: _mNaranja,
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
            "¿Con qué pagó el cliente?",
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
                        color: _mNaranjaSoft,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: _mNaranjaBorder),
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

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/mesero_controller.dart';
import '../formato.dart';
import '../models/pedido_mesero_model.dart';
import '../widgets/mesero_drawer.dart';

const Color _mNaranja = Color(0xFFE87D2A);
const Color _mNaranjaSoft = Color(0x26E87D2A);
const Color _mNaranjaBorder = Color(0x4DE87D2A);
const Color _mBg = Color(0xFF0A0A0A);
const Color _mCard = Color(0x0AFFFFFF);
const Color _mMuted = Color(0xFF888888);
const Color _mRojo = Color(0xFFE74C3C);

class MeseroMensajesClienteScreen extends StatefulWidget {
  const MeseroMensajesClienteScreen({super.key});

  @override
  State<MeseroMensajesClienteScreen> createState() =>
      _MeseroMensajesClienteScreenState();
}

class _MeseroMensajesClienteScreenState
    extends State<MeseroMensajesClienteScreen> {
  final _controller = MeseroController();

  bool _cargando = true;
  String? _error;
  List<PedidoMesero> _pedidos = [];
  final Set<int> _procesando = {};

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
      final resultados = await Future.wait([
        _controller.cargarPorEstado("pendiente"),
        _controller.cargarPorEstado("preparando"),
      ]);
      if (!mounted) return;
      setState(() {
        _pedidos = [...resultados[0], ...resultados[1]];
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
    } finally {
      if (mounted) setState(() => _procesando.remove(id));
    }
  }

  Future<void> _tomarPedido(PedidoMesero p) async {
    final mensaje = p.nombreMesero != null
        ? "Este pedido está asignado a ${p.nombreMesero}. ¿Tomarlo de todas formas?"
        : "¿Tomar este pedido?";
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF161616),
        title: Text(
          "Pedido #${p.id}",
          style: GoogleFonts.spaceGrotesk(color: Colors.white, fontSize: 15),
        ),
        content: Text(
          mensaje,
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
    final items = await showModalBottomSheet<List<ItemPedidoMesero>>(
      context: context,
      backgroundColor: const Color(0xFF121212),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (_) => _HojaModificar(pedido: p),
    );
    if (items == null) return;
    if (items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            "El pedido debe tener al menos un ítem. Para eliminarlo, usa Cancelar.",
          ),
        ),
      );
      return;
    }
    _accion(p.id, () => _controller.modificarPedido(p.id, items));
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
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _mCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _mNaranjaBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
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
                    color: p.nombreMesero != null
                        ? const Color(0x2619A971)
                        : const Color(0x14FFFFFF),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    p.nombreMesero != null
                        ? "Tomado por ${p.nombreMesero}"
                        : "Tomar pedido",
                    style: GoogleFonts.inter(
                      color: p.nombreMesero != null
                          ? const Color(0xFF19A971)
                          : Colors.white,
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
          const SizedBox(height: 10),
          if (p.platos.isNotEmpty) ..._grupo("Platos", p.platos),
          if (p.bebidas.isNotEmpty) ..._grupo("Bebidas", p.bebidas),
          const SizedBox(height: 10),
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
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: procesando
                    ? null
                    : () =>
                          _accion(p.id, () => _controller.enviarACocina(p.id)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _mNaranja,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                ),
                child: Text(
                  procesando ? "..." : "Enviar a cocina",
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
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
// HOJA: modificar cantidades (HU16)
// ================================================================

class _HojaModificar extends StatefulWidget {
  final PedidoMesero pedido;
  const _HojaModificar({required this.pedido});

  @override
  State<_HojaModificar> createState() => _HojaModificarState();
}

class _HojaModificarState extends State<_HojaModificar> {
  late List<ItemPedidoMesero> _items;

  @override
  void initState() {
    super.initState();
    _items = [...widget.pedido.detalles];
  }

  void _cambiar(ItemPedidoMesero item, int delta) {
    setState(() {
      final nuevaCantidad = item.cantidad + delta;
      if (nuevaCantidad <= 0) {
        _items.removeWhere((i) => i.idDetalle == item.idDetalle);
      } else {
        _items = _items
            .map(
              (i) => i.idDetalle == item.idDetalle
                  ? i.copyWith(cantidad: nuevaCantidad)
                  : i,
            )
            .toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "MODIFICAR CANTIDADES",
            style: GoogleFonts.spaceGrotesk(
              color: _mNaranja,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            "Pedido #${widget.pedido.id}",
            style: GoogleFonts.spaceGrotesk(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 14),
          ConstrainedBox(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(context).size.height * 0.4,
            ),
            child: SingleChildScrollView(
              child: Column(
                children: _items.map((item) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            item.nombrePlato,
                            style: GoogleFonts.inter(
                              color: Colors.white,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () => _cambiar(item, -1),
                          icon: const Icon(
                            Icons.remove_circle_outline,
                            color: _mNaranja,
                            size: 20,
                          ),
                        ),
                        Text(
                          "${item.cantidad}",
                          style: GoogleFonts.spaceGrotesk(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        IconButton(
                          onPressed: () => _cambiar(item, 1),
                          icon: const Icon(
                            Icons.add_circle_outline,
                            color: _mNaranja,
                            size: 20,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text("Cancelar", style: TextStyle(color: _mMuted)),
              ),
              const SizedBox(width: 6),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(_items),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _mNaranja,
                  foregroundColor: Colors.black,
                ),
                child: const Text(
                  "Guardar cambios",
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

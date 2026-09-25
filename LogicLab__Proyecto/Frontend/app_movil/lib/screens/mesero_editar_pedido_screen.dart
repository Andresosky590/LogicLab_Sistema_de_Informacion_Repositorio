import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/mesero_controller.dart';
import '../formato.dart';
import '../models/menu_dia_model.dart';
import '../models/pedido_mesero_model.dart';
import '../repositories/auth_repository.dart' show baseUrl;

const Color _mNaranja = Color(0xFFE87D2A);
const Color _mNaranjaSoft = Color(0x26E87D2A);
const Color _mNaranjaBorder = Color(0x4DE87D2A);
const Color _mRojo = Color(0xFFE74C3C);
const Color _mBg = Color(0xFF0A0A0A);
const Color _mCard = Color(0x0AFFFFFF);
const Color _mMuted = Color(0xFF888888);

Widget _placeholderImagen() {
  return Container(
    color: const Color(0x14FFFFFF),
    alignment: Alignment.center,
    child: const Icon(Icons.restaurant_menu_rounded, color: _mMuted, size: 24),
  );
}

// Editor "detallado" de HU16 — a diferencia de la hoja rápida que
// solo dejaba subir/bajar cantidades, acá el mesero puede además
// QUITAR un plato entero y agregar cualquier otra cosa del menú (no
// solo lo que ya tenía), matching el caso de "el cliente cambió de
// opinión y quiere otra cosa en vez de esto".
//
// Cada acción (cambiar cantidad, quitar, agregar) llama a su propio
// endpoint atómico — nunca se reenvía la lista completa — para que
// esto pueda convivir sin choques con que el cliente siga agregando
// cosas al mismo pedido desde su celular al mismo tiempo.
class MeseroEditarPedidoScreen extends StatefulWidget {
  final PedidoMesero pedidoInicial;

  const MeseroEditarPedidoScreen({super.key, required this.pedidoInicial});

  @override
  State<MeseroEditarPedidoScreen> createState() =>
      _MeseroEditarPedidoScreenState();
}

class _MeseroEditarPedidoScreenState extends State<MeseroEditarPedidoScreen> {
  final _controller = MeseroController();

  late PedidoMesero _pedido;
  MenuDia? _menu;

  bool _cargandoMenu = true;
  String? _errorMenu;
  final Set<int> _detallesProcesando = {}; // ids de detalle en curso
  final Set<int> _platosAgregando = {}; // ids de plato del menú en curso
  bool _recargandoPedido = false;

  @override
  void initState() {
    super.initState();
    _pedido = widget.pedidoInicial;
    _cargarMenu();
  }

  Future<void> _cargarMenu() async {
    setState(() {
      _cargandoMenu = true;
      _errorMenu = null;
    });
    try {
      final menu = await _controller.cargarMenuHoy();
      if (!mounted) return;
      setState(() {
        _menu = menu;
        _cargandoMenu = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMenu = e.toString();
        _cargandoMenu = false;
      });
    }
  }

  // Trae el pedido fresco (con el total ya recalculado) después de
  // cada acción — el backend es quien manda sobre el total, nunca se
  // calcula a mano acá.
  Future<void> _recargarPedido() async {
    setState(() => _recargandoPedido = true);
    try {
      final pendientes = await _controller.cargarPorEstado("pendiente");
      final actualizado = pendientes
          .where((p) => p.id == _pedido.id)
          .firstOrNull;
      if (!mounted) return;

      if (actualizado == null) {
        // Ya no está pendiente (alguien más lo envió a cocina, lo
        // canceló, o el cliente ya lo pagó y quedó sellado) — no
        // tiene sentido seguir editando, se vuelve a la lista.
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Este pedido ya no se puede seguir editando."),
          ),
        );
        return;
      }

      setState(() {
        _pedido = actualizado;
        _recargandoPedido = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _recargandoPedido = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: _mRojo),
      );
    }
  }

  // ==============================================================
  // ACCIONES SOBRE ÍTEMS YA EXISTENTES
  // ==============================================================

  Future<void> _cambiarCantidad(ItemPedidoMesero item, int delta) async {
    final nuevaCantidad = item.cantidad + delta;
    if (nuevaCantidad <= 0) {
      await _quitarItem(item, confirmar: false);
      return;
    }

    setState(() => _detallesProcesando.add(item.idDetalle));
    try {
      await _controller.actualizarCantidadItem(
        _pedido.id,
        item.idDetalle,
        nuevaCantidad,
        item.precioUnitario * nuevaCantidad,
      );
      await _recargarPedido();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: _mRojo),
      );
    } finally {
      if (mounted) setState(() => _detallesProcesando.remove(item.idDetalle));
    }
  }

  Future<void> _quitarItem(
    ItemPedidoMesero item, {
    bool confirmar = true,
  }) async {
    if (confirmar) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (_) => AlertDialog(
          backgroundColor: const Color(0xFF161616),
          title: Text(
            "¿Quitar ${item.nombrePlato}?",
            style: GoogleFonts.spaceGrotesk(color: Colors.white, fontSize: 15),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text("Cancelar", style: TextStyle(color: _mMuted)),
            ),
            TextButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text("Quitar", style: TextStyle(color: _mRojo)),
            ),
          ],
        ),
      );
      if (ok != true) return;
    }

    setState(() => _detallesProcesando.add(item.idDetalle));
    try {
      await _controller.quitarItemDePedido(_pedido.id, item.idDetalle);
      await _recargarPedido();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: _mRojo),
      );
    } finally {
      if (mounted) setState(() => _detallesProcesando.remove(item.idDetalle));
    }
  }

  // ==============================================================
  // AGREGAR ALGO NUEVO DEL MENÚ (el cliente quiere otra cosa)
  // ==============================================================

  Future<void> _agregarDelMenu(MenuDiaItem plato) async {
    setState(() => _platosAgregando.add(plato.idPlatos));
    try {
      await _controller.agregarItemAPedido(_pedido.id, {
        "idPlato": plato.idPlatos,
        "nombrePlato": plato.nombrePlato,
        "cantidadPedido": 1,
        "notasEspeciales": null,
        "precioFinal": plato.precio,
        "idCategoria": plato.idCategoria,
      });
      await _recargarPedido();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("${plato.nombrePlato} agregado"),
          duration: const Duration(seconds: 1),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: _mRojo),
      );
    } finally {
      if (mounted) setState(() => _platosAgregando.remove(plato.idPlatos));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _mBg,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          "EDITAR PEDIDO #${_pedido.id} · MESA ${_pedido.numeroMesa ?? "—"}",
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 12,
            letterSpacing: 0.5,
          ),
        ),
      ),
      body: Stack(
        children: [
          ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                "EN EL PEDIDO",
                style: GoogleFonts.spaceGrotesk(
                  color: _mNaranja,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 10),
              if (_pedido.detalles.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Text(
                    "Sin ítems — agrega algo del menú abajo.",
                    style: GoogleFonts.inter(color: _mMuted, fontSize: 12.5),
                  ),
                )
              else
                ..._pedido.detalles.map(_tarjetaItemExistente),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: _mNaranjaSoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Text(
                      "TOTAL",
                      style: GoogleFonts.inter(
                        color: _mMuted,
                        fontSize: 11,
                        letterSpacing: 1,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      fmtPesos(_pedido.totalPagar),
                      style: GoogleFonts.spaceGrotesk(
                        color: _mNaranja,
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              Text(
                "AGREGAR OTRA COSA",
                style: GoogleFonts.spaceGrotesk(
                  color: _mNaranja,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                "Si el cliente quiere cambiar un plato por otro: agrega el nuevo aquí, y quita el viejo arriba.",
                style: GoogleFonts.inter(color: _mMuted, fontSize: 11.5),
              ),
              const SizedBox(height: 12),
              _buildMenu(),
            ],
          ),
          if (_recargandoPedido)
            Container(
              color: Colors.black.withValues(alpha: 0.3),
              child: const Center(
                child: CircularProgressIndicator(color: _mNaranja),
              ),
            ),
        ],
      ),
    );
  }

  Widget _tarjetaItemExistente(ItemPedidoMesero item) {
    final procesando = _detallesProcesando.contains(item.idDetalle);
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _mCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _mNaranjaBorder),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.nombrePlato,
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  fmtPesos(item.precioFinal),
                  style: GoogleFonts.inter(color: _mMuted, fontSize: 12),
                ),
              ],
            ),
          ),
          if (procesando)
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: _mNaranja,
              ),
            )
          else ...[
            _botonQty(Icons.remove, () => _cambiarCantidad(item, -1)),
            SizedBox(
              width: 28,
              child: Text(
                "${item.cantidad}",
                textAlign: TextAlign.center,
                style: GoogleFonts.spaceGrotesk(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            _botonQty(Icons.add, () => _cambiarCantidad(item, 1)),
            const SizedBox(width: 6),
            GestureDetector(
              onTap: () => _quitarItem(item),
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: const Color(0x26E74C3C),
                  borderRadius: BorderRadius.circular(7),
                ),
                child: const Icon(
                  Icons.delete_outline_rounded,
                  size: 16,
                  color: _mRojo,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _botonQty(IconData icono, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 26,
        height: 26,
        decoration: BoxDecoration(
          color: _mNaranjaSoft,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Icon(icono, size: 14, color: _mNaranja),
      ),
    );
  }

  Widget _buildMenu() {
    if (_cargandoMenu) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: CircularProgressIndicator(color: _mNaranja)),
      );
    }
    if (_errorMenu != null) {
      return Column(
        children: [
          Text(
            _errorMenu!,
            style: GoogleFonts.inter(color: _mMuted, fontSize: 12.5),
          ),
          TextButton(
            onPressed: _cargarMenu,
            child: const Text("Reintentar", style: TextStyle(color: _mNaranja)),
          ),
        ],
      );
    }
    final menu = _menu;
    if (menu == null || menu.items.isEmpty) {
      return Text(
        "No hay menú publicado hoy.",
        style: GoogleFonts.inter(color: _mMuted, fontSize: 12.5),
      );
    }

    final platos = menu.items.where((i) => i.idCategoria != 4).toList();
    final bebidas = menu.items.where((i) => i.idCategoria == 4).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (platos.isNotEmpty) ...[
          ...platos.map(_tarjetaMenuItem),
          const SizedBox(height: 6),
        ],
        if (bebidas.isNotEmpty) ...bebidas.map(_tarjetaMenuItem),
      ],
    );
  }

  Widget _tarjetaMenuItem(MenuDiaItem plato) {
    final agregando = _platosAgregando.contains(plato.idPlatos);
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: _mCard,
        borderRadius: BorderRadius.circular(12),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        children: [
          SizedBox(
            width: 64,
            height: 64,
            child: plato.imagenUrl != null
                ? Image.network(
                    "$baseUrl${plato.imagenUrl}",
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => _placeholderImagen(),
                  )
                : _placeholderImagen(),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    plato.nombrePlato,
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    fmtPesos(plato.precio),
                    style: GoogleFonts.spaceGrotesk(
                      color: _mNaranja,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(right: 10),
            child: agregando
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: _mNaranja,
                    ),
                  )
                : GestureDetector(
                    onTap: () => _agregarDelMenu(plato),
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: _mNaranja,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.add,
                        size: 18,
                        color: Colors.black,
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}

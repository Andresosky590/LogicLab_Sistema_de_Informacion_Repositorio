import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/mesero_controller.dart';
import '../formato.dart';
import '../models/menu_dia_model.dart';
import '../models/mesa_model.dart';
import '../repositories/auth_repository.dart' show baseUrl;
import '../widgets/mesero_drawer.dart';

const Color _mNaranja = Color(0xFFE87D2A);
const Color _mNaranjaSoft = Color(0x26E87D2A);
const Color _mNaranjaBorder = Color(0x4DE87D2A);
const Color _mBg = Color(0xFF0A0A0A);
const Color _mCard = Color(0x0AFFFFFF);
const Color _mMuted = Color(0xFF888888);

const Map<int, String> _imagenCategoria = {
  1: "assets/images/CartaCorriente.png",
  2: "assets/images/CartaComidaRapida.png",
  3: "assets/images/CartaEspecial.png",
  4: "assets/images/CartaBebidas.png",
};

String _rutaImagen(int idCategoria) =>
    _imagenCategoria[idCategoria] ?? "assets/images/CartaCorriente.png";

// Un plato del carrito, con la cantidad elegida.
class _ItemCarrito {
  final MenuDiaItem plato;
  final int cantidad;
  _ItemCarrito({required this.plato, required this.cantidad});
}

class MeseroPedidoAsistidoScreen extends StatefulWidget {
  const MeseroPedidoAsistidoScreen({super.key});

  @override
  State<MeseroPedidoAsistidoScreen> createState() =>
      _MeseroPedidoAsistidoScreenState();
}

class _MeseroPedidoAsistidoScreenState
    extends State<MeseroPedidoAsistidoScreen> {
  final _controller = MeseroController();

  bool _cargando = true;
  String? _error;
  bool _enviando = false;

  List<Mesa> _mesas = [];
  List<MenuDiaItem> _platosDelMenu = [];
  List<Map<String, dynamic>> _metodosPago = [];

  Mesa? _mesaSeleccionada;
  final Map<int, _ItemCarrito> _carrito = {};
  int? _metodoSeleccionado;

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
        _controller.cargarMesas(),
        _controller.cargarPlatos(),
        _controller.cargarMenuHoy(),
        _controller.cargarMetodosPago(),
      ]);

      final mesas = resultados[0] as List<Mesa>;
      final platosRaw = resultados[1] as List<Map<String, dynamic>>;
      final menu = resultados[2] as MenuDia?;
      final metodos = resultados[3] as List<Map<String, dynamic>>;

      // Mismo criterio que la web: solo entran al pedido asistido los
      // ítems del menú publicado que además siguen "Disponible" ahora
      // mismo en la carta (un plato pudo agotarse después de publicar).
      final idsDisponibles = platosRaw
          .where((p) => p['Disponible'] == "Disponible")
          .map((p) => p['id_Platos'] as int)
          .toSet();

      final platosDelMenu = (menu?.items ?? [])
          .where((item) => idsDisponibles.contains(item.idPlatos))
          .toList();

      if (!mounted) return;
      setState(() {
        _mesas = mesas;
        _platosDelMenu = platosDelMenu;
        _metodosPago = metodos;
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
  // MESA
  // ==============================================================

  void _seleccionarMesa(Mesa mesa) {
    setState(() {
      _mesaSeleccionada = (_mesaSeleccionada?.id == mesa.id) ? null : mesa;
    });
  }

  // ==============================================================
  // CARRITO
  // ==============================================================

  void _agregar(MenuDiaItem plato) {
    setState(() {
      final actual = _carrito[plato.idPlatos];
      _carrito[plato.idPlatos] = _ItemCarrito(
        plato: plato,
        cantidad: (actual?.cantidad ?? 0) + 1,
      );
    });
  }

  void _quitar(int idPlato) {
    setState(() {
      final actual = _carrito[idPlato];
      if (actual == null) return;
      if (actual.cantidad <= 1) {
        _carrito.remove(idPlato);
      } else {
        _carrito[idPlato] = _ItemCarrito(
          plato: actual.plato,
          cantidad: actual.cantidad - 1,
        );
      }
    });
  }

  double get _totalCarrito =>
      _carrito.values.fold(0, (t, i) => t + i.plato.precio * i.cantidad);

  int get _cantidadTotal => _carrito.values.fold(0, (t, i) => t + i.cantidad);

  // ==============================================================
  // ENVIAR
  // ==============================================================

  Future<void> _enviarPedido() async {
    if (_mesaSeleccionada == null) {
      _avisar("Selecciona primero la mesa del cliente.");
      return;
    }
    if (_carrito.isEmpty) {
      _avisar("Agrega al menos un plato al pedido.");
      return;
    }
    if (_metodoSeleccionado == null) {
      _avisar("Selecciona con qué método pagó el cliente.");
      return;
    }

    setState(() => _enviando = true);
    try {
      final items = _carrito.values
          .map(
            (i) => {
              "idPlato": i.plato.idPlatos,
              "nombrePlato": i.plato.nombrePlato,
              "cantidadPedido": i.cantidad,
              "notasEspeciales": null,
              "precioFinal": i.plato.precio * i.cantidad,
              "idCategoria": i.plato.idCategoria,
            },
          )
          .toList();

      await _controller.crearPedidoAsistido(
        idMesa: _mesaSeleccionada!.id,
        totalPagar: _totalCarrito,
        items: items,
        idMetodoPago: _metodoSeleccionado!,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            "Pedido enviado para la Mesa #${_mesaSeleccionada!.numero}.",
          ),
        ),
      );

      setState(() {
        _carrito.clear();
        _mesaSeleccionada = null;
        _metodoSeleccionado = null;
      });

      await _cargar();
    } catch (e) {
      if (!mounted) return;
      _avisar(e.toString());
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  void _avisar(String texto) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(texto), backgroundColor: const Color(0xFFE74C3C)),
    );
  }

  // ==============================================================
  // HOJA: revisar carrito + elegir método + confirmar
  // ==============================================================

  Future<void> _abrirResumen() async {
    if (_mesaSeleccionada == null) {
      _avisar("Selecciona primero la mesa del cliente.");
      return;
    }
    if (_carrito.isEmpty) {
      _avisar("Agrega al menos un plato al pedido.");
      return;
    }
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => StatefulBuilder(
        builder: (context, setSheetState) {
          return Container(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
            decoration: const BoxDecoration(
              color: Color(0xFF121212),
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "MESA ${_mesaSeleccionada!.numero}",
                    style: GoogleFonts.spaceGrotesk(
                      color: _mNaranja,
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Resumen del pedido",
                    style: GoogleFonts.spaceGrotesk(
                      color: Colors.white,
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ..._carrito.values.map(
                    (i) => Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              "${i.cantidad}x ${i.plato.nombrePlato}",
                              style: GoogleFonts.inter(
                                color: Colors.white,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          Text(
                            fmtPesos(i.plato.precio * i.cantidad),
                            style: GoogleFonts.inter(
                              color: _mMuted,
                              fontSize: 12.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const Divider(color: _mNaranjaBorder, height: 20),
                  Row(
                    children: [
                      Text(
                        "Total",
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                      Text(
                        fmtPesos(_totalCarrito),
                        style: GoogleFonts.spaceGrotesk(
                          color: _mNaranja,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    "¿CON QUÉ PAGÓ EL CLIENTE?",
                    style: GoogleFonts.spaceGrotesk(
                      color: _mNaranja,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _metodosPago.map((m) {
                      final id = m['id_MetodoPago'] as int;
                      final activo = _metodoSeleccionado == id;
                      return GestureDetector(
                        onTap: () => setSheetState(
                          () => _metodoSeleccionado = activo ? null : id,
                        ),
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 13,
                            vertical: 9,
                          ),
                          decoration: BoxDecoration(
                            color: activo ? _mNaranja : _mNaranjaSoft,
                            borderRadius: BorderRadius.circular(9),
                            border: Border.all(
                              color: activo ? _mNaranja : _mNaranjaBorder,
                            ),
                          ),
                          child: Text(
                            m['NombreMetodo']?.toString() ?? "",
                            style: GoogleFonts.inter(
                              color: activo ? Colors.black : Colors.white,
                              fontSize: 12.5,
                              fontWeight: activo
                                  ? FontWeight.w700
                                  : FontWeight.w500,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _enviando
                          ? null
                          : () async {
                              Navigator.of(context).pop();
                              await _enviarPedido();
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _mNaranja,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: Text(
                        _enviando ? "Enviando..." : "Confirmar y enviar pedido",
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // ==============================================================
  // BUILD
  // ==============================================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _mBg,
      drawer: const MeseroDrawer(seccionActiva: "Pedido asistido"),
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          "PEDIDO ASISTIDO",
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
      bottomNavigationBar: _cantidadTotal == 0
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: ElevatedButton(
                  onPressed: _enviando ? null : _abrirResumen,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _mNaranja,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: Text(
                    "Ver pedido · $_cantidadTotal ítem${_cantidadTotal == 1 ? "" : "s"} · ${fmtPesos(_totalCarrito)}",
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ),
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

    return RefreshIndicator(
      color: _mNaranja,
      backgroundColor: Colors.black,
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            "PEDIDO PARA",
            style: GoogleFonts.inter(
              color: _mMuted,
              fontSize: 10.5,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _mesaSeleccionada != null
                ? "Mesa #${_mesaSeleccionada!.numero}"
                : "Selecciona una mesa",
            style: GoogleFonts.spaceGrotesk(
              color: _mesaSeleccionada != null ? Colors.white : _mMuted,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _mesas.map((mesa) {
              final activa = _mesaSeleccionada?.id == mesa.id;
              return GestureDetector(
                onTap: () => _seleccionarMesa(mesa),
                child: Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: activa ? _mNaranja : _mCard,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: activa ? _mNaranja : _mNaranjaBorder,
                      width: activa ? 2 : 1,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    "${mesa.numero}",
                    style: GoogleFonts.spaceGrotesk(
                      color: activa ? Colors.black : Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 22),
          Row(
            children: [
              Text(
                "MENÚ DEL DÍA",
                style: GoogleFonts.spaceGrotesk(
                  color: _mNaranja,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                ),
              ),
              const Spacer(),
              Text(
                "${_platosDelMenu.length} plato${_platosDelMenu.length == 1 ? "" : "s"}",
                style: GoogleFonts.inter(color: _mMuted, fontSize: 11),
              ),
            ],
          ),
          const SizedBox(height: 10),
          if (_platosDelMenu.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 30),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: _mCard,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                children: [
                  const Text("🍽️", style: TextStyle(fontSize: 30)),
                  const SizedBox(height: 8),
                  Text(
                    "No hay menú publicado",
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "El administrador todavía no ha publicado el menú del día.",
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(color: _mMuted, fontSize: 11.5),
                  ),
                ],
              ),
            )
          else
            ..._platosDelMenu.map(_tarjetaPlato),
        ],
      ),
    );
  }

  Widget _tarjetaPlato(MenuDiaItem plato) {
    final cantidad = _carrito[plato.idPlatos]?.cantidad ?? 0;
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: _mCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _mNaranjaBorder),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 84,
            height: 84,
            child: plato.imagenUrl != null
                ? Image.network(
                    "$baseUrl${plato.imagenUrl}",
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Image.asset(
                      _rutaImagen(plato.idCategoria),
                      fit: BoxFit.cover,
                    ),
                  )
                : Image.asset(
                    _rutaImagen(plato.idCategoria),
                    fit: BoxFit.cover,
                  ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    plato.nombrePlato,
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    fmtPesos(plato.precio),
                    style: GoogleFonts.spaceGrotesk(
                      color: _mNaranja,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  cantidad == 0
                      ? SizedBox(
                          height: 30,
                          child: OutlinedButton(
                            onPressed: () => _agregar(plato),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: _mNaranja),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                              ),
                              minimumSize: Size.zero,
                            ),
                            child: Text(
                              "+ Agregar",
                              style: GoogleFonts.inter(
                                color: _mNaranja,
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        )
                      : Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            _botonQty(
                              Icons.remove,
                              () => _quitar(plato.idPlatos),
                            ),
                            SizedBox(
                              width: 28,
                              child: Text(
                                "$cantidad",
                                textAlign: TextAlign.center,
                                style: GoogleFonts.spaceGrotesk(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            _botonQty(Icons.add, () => _agregar(plato)),
                          ],
                        ),
                ],
              ),
            ),
          ),
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
        child: Icon(icono, size: 15, color: _mNaranja),
      ),
    );
  }
}

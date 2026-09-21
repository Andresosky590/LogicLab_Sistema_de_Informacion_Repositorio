import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/auth_controller.dart';
import '../controllers/mesero_controller.dart';
import '../models/pedido_mesero_model.dart';
import 'login_screen.dart';
import 'mesero_mesas_screen.dart';
import 'mesero_placeholder_screen.dart';

// ================================================================
// COLORES — mismos que Hojas_de_Estilo/Mesero.css
// ================================================================
const Color _mVerde = Color(0xFF2ECC71);
const Color _mRojo = Color(0xFFE74C3C);
const Color _mAmarillo = Color(0xFFF1C40F);
const Color _mAzul = Color(0xFF3498DB);
const Color _mGris = Color(0xFF95A5A6);
const Color _mNaranja = Color(0xFFE87D2A);
const Color _mCard = Color(0x0AFFFFFF);
const Color _mBorder = Color(0x14FFFFFF);
const Color _mMuted = Color(0xFF888888);
const Color _mBg = Color(0xFF0A0A0A);

const List<String> _meses = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

const Map<String, _EstadoBadge> _badges = {
  "pendiente": _EstadoBadge(_mAmarillo, "Pendiente"),
  "preparando": _EstadoBadge(_mAzul, "Preparando"),
  "listo": _EstadoBadge(_mVerde, "Listo"),
  "entregado": _EstadoBadge(_mGris, "Entregado"),
  "cancelado": _EstadoBadge(_mRojo, "Cancelado"),
};

class _EstadoBadge {
  final Color color;
  final String label;
  const _EstadoBadge(this.color, this.label);
}

// Ítems del drawer — ya NO incluye "Mesas": el grid de mesas ahora
// vive embebido al lado derecho de la vista general (ver _buildBody),
// no como una pantalla aparte.
class _NavItem {
  final String label;
  final IconData icono;
  const _NavItem(this.label, this.icono);
}

const List<_NavItem> _navItems = [
  _NavItem("Pedido asistido", Icons.add_circle_outline),
  _NavItem("Menú del día", Icons.menu_book_outlined),
  _NavItem("Pedidos clientes", Icons.chat_bubble_outline_rounded),
  _NavItem("Mensajes cocina", Icons.notifications_none_rounded),
];

// Ancho a partir del cual se considera pantalla "ancha" (tablet /
// navegador de escritorio) y se separan resumen y mesas en dos
// columnas lado a lado. Por debajo, se apilan en una sola columna
// para que quepan cómodamente en un celular angosto.
const double _anchoDivision = 640;

// ================================================================
// PANTALLA — VISTA GENERAL DEL MESERO (HU21)
// ================================================================
class MeseroHomeScreen extends StatefulWidget {
  const MeseroHomeScreen({super.key});

  @override
  State<MeseroHomeScreen> createState() => _MeseroHomeScreenState();
}

class _MeseroHomeScreenState extends State<MeseroHomeScreen> {
  final _meseroController = MeseroController();
  final _authController = AuthController();
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  Timer? _polling;
  bool _cargando = true;
  String? _error;
  ResumenMesero? _resumen;

  @override
  void initState() {
    super.initState();
    _cargarResumen();

    // Los datos se actualizan automáticamente, igual que el polling
    // de 30s del historial en Panel_Mesero.jsx.
    _polling = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _cargarResumen(silencioso: true),
    );
  }

  @override
  void dispose() {
    _polling?.cancel();
    super.dispose();
  }

  Future<void> _cargarResumen({bool silencioso = false}) async {
    if (!silencioso) {
      setState(() {
        _cargando = true;
        _error = null;
      });
    }

    try {
      final data = await _meseroController.cargarResumen();

      if (!mounted) return;

      setState(() {
        _resumen = data;
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

  Future<void> _cerrarSesion() async {
    await _authController.cerrarSesion();

    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  void _onNavTap(_NavItem item) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) =>
            MeseroPlaceholderScreen(titulo: item.label, icono: item.icono),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: _mBg,
      drawer: _buildDrawer(),
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        leading: IconButton(
          tooltip: "Abrir menú",
          icon: const Icon(Icons.menu_rounded),
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
        ),
        title: Text(
          "MESERO",
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.5,
            fontSize: 14,
          ),
        ),
        actions: [
          IconButton(
            tooltip: "Cerrar sesión",
            icon: const Icon(Icons.logout, color: Color(0xFFE74C3C), size: 20),
            onPressed: _cerrarSesion,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  // ================================================================
  // DRAWER — menú de navegación desplegable desde el lado izquierdo
  // ================================================================
  Widget _buildDrawer() {
    final nombre = _resumen?.nombre ?? "";
    final inicial = nombre.isNotEmpty ? nombre[0].toUpperCase() : "M";

    var listView = ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 10),
      itemCount: _navItems.length,
      separatorBuilder: (_, __) => const SizedBox(height: 2),
      itemBuilder: (context, index) {
        final item = _navItems[index];
        return ListTile(
          leading: Icon(item.icono, color: _mNaranja, size: 22),
          title: Text(
            item.label,
            style: GoogleFonts.inter(
              color: Colors.white,
              fontSize: 13.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          onTap: () {
            Navigator.of(context).pop();
            _onNavTap(item);
          },
        );
      },
    );
    return Drawer(
      backgroundColor: const Color(0xFF111111),
      child: SafeArea(
        child: Column(
          children: [
            // ── Perfil ──
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 22, 20, 18),
              child: Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: _mNaranja.withValues(alpha: 0.15),
                      border: Border.all(color: _mNaranja, width: 2),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      inicial,
                      style: GoogleFonts.spaceGrotesk(
                        color: _mNaranja,
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          "MESERO",
                          style: GoogleFonts.spaceGrotesk(
                            color: _mMuted,
                            fontSize: 10,
                            letterSpacing: 2,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          nombre.isEmpty ? "—" : nombre,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.spaceGrotesk(
                            color: _mNaranja,
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(color: _mBorder, height: 1),

            // ── Navegación vertical ──
            Expanded(child: listView),
            const Divider(color: _mBorder, height: 1),

            // ── Cerrar sesión ──
            Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.of(context).pop();
                    _cerrarSesion();
                  },
                  icon: const Icon(Icons.logout, color: _mRojo, size: 18),
                  label: Text(
                    "Cerrar sesión",
                    style: GoogleFonts.inter(
                      color: _mRojo,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: _mRojo),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ================================================================
  // BODY
  // ================================================================
  Widget _buildBody() {
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
                "No se pudo cargar el resumen",
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
                style: GoogleFonts.inter(color: _mMuted, fontSize: 12.5),
              ),
              const SizedBox(height: 14),
              TextButton(
                onPressed: () => _cargarResumen(),
                child: const Text("Reintentar", style: TextStyle(color: _mNaranja)),
              ),
            ],
          ),
        ),
      );
    }

    if (_resumen == null) {
      return const Center(child: CircularProgressIndicator(color: _mNaranja));
    }

    final data = _resumen!;

    // La vista principal se divide en dos: a la izquierda perfil +
    // resumen + historial (mismo contenido de siempre), a la derecha
    // el grid de mesas en vivo (lo que antes era la pantalla aparte
    // "Mesas del restaurante"). En pantallas angostas se apilan en
    // una sola columna, con las mesas debajo del resumen.
    return LayoutBuilder(
      builder: (context, constraints) {
        final dividirEnColumnas = constraints.maxWidth >= _anchoDivision;

        if (dividirEnColumnas) {
          return Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                flex: 6,
                child: _buildColumnaIzquierda(data, incluirMesas: false),
              ),
              const VerticalDivider(color: _mBorder, width: 1),
              Expanded(
                flex: 5,
                child: RefreshIndicator(
                  color: _mNaranja,
                  backgroundColor: Colors.black,
                  onRefresh: () => _cargarResumen(),
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: const MesasPanel(),
                  ),
                ),
              ),
            ],
          );
        }

        return _buildColumnaIzquierda(data, incluirMesas: true);
      },
    );
  }

  // Columna con perfil + resumen + (opcionalmente) mesas + historial.
  // Se reutiliza tanto para el layout de una sola columna (celular
  // angosto) como para el lado izquierdo del layout de dos columnas.
  Widget _buildColumnaIzquierda(ResumenMesero data, {required bool incluirMesas}) {
    return RefreshIndicator(
      color: _mNaranja,
      backgroundColor: Colors.black,
      onRefresh: () => _cargarResumen(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ============================================================
          // ENCABEZADO CON PERFIL
          // ============================================================
          _PerfilHeader(nombre: data.nombre),

          const SizedBox(height: 22),

          // ============================================================
          // RESUMEN: PEDIDOS HOY / ENTREGADOS / GANADO
          // ============================================================
          Text(
            "RESUMEN DEL TURNO",
            style: GoogleFonts.spaceGrotesk(
              color: _mNaranja,
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 10),
          _ResumenRow(label: "Pedidos hoy", valor: "${data.pedidosHoy}"),
          const SizedBox(height: 8),
          _ResumenRow(label: "Entregados", valor: "${data.entregadosHoy}"),
          const SizedBox(height: 8),
          _ResumenRow(
            label: "Ganado hoy",
            valor: _formatPrecio(data.gananciaHoy),
            destacado: true,
          ),

          // ============================================================
          // MESAS (solo en layout de una sola columna — en el layout
          // de dos columnas van al panel derecho, ver _buildBody)
          // ============================================================
          if (incluirMesas) ...[
            const SizedBox(height: 22),
            const MesasPanel(),
          ],

          const SizedBox(height: 22),

          // ============================================================
          // HISTORIAL DE PEDIDOS DEL DÍA
          // ============================================================
          Text(
            "HISTORIAL DE PEDIDOS DE HOY",
            style: GoogleFonts.spaceGrotesk(
              color: _mNaranja,
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 10),

          data.historialHoy.isEmpty
              ? Padding(
                  padding: const EdgeInsets.symmetric(vertical: 30),
                  child: Center(
                    child: Text(
                      "Sin pedidos registrados hoy",
                      style: GoogleFonts.inter(color: _mMuted, fontSize: 12.5),
                    ),
                  ),
                )
              : Column(
                  children: data.historialHoy
                      .map((p) => _PedidoCard(pedido: p))
                      .toList(),
                ),
        ],
      ),
    );
  }

  String _formatPrecio(double precio) {
    final entero = precio.round();
    final texto = entero.toString();

    final buffer = StringBuffer();

    for (int i = 0; i < texto.length; i++) {
      final posicionDesdeElFinal = texto.length - i;

      buffer.write(texto[i]);

      if (posicionDesdeElFinal > 1 && posicionDesdeElFinal % 3 == 1) {
        buffer.write(".");
      }
    }

    return "\$$buffer";
  }
}

// ================================================================
// ENCABEZADO CON PERFIL
// ================================================================
class _PerfilHeader extends StatelessWidget {
  final String nombre;

  const _PerfilHeader({required this.nombre});

  @override
  Widget build(BuildContext context) {
    final inicial = nombre.isNotEmpty ? nombre[0].toUpperCase() : "M";

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _mCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _mBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _mNaranja.withValues(alpha: 0.15),
              border: Border.all(color: _mNaranja, width: 2),
            ),
            alignment: Alignment.center,
            child: Text(
              inicial,
              style: GoogleFonts.spaceGrotesk(
                color: _mNaranja,
                fontSize: 22,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "MESERO",
                style: GoogleFonts.spaceGrotesk(
                  color: _mMuted,
                  fontSize: 10,
                  letterSpacing: 2,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                nombre,
                style: GoogleFonts.spaceGrotesk(
                  color: _mNaranja,
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ================================================================
// FILA DE RESUMEN — más compacta que la tarjeta cuadrada anterior,
// pensada para caber en la columna izquierda cuando está dividida
// con el panel de mesas.
// ================================================================
class _ResumenRow extends StatelessWidget {
  final String label;
  final String valor;
  final bool destacado;

  const _ResumenRow({
    required this.label,
    required this.valor,
    this.destacado = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: _mCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _mBorder),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(color: _mMuted, fontSize: 11.5),
          ),
          Text(
            valor,
            style: GoogleFonts.spaceGrotesk(
              color: destacado ? _mNaranja : Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

// ================================================================
// TARJETA DE PEDIDO (historial)
// ================================================================
class _PedidoCard extends StatelessWidget {
  final PedidoMesero pedido;

  const _PedidoCard({required this.pedido});

  String _fmtFecha(DateTime? f) {
    if (f == null) return "—";
    return "${f.day.toString().padLeft(2, '0')} ${_meses[f.month - 1]}";
  }

  String _fmtHora(DateTime? f) {
    if (f == null) return "—";
    final h = f.hour % 12 == 0 ? 12 : f.hour % 12;
    final m = f.minute.toString().padLeft(2, '0');
    final sufijo = f.hour >= 12 ? "p. m." : "a. m.";
    return "$h:$m $sufijo";
  }

  String _fmtPrecio(double precio) {
    final entero = precio.round();
    final texto = entero.toString();
    final buffer = StringBuffer();
    for (int i = 0; i < texto.length; i++) {
      final posicionDesdeElFinal = texto.length - i;
      buffer.write(texto[i]);
      if (posicionDesdeElFinal > 1 && posicionDesdeElFinal % 3 == 1) {
        buffer.write(".");
      }
    }
    return "\$$buffer";
  }

  @override
  Widget build(BuildContext context) {
    final badge = _badges[pedido.estado] ?? _badges["pendiente"]!;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: _mCard,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: _mBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                "#${pedido.id}",
                style: GoogleFonts.inter(
                  color: _mMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  pedido.numeroMesa != null ? "Mesa ${pedido.numeroMesa}" : "Mesa —",
                  style: GoogleFonts.spaceGrotesk(
                    color: Colors.white,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: badge.color.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  badge.label,
                  style: GoogleFonts.inter(
                    color: badge.color,
                    fontSize: 9.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "${_fmtFecha(pedido.fecha)} · ${_fmtHora(pedido.fecha)}",
                style: GoogleFonts.inter(color: _mMuted, fontSize: 10.5),
              ),
              Text(
                _fmtPrecio(pedido.totalPagar),
                style: GoogleFonts.spaceGrotesk(
                  color: _mNaranja,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/auth_controller.dart';
import '../controllers/cocinero_controller.dart';
import 'cocinero_menu_screen.dart';
import 'cocinero_pedidos_screen.dart';
import 'login_screen.dart';

// ================================================================
// COLORES — mismos que Hojas_de_Estilo/Cocinero.css (verde neón
// #39ff14 del panel de cocina), con amarillo/azul para distinguir
// los estados del resumen igual que en el resto de la app.
// ================================================================
const Color _cVerde = Color(0xFF39FF14);
const Color _cAmarillo = Color(0xFFF1C40F);
const Color _cAzul = Color(0xFF3498DB);
const Color _cCard = Color(0x0AFFFFFF);
const Color _cBorder = Color(0x14FFFFFF);
const Color _cMuted = Color(0xFF888888);
const Color _cBg = Color(0xFF0A0A0A);

// Ítems de navegación del cocinero — "Pedidos entrantes" (HU03) lleva
// a la cola en tiempo real de pedidos "preparando"; "Menú del día" es
// de solo lectura, igual que la del mesero.
class _NavItem {
  final String label;
  final IconData icono;
  const _NavItem(this.label, this.icono);
}

const List<_NavItem> _navItems = [
  _NavItem("Pedidos entrantes", Icons.soup_kitchen_outlined),
  _NavItem("Menú del día", Icons.menu_book_outlined),
];

// ================================================================
// PANTALLA — VISTA GENERAL DEL COCINERO
// ================================================================
class CocineroHomeScreen extends StatefulWidget {
  const CocineroHomeScreen({super.key});

  @override
  State<CocineroHomeScreen> createState() => _CocineroHomeScreenState();
}

class _CocineroHomeScreenState extends State<CocineroHomeScreen> {
  final _cocineroController = CocineroController();
  final _authController = AuthController();
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  Timer? _polling;
  bool _cargando = true;
  String? _error;
  ResumenCocina? _resumen;

  @override
  void initState() {
    super.initState();
    _cargarResumen();

    // Misma cadencia que el polling de la cocina en Panel_Cocinero.jsx
    // (15s — más frecuente que el del mesero porque son pedidos que
    // llegan en tiempo real).
    _polling = Timer.periodic(
      const Duration(seconds: 15),
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
      final data = await _cocineroController.cargarResumen();

      if (!mounted) return;

      setState(() {
        _resumen = data;
        _error = null;
        _cargando = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _error = e.toString().replaceFirst("CocinaException: ", "");
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
    late final Widget pantalla;
    switch (item.label) {
      case "Pedidos entrantes":
        pantalla = const CocineroPedidosScreen();
      case "Menú del día":
        pantalla = const CocineroMenuScreen();
      default:
        return;
    }
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => pantalla));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: _cBg,
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
          "COCINA",
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
    final nombre = _resumen?.nombreCompleto ?? "";
    final inicial = nombre.isNotEmpty ? nombre[0].toUpperCase() : "C";

    final listView = ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 10),
      itemCount: _navItems.length,
      separatorBuilder: (_, _) => const SizedBox(height: 2),
      itemBuilder: (context, index) {
        final item = _navItems[index];
        return ListTile(
          leading: Icon(item.icono, color: _cVerde, size: 22),
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
                      color: _cVerde.withValues(alpha: 0.12),
                      border: Border.all(color: _cVerde, width: 2),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      inicial,
                      style: GoogleFonts.spaceGrotesk(
                        color: _cVerde,
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
                          "COCINERO",
                          style: GoogleFonts.spaceGrotesk(
                            color: _cMuted,
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
                            color: _cVerde,
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
            const Divider(color: _cBorder, height: 1),

            // ── Navegación vertical ──
            Expanded(child: listView),
            const Divider(color: _cBorder, height: 1),

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
                  icon: const Icon(
                    Icons.logout,
                    color: Color(0xFFE74C3C),
                    size: 18,
                  ),
                  label: Text(
                    "Cerrar sesión",
                    style: GoogleFonts.inter(
                      color: const Color(0xFFE74C3C),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFE74C3C)),
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
                style: GoogleFonts.inter(color: _cMuted, fontSize: 12.5),
              ),
              const SizedBox(height: 14),
              TextButton(
                onPressed: () => _cargarResumen(),
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

    if (_resumen == null) {
      return const Center(child: CircularProgressIndicator(color: _cVerde));
    }

    final data = _resumen!;

    return RefreshIndicator(
      color: _cVerde,
      backgroundColor: Colors.black,
      onRefresh: () => _cargarResumen(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ============================================================
          // ENCABEZADO CON PERFIL
          // ============================================================
          _PerfilHeader(nombre: data.nombreCompleto),

          const SizedBox(height: 22),

          // ============================================================
          // NAVEGACIÓN
          // ============================================================
          Text(
            "NAVEGACIÓN",
            style: GoogleFonts.spaceGrotesk(
              color: _cVerde,
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: _navItems
                .map(
                  (item) => Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(right: 10),
                      child: _NavButton(
                        item: item,
                        onTap: () => _onNavTap(item),
                      ),
                    ),
                  ),
                )
                .toList(),
          ),

          const SizedBox(height: 22),

          // ============================================================
          // RESUMEN DEL TURNO
          // ============================================================
          Text(
            "RESUMEN DEL TURNO",
            style: GoogleFonts.spaceGrotesk(
              color: _cVerde,
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 10),
          _EstadoRow(
            color: _cAmarillo,
            label: "Pendientes",
            valor: data.pendientesHoy,
          ),
          const SizedBox(height: 8),
          _EstadoRow(
            color: _cAzul,
            label: "En preparación",
            valor: data.preparandoHoy,
          ),
          const SizedBox(height: 8),
          _EstadoRow(color: _cVerde, label: "Listo", valor: data.listosHoy),

          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              data.totalHoy == 0
                  ? "Sin pedidos registrados hoy"
                  : "${data.totalHoy} pedidos en total hoy",
              style: GoogleFonts.inter(color: _cMuted, fontSize: 11.5),
            ),
          ),
        ],
      ),
    );
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
    final inicial = nombre.isNotEmpty ? nombre[0].toUpperCase() : "C";

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _cCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _cBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: _cVerde.withValues(alpha: 0.12),
              border: Border.all(color: _cVerde, width: 2),
            ),
            alignment: Alignment.center,
            child: Text(
              inicial,
              style: GoogleFonts.spaceGrotesk(
                color: _cVerde,
                fontSize: 22,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "CHEF",
                  style: GoogleFonts.spaceGrotesk(
                    color: _cMuted,
                    fontSize: 10,
                    letterSpacing: 2,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  nombre,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.spaceGrotesk(
                    color: _cVerde,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ================================================================
// BOTÓN DE NAVEGACIÓN
// ================================================================
class _NavButton extends StatelessWidget {
  final _NavItem item;
  final VoidCallback onTap;

  const _NavButton({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: _cCard,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: _cBorder),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(item.icono, color: _cVerde, size: 24),
              const SizedBox(height: 8),
              Text(
                item.label,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 10.5,
                  fontWeight: FontWeight.w600,
                  height: 1.15,
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
// FILA DE ESTADO (resumen del turno)
// ================================================================
class _EstadoRow extends StatelessWidget {
  final Color color;
  final String label;
  final int valor;

  const _EstadoRow({
    required this.color,
    required this.label,
    required this.valor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: _cCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _cBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(shape: BoxShape.circle, color: color),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: GoogleFonts.inter(color: Colors.white, fontSize: 12.5),
            ),
          ),
          Text(
            "$valor",
            style: GoogleFonts.spaceGrotesk(
              color: color,
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

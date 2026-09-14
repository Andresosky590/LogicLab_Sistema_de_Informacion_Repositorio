import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/admin_controller.dart';
import '../controllers/auth_controller.dart';
import '../models/menu_dia_model.dart';
import '../models/pqrsf_model.dart';
import 'admin_placeholder_screen.dart';
import 'login_screen.dart';

// ================================================================
// COLORES
// ================================================================

const Color _aNeon = Color(0xFFFF1744);
const Color _aNeonGlow = Color(0x8CFF1744);
const Color _aNeonSoft = Color(0x26FF1744);
const Color _aNeonBorder = Color(0x4DFF1744);
const Color _aBg = Color(0xFF0A0A0A);
const Color _aCard = Color(0x0AFFFFFF);
const Color _aMuted = Color(0xFF888888);
const Color _aDonutTrack = Color(0xFF2A2A2A);
const Color _aDonutFill = Color(0xFFE87D2A);

// ================================================================
// PANTALLA PRINCIPAL ADMIN
// ================================================================

class AdminHomeScreen extends StatefulWidget {
  const AdminHomeScreen({super.key});

  @override
  State<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends State<AdminHomeScreen> {
  final _adminController = AdminController();
  final _authController = AuthController();

  Timer? _polling;

  bool _cargando = true;

  DashboardAdmin? _dashboard;

  String? _error;

  @override
  void initState() {
    super.initState();

    _cargarDashboard();

    // Actualiza el dashboard cada 30 segundos.
    _polling = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _cargarDashboard(silencioso: true),
    );
  }

  @override
  void dispose() {
    _polling?.cancel();
    super.dispose();
  }

  // ==============================================================
  // CARGAR DASHBOARD
  // ==============================================================

  Future<void> _cargarDashboard({bool silencioso = false}) async {
    if (!silencioso) {
      setState(() {
        _cargando = true;
        _error = null;
      });
    }

    try {
      final data = await _adminController.cargarDashboard();

      if (!mounted) return;

      setState(() {
        _dashboard = data;
        _error = null;
        _cargando = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        _error = e.toString().replaceFirst("AdminException: ", "");
        _cargando = false;
      });
    }
  }

  // ==============================================================
  // CERRAR SESIÓN
  // ==============================================================

  Future<void> _cerrarSesion() async {
    await _authController.cerrarSesion();

    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  // ==============================================================
  // BUILD
  // ==============================================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _aBg,

      // ------------------------------------------------------------
      // APP BAR
      // ------------------------------------------------------------
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,

        title: Text(
          "PANEL ADMIN",
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.5,
            fontSize: 14,
          ),
        ),
      ),

      // ------------------------------------------------------------
      // DRAWER
      // ------------------------------------------------------------
      drawer: _AdminDrawer(onCerrarSesion: _cerrarSesion),

      // ------------------------------------------------------------
      // BODY
      // ------------------------------------------------------------
      body: _buildBody(),
    );
  }

  // ==============================================================
  // BODY
  // ==============================================================

  Widget _buildBody() {
    // ------------------------------------------------------------
    // CARGANDO
    // ------------------------------------------------------------

    if (_cargando) {
      return const Center(child: CircularProgressIndicator(color: _aNeon));
    }

    // ------------------------------------------------------------
    // ERROR
    // ------------------------------------------------------------

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),

          child: Column(
            mainAxisSize: MainAxisSize.min,

            children: [
              const Icon(Icons.wifi_off_rounded, color: _aMuted, size: 40),

              const SizedBox(height: 14),

              Text(
                "No se pudo cargar el panel",
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
                style: GoogleFonts.inter(color: _aMuted, fontSize: 12.5),
              ),

              const SizedBox(height: 14),

              TextButton(
                onPressed: () => _cargarDashboard(),
                child: const Text(
                  "Reintentar",
                  style: TextStyle(color: _aNeon),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // ------------------------------------------------------------
    // SEGURIDAD
    // ------------------------------------------------------------
    // Si por alguna razón todavía no existe dashboard,
    // mostramos carga en lugar de usar !_dashboard.

    if (_dashboard == null) {
      return const Center(child: CircularProgressIndicator(color: _aNeon));
    }

    final data = _dashboard!;

    // ------------------------------------------------------------
    // CONTENIDO
    // ------------------------------------------------------------

    return RefreshIndicator(
      color: _aNeon,
      backgroundColor: Colors.black,

      onRefresh: () async {
        await _cargarDashboard();
      },

      child: ListView(
        padding: const EdgeInsets.all(16),

        children: [
          // ========================================================
          // MENÚ DEL DÍA + MESAS
          // ========================================================

          SizedBox(
            height: 250,

            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,

              children: [
                Expanded(flex: 6, child: _MenuDiaCard(menu: data.menuHoy)),

                const SizedBox(width: 12),

                Expanded(
                  flex: 5,

                  child: _MesasOcupadasCard(
                    ocupadas: data.mesasOcupadas,
                    total: data.totalMesas,
                    porcentaje: data.porcentajeOcupadas,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // ========================================================
          // PEDIDOS
          // ========================================================
          _StatCard(
            icono: Icons.receipt_long_outlined,
            label: "Pedidos realizados",
            valor: "${data.pedidosHoy}",
          ),

          const SizedBox(height: 10),

          // ========================================================
          // GANANCIAS
          // ========================================================
          _StatCard(
            icono: Icons.attach_money_rounded,
            label: "Ganancias de hoy",
            valor: _formatPrecio(data.gananciasHoy),
          ),

          const SizedBox(height: 10),

          // ========================================================
          // ENTREGADOS
          // ========================================================
          _StatCard(
            icono: Icons.check_circle_outline_rounded,
            label: "Total entregados",
            valor: "${data.entregadosHoy}",
          ),

          const SizedBox(height: 16),

          // ========================================================
          // PQRSF
          // ========================================================
          _PqrsfCard(registros: data.pqrsf),
        ],
      ),
    );
  }

  // ==============================================================
  // FORMATEAR PRECIO
  // ==============================================================

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
// DRAWER
// ================================================================

class _AdminDrawer extends StatelessWidget {
  final VoidCallback onCerrarSesion;

  const _AdminDrawer({required this.onCerrarSesion});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: _aBg,

      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,

          children: [
            // ------------------------------------------------------
            // ENCABEZADO
            // ------------------------------------------------------

            Container(
              padding: const EdgeInsets.symmetric(vertical: 28),

              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: _aNeonBorder)),
              ),

              child: Column(
                children: [
                  Text(
                    "MANGATA",
                    style: GoogleFonts.unbounded(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 20,
                      letterSpacing: 1.5,

                      shadows: const [
                        Shadow(color: _aNeonGlow, blurRadius: 14),
                      ],
                    ),
                  ),

                  const SizedBox(height: 4),

                  Text(
                    "Administrador",
                    style: GoogleFonts.inter(color: _aMuted, fontSize: 11.5),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 8),

            // ------------------------------------------------------
            // PANEL
            // ------------------------------------------------------
            _DrawerItem(
              icono: Icons.grid_view_rounded,
              label: "Panel",
              activo: true,

              onTap: () {
                Navigator.pop(context);
              },
            ),

            // ------------------------------------------------------
            // EMPLEADOS
            // ------------------------------------------------------
            _DrawerItem(
              icono: Icons.people_outline_rounded,
              label: "Empleados",

              onTap: () {
                _abrirPlaceholder(
                  context,
                  "Empleados",
                  Icons.people_outline_rounded,
                );
              },
            ),

            // ------------------------------------------------------
            // PLATOS
            // ------------------------------------------------------
            _DrawerItem(
              icono: Icons.restaurant_menu_rounded,
              label: "Platos",

              onTap: () {
                _abrirPlaceholder(
                  context,
                  "Platos",
                  Icons.restaurant_menu_rounded,
                );
              },
            ),

            // ------------------------------------------------------
            // MENÚS
            // ------------------------------------------------------
            _DrawerItem(
              icono: Icons.menu_book_outlined,
              label: "Menús",

              onTap: () {
                _abrirPlaceholder(context, "Menús", Icons.menu_book_outlined);
              },
            ),

            // ------------------------------------------------------
            // REPORTES
            // ------------------------------------------------------
            _DrawerItem(
              icono: Icons.bar_chart_rounded,
              label: "Reportes",

              onTap: () {
                _abrirPlaceholder(context, "Reportes", Icons.bar_chart_rounded);
              },
            ),

            const Spacer(),

            // ------------------------------------------------------
            // CERRAR SESIÓN
            // ------------------------------------------------------
            Padding(
              padding: const EdgeInsets.all(16),

              child: OutlinedButton.icon(
                onPressed: onCerrarSesion,

                icon: const Icon(
                  Icons.logout,
                  size: 17,
                  color: Color(0xFFE74C3C),
                ),

                label: Text(
                  "Cerrar sesión",
                  style: GoogleFonts.inter(
                    color: const Color(0xFFE74C3C),
                    fontSize: 13.5,
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
          ],
        ),
      ),
    );
  }

  // --------------------------------------------------------------
  // ABRIR PLACEHOLDER
  // --------------------------------------------------------------

  void _abrirPlaceholder(BuildContext context, String titulo, IconData icono) {
    Navigator.pop(context);

    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AdminPlaceholderScreen(titulo: titulo, icono: icono),
      ),
    );
  }
}

// ================================================================
// ITEM DEL DRAWER
// ================================================================

class _DrawerItem extends StatelessWidget {
  final IconData icono;
  final String label;
  final bool activo;
  final VoidCallback onTap;

  const _DrawerItem({
    required this.icono,
    required this.label,
    required this.onTap,
    this.activo = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 3),

      child: Material(
        color: activo ? _aNeonSoft : Colors.transparent,

        borderRadius: BorderRadius.circular(10),

        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onTap,

          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),

            child: Row(
              children: [
                Icon(icono, size: 19, color: activo ? _aNeon : _aMuted),

                const SizedBox(width: 14),

                Text(
                  label,
                  style: GoogleFonts.inter(
                    color: activo ? Colors.white : _aMuted,
                    fontSize: 13.5,
                    fontWeight: activo ? FontWeight.w600 : FontWeight.w400,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ================================================================
// MENÚ DEL DÍA
// ================================================================

class _MenuDiaCard extends StatelessWidget {
  final MenuDia? menu;

  const _MenuDiaCard({required this.menu});

  @override
  Widget build(BuildContext context) {
    return _DashCard(
      icono: Icons.menu_book_outlined,
      titulo: "MENÚ DEL DÍA",

      child: menu == null
          ? const _EmptyPlaceholder(
              icono: Icons.assignment_outlined,
              texto: "Sin menú publicado hoy",
            )
          : SizedBox(
              // Altura fija para que el scroll interno
              // tenga límites claros.
              height: 180,

              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,

                  children: [
                    ...menu!.itemsPorCategoria.entries.map<Widget>((entry) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),

                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,

                          children: [
                            Text(
                              entry.key.toUpperCase(),

                              style: GoogleFonts.spaceGrotesk(
                                color: _aMuted,
                                fontSize: 9.5,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 1,
                              ),
                            ),

                            const SizedBox(height: 4),

                            ...entry.value.map((nombre) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 2),

                                child: Text(
                                  nombre,

                                  style: GoogleFonts.inter(
                                    color: Colors.white,
                                    fontSize: 12.5,
                                  ),
                                ),
                              );
                            }),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ),
    );
  }
}

// ================================================================
// MESAS OCUPADAS
// ================================================================

class _MesasOcupadasCard extends StatelessWidget {
  final int ocupadas;
  final int total;
  final int porcentaje;

  const _MesasOcupadasCard({
    required this.ocupadas,
    required this.total,
    required this.porcentaje,
  });

  @override
  Widget build(BuildContext context) {
    return _DashCard(
      icono: Icons.grid_view_rounded,
      titulo: "MESAS",

      child: SizedBox(
        height: 180,

        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,

          children: [
            SizedBox(
              width: 84,
              height: 84,

              child: Stack(
                alignment: Alignment.center,

                children: [
                  SizedBox(
                    width: 84,
                    height: 84,

                    child: CircularProgressIndicator(
                      value: total > 0 ? ocupadas / total : 0,

                      strokeWidth: 9,

                      backgroundColor: _aDonutTrack,

                      valueColor: const AlwaysStoppedAnimation(_aDonutFill),
                    ),
                  ),

                  Text(
                    "$ocupadas",

                    style: GoogleFonts.spaceGrotesk(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 10),

            Text(
              "Ocupadas",

              style: GoogleFonts.inter(color: Colors.white, fontSize: 12),
            ),

            Text(
              "$ocupadas de $total ($porcentaje%)",

              textAlign: TextAlign.center,

              style: GoogleFonts.inter(color: _aMuted, fontSize: 10.5),
            ),
          ],
        ),
      ),
    );
  }
}

// ================================================================
// STAT CARD
// ================================================================

class _StatCard extends StatelessWidget {
  final IconData icono;
  final String label;
  final String valor;

  const _StatCard({
    required this.icono,
    required this.label,
    required this.valor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),

      decoration: BoxDecoration(
        color: _aCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _aNeonBorder),
      ),

      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,

            decoration: BoxDecoration(
              color: _aNeonSoft,
              borderRadius: BorderRadius.circular(12),
            ),

            child: Icon(icono, color: _aNeon, size: 20),
          ),

          const SizedBox(width: 14),

          Column(
            crossAxisAlignment: CrossAxisAlignment.start,

            children: [
              Text(
                label,

                style: GoogleFonts.inter(color: _aMuted, fontSize: 11.5),
              ),

              const SizedBox(height: 2),

              Text(
                valor,

                style: GoogleFonts.spaceGrotesk(
                  color: Colors.white,
                  fontSize: 18,
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
// PQRSF
// ================================================================

class _PqrsfCard extends StatelessWidget {
  final List<Pqrsf> registros;

  const _PqrsfCard({required this.registros});

  static const Map<String, IconData> _iconoPorTipo = {
    "Petición": Icons.campaign_outlined,
    "Queja": Icons.sentiment_dissatisfied_outlined,
    "Reclamo": Icons.report_gmailerrorred_outlined,
    "Felicitación": Icons.celebration_outlined,
    "Sugerencia": Icons.lightbulb_outline,
  };

  @override
  Widget build(BuildContext context) {
    return _DashCard(
      icono: Icons.chat_bubble_outline_rounded,
      titulo: "PQRSF",

      child: registros.isEmpty
          ? const _EmptyPlaceholder(
              icono: Icons.forum_outlined,
              texto: "Aún no hay registros",
              subtexto: "Los mensajes que envíen los clientes desde la mesa aparecerán aquí",
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,

              children: registros
                  .take(6)
                  .map(
                    (r) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),

                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,

                        children: [
                          Icon(
                            _iconoPorTipo[r.tipo] ?? Icons.push_pin_outlined,

                            color: _aNeon,
                            size: 16,
                          ),

                          const SizedBox(width: 10),

                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,

                              children: [
                                Row(
                                  children: [
                                    Text(
                                      r.tipo,

                                      style: GoogleFonts.spaceGrotesk(
                                        color: Colors.white,
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),

                                    const SizedBox(width: 6),

                                    Expanded(
                                      child: Text(
                                        "· ${r.nombre}",

                                        overflow: TextOverflow.ellipsis,

                                        style: GoogleFonts.inter(
                                          color: _aMuted,
                                          fontSize: 11.5,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 2),

                                Text(
                                  r.mensaje,

                                  maxLines: 2,

                                  overflow: TextOverflow.ellipsis,

                                  style: GoogleFonts.inter(
                                    color: const Color(0xFFBBBBBB),
                                    fontSize: 12,
                                  ),
                                ),

                                const SizedBox(height: 2),

                                Text(
                                  r.fecha,

                                  style: GoogleFonts.inter(
                                    color: const Color(0xFF555555),
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                  .toList(),
            ),
    );
  }
}

// ================================================================
// CARD BASE
// ================================================================

class _DashCard extends StatelessWidget {
  final IconData icono;
  final String titulo;
  final Widget child;

  const _DashCard({
    required this.icono,
    required this.titulo,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(minHeight: 190),

      padding: const EdgeInsets.all(14),

      decoration: BoxDecoration(
        color: _aCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _aNeonBorder),
      ),

      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,

        children: [
          // --------------------------------------------------------
          // TÍTULO
          // --------------------------------------------------------

          Row(
            children: [
              Icon(icono, color: _aNeon, size: 15),

              const SizedBox(width: 8),

              Text(
                titulo,

                style: GoogleFonts.spaceGrotesk(
                  color: _aNeon,
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),

          // --------------------------------------------------------
          // SEPARADOR
          // --------------------------------------------------------
          const Divider(color: _aNeonBorder, height: 18),

          // --------------------------------------------------------
          // CONTENIDO
          // --------------------------------------------------------
          //
          // IMPORTANTE:
          // NO usamos Expanded aquí.
          //
          // El _DashCard también se utiliza dentro de un ListView
          // (por ejemplo PQRSF). El ListView no proporciona una altura
          // vertical finita, por lo que Expanded provocaba:
          //
          // "RenderFlex children have non-zero flex but incoming
          // height constraints are unbounded."
          //
          child,
        ],
      ),
    );
  }
}

// ================================================================
// PLACEHOLDER
// ================================================================

class _EmptyPlaceholder extends StatelessWidget {
  final IconData icono;
  final String texto;
  final String? subtexto;

  const _EmptyPlaceholder({
    required this.icono,
    required this.texto,
    this.subtexto,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 140,

      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,

          children: [
            Icon(icono, color: const Color(0xFF555555), size: 26),

            const SizedBox(height: 8),

            Text(
              texto,

              textAlign: TextAlign.center,

              style: GoogleFonts.inter(color: _aMuted, fontSize: 11.5),
            ),

            if (subtexto != null) ...[
              const SizedBox(height: 4),

              Text(
                subtexto!,

                textAlign: TextAlign.center,

                style: GoogleFonts.inter(
                  color: const Color(0xFF555555),
                  fontSize: 10,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

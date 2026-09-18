import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/auth_controller.dart';
import '../screens/admin_placeholder_screen.dart';
import '../screens/login_screen.dart';
import '../screens/platos_screen.dart';

// ================================================================
// COLORES — mismos valores que usa el resto del panel admin
// ================================================================

const Color _adNeon = Color(0xFFFF1744);
const Color _adNeonGlow = Color(0x8CFF1744);
const Color _adNeonSoft = Color(0x26FF1744);
const Color _adNeonBorder = Color(0x4DFF1744);
const Color _adBg = Color(0xFF0A0A0A);
const Color _adMuted = Color(0xFF888888);

// ================================================================
// CERRAR SESIÓN — compartido por cualquier pantalla del admin
// que use este drawer, para no repetir la lógica en cada una.
// ================================================================

Future<void> cerrarSesionAdmin(BuildContext context) async {
  await AuthController().cerrarSesion();

  if (!context.mounted) return;

  Navigator.of(context).pushAndRemoveUntil(
    MaterialPageRoute(builder: (_) => const LoginScreen()),
    (route) => false,
  );
}

// ================================================================
// DRAWER DEL ADMIN
// ================================================================
//
// Un solo drawer para TODAS las secciones (Panel, Empleados, Platos,
// Menús, Reportes) — así el admin siempre tiene el mismo menú para
// moverse, en vez de tener que volver primero al Panel con una
// flechita de "atrás" para poder ir a otra sección.
//
// `seccionActiva` le dice al drawer en qué pantalla está parado
// (para resaltar el ítem correcto); cada pantalla que lo use debe
// pasarse a sí misma con ese nombre.
class AdminDrawer extends StatelessWidget {
  final String seccionActiva;

  const AdminDrawer({super.key, this.seccionActiva = "Panel"});

  // --------------------------------------------------------------
  // NAVEGAR A UNA SECCIÓN
  // --------------------------------------------------------------
  //
  // Siempre deja el stack como [Panel, <sección>] — nunca se va
  // acumulando (así "atrás" del sistema operativo siempre vuelve
  // al Panel, sin importar cuántas secciones hayas visitado antes).
  void _ir(BuildContext context, String seccion) {
    Navigator.pop(context); // cierra el drawer

    if (seccion == seccionActiva) return; // ya estás ahí

    if (seccion == "Panel") {
      Navigator.of(context).popUntil((route) => route.isFirst);
      return;
    }

    late final Widget pantalla;
    switch (seccion) {
      case "Platos":
        pantalla = const PlatosScreen();
      case "Empleados":
        pantalla = const AdminPlaceholderScreen(
          titulo: "Empleados",
          icono: Icons.people_outline_rounded,
        );
      case "Menús":
        pantalla = const AdminPlaceholderScreen(
          titulo: "Menús",
          icono: Icons.menu_book_outlined,
        );
      case "Reportes":
        pantalla = const AdminPlaceholderScreen(
          titulo: "Reportes",
          icono: Icons.bar_chart_rounded,
        );
      default:
        pantalla = const AdminPlaceholderScreen(
          titulo: "Próximamente",
          icono: Icons.hourglass_empty_rounded,
        );
    }

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => pantalla),
      (route) => route.isFirst,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: _adBg,

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
                border: Border(bottom: BorderSide(color: _adNeonBorder)),
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
                        Shadow(color: _adNeonGlow, blurRadius: 14),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Administrador",
                    style: GoogleFonts.inter(color: _adMuted, fontSize: 11.5),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 8),

            _DrawerItem(
              icono: Icons.grid_view_rounded,
              label: "Panel",
              activo: seccionActiva == "Panel",
              onTap: () => _ir(context, "Panel"),
            ),

            _DrawerItem(
              icono: Icons.people_outline_rounded,
              label: "Empleados",
              activo: seccionActiva == "Empleados",
              onTap: () => _ir(context, "Empleados"),
            ),

            _DrawerItem(
              icono: Icons.restaurant_menu_rounded,
              label: "Platos",
              activo: seccionActiva == "Platos",
              onTap: () => _ir(context, "Platos"),
            ),

            _DrawerItem(
              icono: Icons.menu_book_outlined,
              label: "Menús",
              activo: seccionActiva == "Menús",
              onTap: () => _ir(context, "Menús"),
            ),

            _DrawerItem(
              icono: Icons.bar_chart_rounded,
              label: "Reportes",
              activo: seccionActiva == "Reportes",
              onTap: () => _ir(context, "Reportes"),
            ),

            const Spacer(),

            // ------------------------------------------------------
            // CERRAR SESIÓN
            // ------------------------------------------------------
            Padding(
              padding: const EdgeInsets.all(16),

              child: OutlinedButton.icon(
                onPressed: () => cerrarSesionAdmin(context),

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
        color: activo ? _adNeonSoft : Colors.transparent,
        borderRadius: BorderRadius.circular(10),

        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onTap,

          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),

            child: Row(
              children: [
                Icon(icono, size: 19, color: activo ? _adNeon : _adMuted),
                const SizedBox(width: 14),
                Text(
                  label,
                  style: GoogleFonts.inter(
                    color: activo ? Colors.white : _adMuted,
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

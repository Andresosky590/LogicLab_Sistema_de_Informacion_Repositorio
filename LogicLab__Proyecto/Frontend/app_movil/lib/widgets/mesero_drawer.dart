import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/auth_controller.dart';
import '../screens/login_screen.dart';
import '../screens/mesero_menu_screen.dart';
import '../screens/mesero_mensajes_cliente_screen.dart';
import '../screens/mesero_mensajes_cocina_screen.dart';
import '../screens/mesero_pedido_asistido_screen.dart';
import '../screens/mesero_pedidos_screen.dart';

// ================================================================
// COLORES — el mismo naranja que usa Panel_Mesero.jsx (#e87d2a) en
// vez del rojo del admin o el rosa/azul del cliente.
// ================================================================

const Color _mNaranja = Color(0xFFE87D2A);
const Color _mNaranjaSoft = Color(0x26E87D2A);
const Color _mNaranjaBorder = Color(0x4DE87D2A);
const Color _mBg = Color(0xFF0A0A0A);
const Color _mMuted = Color(0xFF888888);

Future<void> cerrarSesionMesero(BuildContext context) async {
  await AuthController().cerrarSesion();
  if (!context.mounted) return;
  Navigator.of(context).pushAndRemoveUntil(
    MaterialPageRoute(builder: (_) => const LoginScreen()),
    (route) => false,
  );
}

class MeseroDrawer extends StatelessWidget {
  final String seccionActiva;

  const MeseroDrawer({super.key, this.seccionActiva = "Mesas"});

  void _ir(BuildContext context, String seccion) {
    Navigator.pop(context);
    if (seccion == seccionActiva) return;

    if (seccion == "Mesas") {
      Navigator.of(context).popUntil((route) => route.isFirst);
      return;
    }

    late final Widget pantalla;
    switch (seccion) {
      case "Pedido asistido":
        pantalla = const MeseroPedidoAsistidoScreen();
      case "Menú del día":
        pantalla = const MeseroMenuScreen();
      case "Pedidos clientes":
        pantalla = const MeseroMensajesClienteScreen();
      case "Mensajes cocina":
        pantalla = const MeseroMensajesCocinaScreen();
      case "Mis pedidos":
        pantalla = const MeseroPedidosScreen();
      default:
        return;
    }

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => pantalla),
      (route) => route.isFirst,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: _mBg,
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(vertical: 28),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: _mNaranjaBorder)),
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
                        Shadow(color: _mNaranjaSoft, blurRadius: 14),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Mesero",
                    style: GoogleFonts.inter(color: _mMuted, fontSize: 11.5),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            _Item(
              icono: Icons.grid_view_rounded,
              label: "Mesas",
              activo: seccionActiva == "Mesas",
              onTap: () => _ir(context, "Mesas"),
            ),
            _Item(
              icono: Icons.add_circle_outline_rounded,
              label: "Pedido asistido",
              activo: seccionActiva == "Pedido asistido",
              onTap: () => _ir(context, "Pedido asistido"),
            ),
            _Item(
              icono: Icons.menu_book_outlined,
              label: "Menú del día",
              activo: seccionActiva == "Menú del día",
              onTap: () => _ir(context, "Menú del día"),
            ),
            _Item(
              icono: Icons.chat_bubble_outline_rounded,
              label: "Pedidos clientes",
              activo: seccionActiva == "Pedidos clientes",
              onTap: () => _ir(context, "Pedidos clientes"),
            ),
            _Item(
              icono: Icons.notifications_none_rounded,
              label: "Mensajes cocina",
              activo: seccionActiva == "Mensajes cocina",
              onTap: () => _ir(context, "Mensajes cocina"),
            ),
            _Item(
              icono: Icons.receipt_long_outlined,
              label: "Mis pedidos",
              activo: seccionActiva == "Mis pedidos",
              onTap: () => _ir(context, "Mis pedidos"),
            ),
            const Spacer(),
            Padding(
              padding: const EdgeInsets.all(16),
              child: OutlinedButton.icon(
                onPressed: () => cerrarSesionMesero(context),
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

class _Item extends StatelessWidget {
  final IconData icono;
  final String label;
  final bool activo;
  final VoidCallback onTap;

  const _Item({
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
        color: activo ? _mNaranjaSoft : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            child: Row(
              children: [
                Icon(icono, size: 19, color: activo ? _mNaranja : _mMuted),
                const SizedBox(width: 14),
                Text(
                  label,
                  style: GoogleFonts.inter(
                    color: activo ? Colors.white : _mMuted,
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

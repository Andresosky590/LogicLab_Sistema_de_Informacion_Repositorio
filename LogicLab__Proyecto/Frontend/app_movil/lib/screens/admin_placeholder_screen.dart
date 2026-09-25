import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../widgets/admin_drawer.dart';

// Pantalla temporal para las secciones del admin que aún no se han
// construido (Empleados → HU13, Menús → HU11, Reportes → HU14).
// Mantiene la navegación funcionando desde ya sin tener que esperar
// a que existan esas HU.
class AdminPlaceholderScreen extends StatelessWidget {
  final String titulo;
  final IconData icono;

  const AdminPlaceholderScreen({
    super.key,
    required this.titulo,
    required this.icono,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      drawer: AdminDrawer(seccionActiva: titulo),
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: Text(
          titulo,
          style: GoogleFonts.spaceGrotesk(color: Colors.white, fontSize: 16),
        ),
      ),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icono, color: const Color(0xFF555555), size: 44),
            const SizedBox(height: 14),
            Text(
              "Próximamente",
              style: GoogleFonts.spaceGrotesk(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              "Esta sección se construye en una próxima HU.",
              style: GoogleFonts.inter(
                color: const Color(0xFF888888),
                fontSize: 12.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

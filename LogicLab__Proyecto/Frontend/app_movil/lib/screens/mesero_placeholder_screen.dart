import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// Pantalla temporal para las secciones del mesero que aún no se han
// construido en el celular (Pedido asistido, Menú del día, Pedidos
// clientes, Mensajes cocina). Mantiene la navegación de HU21 funcionando
// sin tener que esperar a que existan esas HU.
class MeseroPlaceholderScreen extends StatelessWidget {
  final String titulo;
  final IconData icono;

  const MeseroPlaceholderScreen({
    super.key,
    required this.titulo,
    required this.icono,
  });

  static const Color _naranja = Color(0xFFE87D2A);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
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
      // Franja naranja inferior — mismo acento del mesero en cualquier
      // pantalla a la que se navegue desde la vista general.
      bottomNavigationBar: Container(height: 3, color: _naranja),
    );
  }
}

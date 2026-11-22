import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../controllers/notificacion_controller.dart';
import '../models/notificacion_mesa_model.dart';
import '../widgets/mesero_drawer.dart';

class MeseroAlertasScreen extends StatefulWidget {
  const MeseroAlertasScreen({super.key});
  @override
  State<MeseroAlertasScreen> createState() => _MeseroAlertasScreenState();
}

class _MeseroAlertasScreenState extends State<MeseroAlertasScreen> {
  final _controller = NotificacionController();
  List<NotificacionMesa> _alertas = [];
  Timer? _timer;
  bool _cargando = true;
  @override
  void initState() {
    super.initState();
    _cargar();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => _cargar());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _cargar() async {
    try {
      final datos = await _controller.listar();
      if (mounted) {
        setState(() {
          _alertas = datos;
          _cargando = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _cargando = false);
    }
  }

  Future<void> _atender(int id) async {
    await _controller.atender(id);
    await _cargar();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: const Color(0xFF0A0A0A),
    drawer: const MeseroDrawer(seccionActiva: 'Alertas de mesas'),
    appBar: AppBar(
      backgroundColor: Colors.black,
      title: Text(
        'ALERTAS DE MESAS',
        style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w700),
      ),
    ),
    body: _cargando
        ? const Center(child: CircularProgressIndicator())
        : _alertas.isEmpty
        ? Center(
            child: Text(
              'No hay alertas pendientes.',
              style: GoogleFonts.inter(color: Colors.white70),
            ),
          )
        : ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: _alertas.length,
            separatorBuilder: (_, _) => const SizedBox(height: 12),
            itemBuilder: (_, i) {
              final a = _alertas[i];
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF291713),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE87D2A)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      a.titulo,
                      style: GoogleFonts.spaceGrotesk(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      a.mensaje,
                      style: GoogleFonts.inter(
                        color: Colors.white70,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton(
                        onPressed: () => _atender(a.id),
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFFE87D2A),
                          foregroundColor: Colors.black,
                        ),
                        child: const Text('Marcar atendida'),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
  );
}

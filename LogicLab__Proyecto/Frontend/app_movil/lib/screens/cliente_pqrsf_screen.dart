import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/pqrsf_controller.dart';
import '../repositories/pqrsf_repository.dart' show TipoPqrsf;

const Color _clNeon = Color(0xFFFF2C4F);
const Color _clNeonSoft = Color(0x26FF2C4F);
const Color _clNeonBorder = Color(0x4DFF2C4F);
const Color _clBg = Color(0xFF0A0A0A);
const Color _clCard = Color(0x0FFFFFFF);
const Color _clMuted = Color(0xFF9B98A5);

class ClientePqrsfScreen extends StatefulWidget {
  const ClientePqrsfScreen({super.key});

  @override
  State<ClientePqrsfScreen> createState() => _ClientePqrsfScreenState();
}

class _ClientePqrsfScreenState extends State<ClientePqrsfScreen> {
  final _controller = PqrsfController();
  final _nombreCtrl = TextEditingController();
  final _mensajeCtrl = TextEditingController();

  bool _cargando = true;
  String? _error;
  List<TipoPqrsf> _tipos = [];
  int? _tipoSeleccionado;

  bool _enviando = false;
  bool _enviado = false;
  String? _errorEnvio;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _mensajeCtrl.dispose();
    super.dispose();
  }

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });
    try {
      final tipos = await _controller.cargarTipos();
      if (!mounted) return;
      setState(() {
        _tipos = tipos;
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

  Future<void> _enviar() async {
    if (_tipoSeleccionado == null) {
      setState(() => _errorEnvio = "Selecciona qué tipo de mensaje es.");
      return;
    }
    if (_mensajeCtrl.text.trim().isEmpty) {
      setState(() => _errorEnvio = "Escribe tu mensaje.");
      return;
    }

    setState(() {
      _enviando = true;
      _errorEnvio = null;
    });

    try {
      await _controller.enviar(
        idTipoPqrsf: _tipoSeleccionado!,
        mensaje: _mensajeCtrl.text,
        nombre: _nombreCtrl.text,
      );
      if (!mounted) return;
      setState(() {
        _enviando = false;
        _enviado = true;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _enviando = false;
        _errorEnvio = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _clBg,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          "PQRSF",
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 14,
            letterSpacing: 1.2,
          ),
        ),
      ),
      body: _enviado ? _vistaExito() : _buildCuerpo(),
    );
  }

  Widget _vistaExito() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.check_circle_rounded,
              color: Color(0xFF19A971),
              size: 52,
            ),
            const SizedBox(height: 16),
            Text(
              "¡Mensaje enviado!",
              style: GoogleFonts.spaceGrotesk(
                color: Colors.white,
                fontSize: 17,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              "El restaurante ya recibió tu mensaje.",
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: _clMuted, fontSize: 13),
            ),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: () => Navigator.of(context).pop(),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: _clNeon),
              ),
              child: Text(
                "Volver",
                style: GoogleFonts.inter(
                  color: _clNeon,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCuerpo() {
    if (_cargando) {
      return const Center(child: CircularProgressIndicator(color: _clNeon));
    }
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, color: _clMuted, size: 40),
              const SizedBox(height: 14),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: _clMuted, fontSize: 12.5),
              ),
              const SizedBox(height: 14),
              TextButton(
                onPressed: _cargar,
                child: const Text(
                  "Reintentar",
                  style: TextStyle(color: _clNeon),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text(
          "Cuéntanos qué pasó — petición, queja, reclamo, sugerencia o felicitación.",
          style: GoogleFonts.inter(color: _clMuted, fontSize: 12.5),
        ),
        const SizedBox(height: 18),
        Text(
          "TIPO",
          style: GoogleFonts.spaceGrotesk(
            color: _clNeon,
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _tipos.map((t) {
            final activo = _tipoSeleccionado == t.id;
            return GestureDetector(
              onTap: () => setState(() => _tipoSeleccionado = t.id),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 13,
                  vertical: 9,
                ),
                decoration: BoxDecoration(
                  color: activo ? _clNeon : _clNeonSoft,
                  borderRadius: BorderRadius.circular(9),
                  border: Border.all(color: activo ? _clNeon : _clNeonBorder),
                ),
                child: Text(
                  t.nombre,
                  style: GoogleFonts.inter(
                    color: activo ? Colors.white : Colors.white70,
                    fontSize: 12.5,
                    fontWeight: activo ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 18),
        Text(
          "TU NOMBRE (opcional)",
          style: GoogleFonts.spaceGrotesk(
            color: _clNeon,
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 8),
        _campo(_nombreCtrl, "Anónimo si lo dejas vacío"),
        const SizedBox(height: 18),
        Text(
          "MENSAJE",
          style: GoogleFonts.spaceGrotesk(
            color: _clNeon,
            fontSize: 10.5,
            fontWeight: FontWeight.w700,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 8),
        _campo(_mensajeCtrl, "Escribe aquí...", lineas: 5),
        if (_errorEnvio != null) ...[
          const SizedBox(height: 12),
          Text(
            _errorEnvio!,
            style: GoogleFonts.inter(
              color: const Color(0xFFE74C3C),
              fontSize: 12.5,
            ),
          ),
        ],
        const SizedBox(height: 22),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _enviando ? null : _enviar,
            style: ElevatedButton.styleFrom(
              backgroundColor: _clNeon,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: Text(
              _enviando ? "Enviando..." : "Enviar",
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
            ),
          ),
        ),
      ],
    );
  }

  Widget _campo(TextEditingController ctrl, String hint, {int lineas = 1}) {
    return TextField(
      controller: ctrl,
      maxLines: lineas,
      style: GoogleFonts.inter(color: Colors.white, fontSize: 13.5),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.inter(color: _clMuted, fontSize: 13),
        filled: true,
        fillColor: _clCard,
        contentPadding: const EdgeInsets.all(12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }
}

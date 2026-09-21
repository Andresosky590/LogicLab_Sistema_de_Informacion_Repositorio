import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../formato.dart';
import '../models/menu_dia_model.dart';
import '../repositories/auth_repository.dart' show baseUrl;
import '../repositories/menu_dia_repository.dart';
import '../widgets/mesero_drawer.dart';

const Color _mNaranja = Color(0xFFE87D2A);
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

class MeseroMenuScreen extends StatefulWidget {
  const MeseroMenuScreen({super.key});

  @override
  State<MeseroMenuScreen> createState() => _MeseroMenuScreenState();
}

class _MeseroMenuScreenState extends State<MeseroMenuScreen> {
  final _repository = MenuDiaRepository();

  bool _cargando = true;
  String? _error;
  MenuDia? _menu;

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
      final menu = await _repository.obtenerMenuHoy();
      if (!mounted) return;
      setState(() {
        _menu = menu;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _mBg,
      drawer: const MeseroDrawer(seccionActiva: "Menú del día"),
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          "MENÚ DEL DÍA",
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

    final menu = _menu;
    if (menu == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                "El menú de hoy aún no está listo.",
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                "El administrador lo publicará en breve.",
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: _mMuted, fontSize: 12.5),
              ),
            ],
          ),
        ),
      );
    }

    final platos = menu.items.where((i) => i.idCategoria != 4).toList();
    final bebidas = menu.items.where((i) => i.idCategoria == 4).toList();

    return RefreshIndicator(
      color: _mNaranja,
      backgroundColor: Colors.black,
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (platos.isNotEmpty) ...[
            _titulo("PLATOS"),
            const SizedBox(height: 10),
            ...platos.map(_tarjeta),
            const SizedBox(height: 18),
          ],
          if (bebidas.isNotEmpty) ...[
            _titulo("BEBIDAS"),
            const SizedBox(height: 10),
            ...bebidas.map(_tarjeta),
          ],
        ],
      ),
    );
  }

  Widget _titulo(String t) => Center(
    child: Text(
      t,
      style: GoogleFonts.spaceGrotesk(
        color: _mNaranja,
        fontSize: 13,
        fontWeight: FontWeight.w700,
        letterSpacing: 2,
      ),
    ),
  );

  Widget _tarjeta(MenuDiaItem item) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: _mCard,
        borderRadius: BorderRadius.circular(14),
        border: item.esCorriente ? Border.all(color: _mNaranja) : null,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 16 / 9,
            child: item.imagenUrl != null
                ? Image.network(
                    "$baseUrl${item.imagenUrl}",
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Image.asset(
                      _rutaImagen(item.idCategoria),
                      fit: BoxFit.cover,
                    ),
                  )
                : Image.asset(_rutaImagen(item.idCategoria), fit: BoxFit.cover),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.nombrePlato,
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if ((item.descripcion ?? "").isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    item.descripcion!,
                    style: GoogleFonts.inter(color: _mMuted, fontSize: 12),
                  ),
                ],
                const SizedBox(height: 8),
                Text(
                  fmtPesos(item.precio),
                  style: GoogleFonts.spaceGrotesk(
                    color: _mNaranja,
                    fontSize: 16,
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

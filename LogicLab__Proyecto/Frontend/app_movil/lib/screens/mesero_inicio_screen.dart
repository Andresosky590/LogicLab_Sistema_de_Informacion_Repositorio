import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/mesero_controller.dart';
import '../formato.dart';
import '../models/mesa_model.dart';
import '../widgets/mesero_drawer.dart';

const Color _mNaranja = Color(0xFFE87D2A);
const Color _mNaranjaBorder = Color(0x4DE87D2A);
const Color _mBg = Color(0xFF0A0A0A);
const Color _mCard = Color(0x0AFFFFFF);
const Color _mMuted = Color(0xFF888888);

class MeseroHomeScreen extends StatefulWidget {
  const MeseroHomeScreen({super.key});

  @override
  State<MeseroHomeScreen> createState() => _MeseroHomeScreenState();
}

class _MeseroHomeScreenState extends State<MeseroHomeScreen> {
  final _controller = MeseroController();

  bool _cargando = true;
  String? _error;
  ResumenMesero? _resumen;
  List<Mesa> _mesas = [];
  final Set<int> _liberando = {};

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
      final resultados = await Future.wait([
        _controller.cargarResumen(),
        _controller.cargarMesas(),
      ]);
      if (!mounted) return;
      setState(() {
        _resumen = resultados[0] as ResumenMesero;
        _mesas = resultados[1] as List<Mesa>;
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

  Future<void> _confirmarLiberar(Mesa mesa) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF161616),
        title: Text(
          "¿Liberar la Mesa ${mesa.numero}?",
          style: GoogleFonts.spaceGrotesk(color: Colors.white, fontSize: 15),
        ),
        content: Text(
          "Solo hazlo si los clientes ya se fueron.",
          style: GoogleFonts.inter(color: _mMuted, fontSize: 12.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text("Cancelar", style: TextStyle(color: _mMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text("Liberar", style: TextStyle(color: _mNaranja)),
          ),
        ],
      ),
    );
    if (confirmar != true) return;

    setState(() => _liberando.add(mesa.id));
    try {
      await _controller.liberarMesa(mesa.id);
      await _cargar();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: const Color(0xFFE74C3C),
        ),
      );
    } finally {
      if (mounted) setState(() => _liberando.remove(mesa.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _mBg,
      drawer: const MeseroDrawer(seccionActiva: "Mesas"),
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          "PANEL DEL MESERO",
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
            fontSize: 13,
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

    final resumen = _resumen!;

    return RefreshIndicator(
      color: _mNaranja,
      backgroundColor: Colors.black,
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(
                child: _tarjetaMetrica(
                  "Pedidos hoy",
                  fmtMiles(resumen.pedidosHoy),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _tarjetaMetrica(
                  "Entregados",
                  fmtMiles(resumen.entregadosHoy),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _tarjetaMetrica(
                  "Cobrado hoy",
                  fmtPesos(resumen.cobradoHoy),
                  destacada: true,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            "ESTADO DE LAS MESAS",
            style: GoogleFonts.spaceGrotesk(
              color: _mNaranja,
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 10),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 0.95,
            ),
            itemCount: _mesas.length,
            itemBuilder: (context, i) {
              final mesa = _mesas[i];
              final ocupada = mesa.estado.toLowerCase() == "ocupada";
              final liberando = _liberando.contains(mesa.id);
              return GestureDetector(
                onTap: ocupada && !liberando
                    ? () => _confirmarLiberar(mesa)
                    : null,
                child: Container(
                  decoration: BoxDecoration(
                    color: ocupada
                        ? const Color(0x33E74C3C)
                        : const Color(0x3319A971),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: ocupada
                          ? const Color(0xFFE74C3C)
                          : const Color(0xFF19A971),
                    ),
                  ),
                  child: Center(
                    child: liberando
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                ocupada
                                    ? Icons.restaurant_rounded
                                    : Icons.table_restaurant_rounded,
                                color: Colors.white,
                                size: 24,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                "Mesa ${mesa.numero}",
                                style: GoogleFonts.inter(
                                  color: Colors.white,
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                mesa.estado.toUpperCase(),
                                style: GoogleFonts.inter(
                                  color: Colors.white70,
                                  fontSize: 9,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              );
            },
          ),
          if (_mesas.any((m) => m.estado.toLowerCase() == "ocupada")) ...[
            const SizedBox(height: 10),
            Text(
              "Toca una mesa ocupada para liberarla.",
              style: GoogleFonts.inter(color: _mMuted, fontSize: 11),
            ),
          ],
        ],
      ),
    );
  }

  Widget _tarjetaMetrica(
    String etiqueta,
    String valor, {
    bool destacada = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: destacada ? _mNaranja.withValues(alpha: 0.14) : _mCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _mNaranjaBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            etiqueta.toUpperCase(),
            style: GoogleFonts.inter(
              color: _mMuted,
              fontSize: 9,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              valor,
              style: GoogleFonts.spaceGrotesk(
                color: _mNaranja,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

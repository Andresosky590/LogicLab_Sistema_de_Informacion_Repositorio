import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/menu_dia_controller.dart';
import '../models/menu_dia_model.dart';
import '../models/plato_model.dart';
import '../widgets/admin_drawer.dart';

// ================================================================
// COLORES — misma paleta neón que el resto del panel admin
// ================================================================

const Color _mdNeon = Color(0xFFFF1744);
const Color _mdNeonSoft = Color(0x26FF1744);
const Color _mdNeonBorder = Color(0x4DFF1744);
const Color _mdBg = Color(0xFF0A0A0A);
const Color _mdCard = Color(0xFF111111);
const Color _mdMuted = Color(0xFF888888);

// Opciones fijas de la Corriente del Día — idénticas a las de
// Admin/Menus.jsx en la web, para que ambas plataformas ofrezcan
// exactamente las mismas combinaciones.
const _opcionesSopa = [
  "Sopa de Ajiaco",
  "Sopa de Pasta",
  "Sopa de Arroz",
  "Sopa de Sancocho",
  "Crema de Ahuyama",
  "Crema de Champiñones",
];
const _opcionesProteina = [
  "Res",
  "Cerdo",
  "Pechuga",
  "Chuleta",
  "Pollo Sudado",
  "Carne Molida",
];
const _opcionesPrincipio = [
  "Frijol",
  "Arveja",
  "Lentejas",
  "Garbanzos",
  "Espaguetis",
  "Macarrones",
  "Poteca de Ahuyama",
  "Puré de Papa",
];
const _opcionesAcompanante = [
  "Papa Salada",
  "Tajadas Fritas",
  "Plátano Maduro",
  "Yuca Blanca",
];

class MenuDiaScreen extends StatefulWidget {
  const MenuDiaScreen({super.key});

  @override
  State<MenuDiaScreen> createState() => _MenuDiaScreenState();
}

class _MenuDiaScreenState extends State<MenuDiaScreen> {
  final _controller = MenuDiaController();

  bool _cargando = true;
  bool _publicando = false;
  String? _error;

  List<Plato> _platos = [];
  List<Categoria> _categorias = [];
  MenuDia? _menuActual;

  // Selecciones de la Corriente del Día.
  final Set<String> _sopas = {};
  final Set<String> _proteinas = {};
  final Set<String> _principios = {};
  final Set<String> _acompanantes = {};

  // Platos/bebidas reales elegidos (categorías 2, 3 y 4).
  final Set<int> _platosSeleccionados = {};

  String _filtro = "2";

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  // ==============================================================
  // CARGAR
  // ==============================================================

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });

    try {
      final datos = await _controller.cargarDatos();
      if (!mounted) return;
      setState(() {
        _platos = datos.platos;
        _categorias = datos.categorias;
        _menuActual = datos.menuActual;

        // Pre-seleccionamos los platos reales que ya estén publicados hoy
        // (la Corriente del Día no se puede reconstruir a chips exactos,
        // solo queda su descripción para mostrarla como referencia).
        _platosSeleccionados
          ..clear()
          ..addAll(
            (datos.menuActual?.items ?? [])
                .where((i) => !i.esCorriente)
                .map((i) => i.idPlatos),
          );

        _cargando = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst("MenuDiaException: ", "");
        _cargando = false;
      });
    }
  }

  // ==============================================================
  // PUBLICAR
  // ==============================================================

  Future<void> _publicar() async {
    setState(() => _publicando = true);

    final platosMenu = _platos
        .where((p) => _platosSeleccionados.contains(p.id))
        .toList();

    try {
      await _controller.publicar(
        platosSeleccionados: platosMenu,
        corriente: {
          "sopas": _sopas.toList(),
          "proteinas": _proteinas.toList(),
          "principios": _principios.toList(),
          "acompanantes": _acompanantes.toList(),
        },
      );
      if (!mounted) return;
      Navigator.of(context).pop(); // cierra el modal de confirmación
      await _cargar(); // trae el menú recién publicado
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Menú del día publicado correctamente."),
          backgroundColor: Color(0xFF2EA043),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            e.toString().replaceFirst("MenuDiaException: ", ""),
          ),
          backgroundColor: const Color(0xFFE74C3C),
        ),
      );
    } finally {
      if (mounted) setState(() => _publicando = false);
    }
  }

  // ==============================================================
  // LIMPIAR (desactivar)
  // ==============================================================

  Future<void> _limpiar() async {
    setState(() {
      _sopas.clear();
      _proteinas.clear();
      _principios.clear();
      _acompanantes.clear();
      _platosSeleccionados.clear();
    });
    try {
      await _controller.desactivar();
      if (!mounted) return;
      setState(() => _menuActual = null);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("No se pudo desactivar el menú del día."),
          backgroundColor: Color(0xFFE74C3C),
        ),
      );
    }
  }

  // ==============================================================
  // HELPERS
  // ==============================================================

  String _fmtPrecio(num precio) {
    final texto = precio.toStringAsFixed(0);
    final buffer = StringBuffer();
    for (int i = 0; i < texto.length; i++) {
      final posDesdeElFinal = texto.length - i;
      buffer.write(texto[i]);
      if (posDesdeElFinal > 1 && posDesdeElFinal % 3 == 1) buffer.write(".");
    }
    return "\$$buffer";
  }

  bool get _hayCorriente =>
      _sopas.isNotEmpty ||
      _proteinas.isNotEmpty ||
      _principios.isNotEmpty ||
      _acompanantes.isNotEmpty;

  List<Plato> get _platosFiltrados => _platos
      .where((p) => ["2", "3", "4"].contains(p.idCategoria.toString()))
      .where((p) => p.idCategoria.toString() == _filtro)
      .toList();

  List<Categoria> get _categoriasFiltro => _categorias
      .where((c) => ["2", "3", "4"].contains(c.id.toString()))
      .toList();

  MenuDiaItem? get _corrientePublicada {
    final items = _menuActual?.items ?? [];
    for (final item in items) {
      if (item.esCorriente) return item;
    }
    return null;
  }

  // ==============================================================
  // BUILD
  // ==============================================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _mdBg,
      drawer: const AdminDrawer(seccionActiva: "Menús"),
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          "MENÚ HOY",
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
            fontSize: 13,
          ),
        ),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_cargando) {
      return const Center(child: CircularProgressIndicator(color: _mdNeon));
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, color: _mdMuted, size: 40),
              const SizedBox(height: 14),
              Text(
                "No se pudo cargar el menú",
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
                style: GoogleFonts.inter(color: _mdMuted, fontSize: 12.5),
              ),
              const SizedBox(height: 14),
              TextButton(
                onPressed: _cargar,
                child: const Text("Reintentar", style: TextStyle(color: _mdNeon)),
              ),
            ],
          ),
        ),
      );
    }

    final totalItems =
        (_hayCorriente ? 1 : 0) + _platosSeleccionados.length;

    return RefreshIndicator(
      color: _mdNeon,
      backgroundColor: Colors.black,
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Text(
            "Arma el menú del día",
            style: GoogleFonts.inter(color: _mdMuted, fontSize: 12.5),
          ),
          const SizedBox(height: 16),

          // ---------------------------------------------------------
          // CORRIENTE DEL DÍA
          // ---------------------------------------------------------
          _Seccion(
            titulo: "Carta Corriente del Día",
            subtitulo:
                "Se publicará como un único plato — precio fijo ${_fmtPrecio(precioCorriente)}",
            child: Column(
              children: [
                if (_corrientePublicada != null && !_hayCorriente)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0x0AFFFFFF),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: _mdNeonBorder),
                    ),
                    child: Text(
                      "Corriente publicada hoy: ${_corrientePublicada!.descripcion}",
                      style: GoogleFonts.inter(color: _mdMuted, fontSize: 11.5),
                    ),
                  ),
                _SelectorMultiple(
                  label: "Sopa",
                  opciones: _opcionesSopa,
                  seleccionadas: _sopas,
                  onToggle: (v) => setState(
                    () => _sopas.contains(v) ? _sopas.remove(v) : _sopas.add(v),
                  ),
                ),
                _SelectorMultiple(
                  label: "Proteína",
                  opciones: _opcionesProteina,
                  seleccionadas: _proteinas,
                  onToggle: (v) => setState(
                    () => _proteinas.contains(v)
                        ? _proteinas.remove(v)
                        : _proteinas.add(v),
                  ),
                ),
                _SelectorMultiple(
                  label: "Principio",
                  opciones: _opcionesPrincipio,
                  seleccionadas: _principios,
                  onToggle: (v) => setState(
                    () => _principios.contains(v)
                        ? _principios.remove(v)
                        : _principios.add(v),
                  ),
                ),
                _SelectorMultiple(
                  label: "Acompañante",
                  opciones: _opcionesAcompanante,
                  seleccionadas: _acompanantes,
                  onToggle: (v) => setState(
                    () => _acompanantes.contains(v)
                        ? _acompanantes.remove(v)
                        : _acompanantes.add(v),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // ---------------------------------------------------------
          // PLATOS Y BEBIDAS
          // ---------------------------------------------------------
          _Seccion(
            titulo: "Platos y Bebidas del Menú",
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  height: 34,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: _categoriasFiltro.map((cat) {
                      final activo = _filtro == cat.id.toString();
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: GestureDetector(
                          onTap: () =>
                              setState(() => _filtro = cat.id.toString()),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 14,
                              vertical: 7,
                            ),
                            decoration: BoxDecoration(
                              color: activo ? _mdNeon : _mdCard,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: activo ? _mdNeon : _mdNeonBorder,
                              ),
                            ),
                            child: Text(
                              cat.nombre,
                              style: GoogleFonts.inter(
                                color: activo ? Colors.black : Colors.white,
                                fontSize: 12.5,
                                fontWeight:
                                    activo ? FontWeight.w700 : FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 12),
                ..._platosFiltrados.map((plato) {
                  final sel = _platosSeleccionados.contains(plato.id);
                  return GestureDetector(
                    onTap: () => setState(() {
                      sel
                          ? _platosSeleccionados.remove(plato.id)
                          : _platosSeleccionados.add(plato.id);
                    }),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: sel ? _mdNeonSoft : _mdCard,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: sel ? _mdNeon : const Color(0xFF2A2A2A),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 18,
                            height: 18,
                            decoration: BoxDecoration(
                              color: sel ? _mdNeon : Colors.transparent,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: _mdNeon, width: 2),
                            ),
                            child: sel
                                ? const Icon(
                                    Icons.check,
                                    size: 13,
                                    color: Colors.black,
                                  )
                                : null,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              plato.nombre,
                              style: GoogleFonts.inter(
                                color: Colors.white,
                                fontSize: 13,
                                fontWeight:
                                    sel ? FontWeight.w700 : FontWeight.w400,
                              ),
                            ),
                          ),
                          Text(
                            _fmtPrecio(plato.precio),
                            style: GoogleFonts.inter(
                              color: _mdNeon,
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
                if (_platosFiltrados.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Text(
                      "No hay platos en esta categoría.",
                      style: GoogleFonts.inter(color: _mdMuted, fontSize: 12),
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // ---------------------------------------------------------
          // RESUMEN + ACCIONES
          // ---------------------------------------------------------
          if (totalItems > 0)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              margin: const EdgeInsets.only(bottom: 14),
              decoration: BoxDecoration(
                color: _mdCard,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: _mdNeonBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Resumen",
                    style: GoogleFonts.inter(
                      color: _mdNeon,
                      fontWeight: FontWeight.w700,
                      fontSize: 12.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  if (_hayCorriente)
                    Text(
                      "Corriente del Día (${_fmtPrecio(precioCorriente)})",
                      style: GoogleFonts.inter(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  if (_platosSeleccionados.isNotEmpty)
                    Text(
                      "Platos/Bebidas: ${_platos.where((p) => _platosSeleccionados.contains(p.id)).map((p) => p.nombre).join(", ")}",
                      style: GoogleFonts.inter(color: _mdMuted, fontSize: 11.5),
                    ),
                ],
              ),
            ),

          if (_menuActual != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 8),
              margin: const EdgeInsets.only(bottom: 14),
              decoration: BoxDecoration(
                color: const Color(0x262EA043),
                border: Border.all(color: const Color(0xFF2EA043)),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                "Menú activo — visible para clientes y meseros",
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  color: const Color(0xFF2EA043),
                  fontSize: 12.5,
                ),
              ),
            ),

          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: totalItems == 0 ? null : _abrirConfirmacion,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _mdNeon,
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text(
                    "↑ Publicar Menú del Día",
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              OutlinedButton(
                onPressed: _limpiar,
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF555555)),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 13,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  "Limpiar",
                  style: TextStyle(color: _mdMuted),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _abrirConfirmacion() {
    final bebidas = _platos
        .where(
          (p) =>
              _platosSeleccionados.contains(p.id) &&
              p.idCategoria.toString() == "4",
        )
        .length;
    final platosNoBebida =
        (_hayCorriente ? 1 : 0) +
        _platos
            .where(
              (p) =>
                  _platosSeleccionados.contains(p.id) &&
                  p.idCategoria.toString() != "4",
            )
            .length;

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: _mdCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: _mdNeonBorder),
        ),
        title: Text(
          "MENÚ DE HOY",
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              "Este será el menú de hoy. ¿Está todo correcto?",
              style: GoogleFonts.inter(color: _mdMuted, fontSize: 13),
            ),
            const SizedBox(height: 12),
            Text(
              "$platosNoBebida platos · $bebidas bebidas",
              style: GoogleFonts.inter(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: _publicando
                ? null
                : () => Navigator.of(dialogContext).pop(),
            child: const Text("No", style: TextStyle(color: _mdMuted)),
          ),
          ElevatedButton(
            onPressed: _publicando ? null : _publicar,
            style: ElevatedButton.styleFrom(
              backgroundColor: _mdNeon,
              foregroundColor: Colors.black,
            ),
            child: Text(_publicando ? "Publicando..." : "¡Sí, publicar!"),
          ),
        ],
      ),
    );
  }
}

// ================================================================
// SECCIÓN CON TÍTULO
// ================================================================

class _Seccion extends StatelessWidget {
  final String titulo;
  final String? subtitulo;
  final Widget child;

  const _Seccion({required this.titulo, this.subtitulo, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _mdCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _mdNeonBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            titulo,
            style: GoogleFonts.spaceGrotesk(
              color: _mdNeon,
              fontWeight: FontWeight.w700,
              fontSize: 14,
            ),
          ),
          if (subtitulo != null) ...[
            const SizedBox(height: 4),
            Text(
              subtitulo!,
              style: GoogleFonts.inter(color: _mdMuted, fontSize: 11.5),
            ),
          ],
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

// ================================================================
// SELECTOR MÚLTIPLE (chips) — reemplaza el dropdown+etiquetas de la
// web por algo más cómodo de tocar en celular: cada opción es un chip
// que se prende/apaga directamente.
// ================================================================

class _SelectorMultiple extends StatelessWidget {
  final String label;
  final List<String> opciones;
  final Set<String> seleccionadas;
  final void Function(String) onToggle;

  const _SelectorMultiple({
    required this.label,
    required this.opciones,
    required this.seleccionadas,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              color: _mdNeon,
              fontWeight: FontWeight.w700,
              fontSize: 12.5,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: opciones.map((op) {
              final activo = seleccionadas.contains(op);
              return GestureDetector(
                onTap: () => onToggle(op),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 11,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: activo ? _mdNeonSoft : Colors.transparent,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: activo ? _mdNeon : const Color(0xFF444444),
                    ),
                  ),
                  child: Text(
                    op,
                    style: GoogleFonts.inter(
                      color: activo ? Colors.white : _mdMuted,
                      fontSize: 11.5,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}

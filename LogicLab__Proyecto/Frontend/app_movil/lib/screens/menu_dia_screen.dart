import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/menu_dia_controller.dart';
import '../formato.dart';
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
const Color _mdVerde = Color(0xFF2EA043);

// ================================================================
// MENÚ HOY (admin) — misma idea que Admin/Menus.jsx en la web, pero
// adaptada al celular: en vez de arrastrar entre columnas, cada
// sección tiene "+ Agregar platos" (se eligen por categoría en
// pestañas) y los platos se reordenan arrastrando el ícono ≡.
// ================================================================

class MenuDiaScreen extends StatefulWidget {
  const MenuDiaScreen({super.key});

  @override
  State<MenuDiaScreen> createState() => _MenuDiaScreenState();
}

class _MenuDiaScreenState extends State<MenuDiaScreen> {
  final _controller = MenuDiaController();

  bool _cargando = true;
  bool _procesando = false;
  bool _publicado = false;
  String? _error;

  List<Plato> _platos = [];
  List<Categoria> _categorias = [];
  List<SeccionEditable> _secciones = [];
  int _siguienteClave = 0;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  SeccionEditable _nuevaSeccion(String nombre, [List<int>? platos]) =>
      SeccionEditable(clave: _siguienteClave++, nombre: nombre, platos: platos);

  Plato? _plato(int id) {
    for (final p in _platos) {
      if (p.id == id) return p;
    }
    return null;
  }

  // ==============================================================
  // CARGAR — si ya hay menú hoy, se trae completo para editarlo
  // ==============================================================

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });

    try {
      final datos = await _controller.cargarDatos();
      if (!mounted) return;
      final menu = datos.menuActual;
      setState(() {
        _platos = datos.platos;
        _categorias = datos.categorias;
        _secciones = (menu != null && menu.secciones.isNotEmpty)
            ? menu.secciones
                  .map(
                    (s) => _nuevaSeccion(
                      s.nombre,
                      s.platos.map((p) => p.idPlatos).toList(),
                    ),
                  )
                  .toList()
            : [_nuevaSeccion("Corriente del día")];
        _publicado = menu != null && menu.secciones.isNotEmpty;
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

  // Cualquier cambio deja el menú "sin publicar" hasta volver a publicar
  void _cambiar(VoidCallback cambio) {
    setState(() {
      cambio();
      _publicado = false;
    });
  }

  void _aviso(String texto, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(texto),
        backgroundColor: error ? const Color(0xFFE74C3C) : _mdVerde,
      ),
    );
  }

  // ==============================================================
  // PUBLICAR / LIMPIAR
  // ==============================================================

  Future<void> _confirmarPublicar() async {
    final error = _controller.validar(_secciones);
    if (error != null) {
      _aviso(error, error: true);
      return;
    }

    final ok = await _confirmar(
      titulo: "PUBLICAR MENÚ",
      contenido: _secciones
          .map((s) => "• ${s.nombre.trim()} — ${s.platos.length} platos")
          .join("\n"),
      boton: "¡Sí, publicar!",
    );
    if (ok != true) return;

    setState(() => _procesando = true);
    try {
      await _controller.publicar(_secciones);
      if (!mounted) return;
      setState(() => _publicado = true);
      _aviso("Menú publicado: ya lo ven clientes y meseros.");
    } catch (e) {
      if (!mounted) return;
      _aviso(e.toString().replaceFirst("MenuDiaException: ", ""), error: true);
    } finally {
      if (mounted) setState(() => _procesando = false);
    }
  }

  Future<void> _confirmarLimpiar() async {
    final ok = await _confirmar(
      titulo: "RETIRAR MENÚ",
      contenido:
          "El menú de hoy dejará de verse para clientes y meseros. ¿Seguro?",
      boton: "Sí, retirar",
    );
    if (ok != true) return;

    setState(() => _procesando = true);
    try {
      await _controller.desactivar();
      if (!mounted) return;
      setState(() {
        _secciones = [_nuevaSeccion("Corriente del día")];
        _publicado = false;
      });
      _aviso("Menú de hoy retirado.");
    } catch (e) {
      if (!mounted) return;
      _aviso("No se pudo retirar el menú.", error: true);
    } finally {
      if (mounted) setState(() => _procesando = false);
    }
  }

  Future<bool?> _confirmar({
    required String titulo,
    required String contenido,
    required String boton,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (contexto) => AlertDialog(
        backgroundColor: _mdCard,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: _mdNeonBorder),
        ),
        title: Text(
          titulo,
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
        content: Text(
          contenido,
          style: GoogleFonts.inter(color: _mdMuted, fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(contexto).pop(false),
            child: const Text("Cancelar", style: TextStyle(color: _mdMuted)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(contexto).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: _mdNeon,
              foregroundColor: Colors.black,
            ),
            child: Text(boton),
          ),
        ],
      ),
    );
  }

  // ==============================================================
  // ELEGIR PLATOS PARA UNA SECCIÓN (pestañas por categoría)
  // ==============================================================

  void _elegirPlatos(SeccionEditable seccion) {
    final categorias = _categorias
        .where((c) => _platos.any((p) => p.idCategoria == c.id))
        .toList();
    if (categorias.isEmpty) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: _mdCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      builder: (_) => DefaultTabController(
        length: categorias.length,
        child: StatefulBuilder(
          builder: (contexto, setModal) => SizedBox(
            height: MediaQuery.of(contexto).size.height * 0.75,
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 6),
                  child: Text(
                    "Agregar a \"${seccion.nombre.trim().isEmpty ? "sección" : seccion.nombre.trim()}\"",
                    style: GoogleFonts.spaceGrotesk(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                TabBar(
                  isScrollable: true,
                  indicatorColor: _mdNeon,
                  labelColor: _mdNeon,
                  unselectedLabelColor: _mdMuted,
                  tabs: categorias.map((c) => Tab(text: c.nombre)).toList(),
                ),
                Expanded(
                  child: TabBarView(
                    children: categorias.map((c) {
                      final lista = _platos
                          .where((p) => p.idCategoria == c.id)
                          .toList();
                      return ListView(
                        padding: const EdgeInsets.all(12),
                        children: lista.map((p) {
                          final elegido = seccion.platos.contains(p.id);
                          return CheckboxListTile(
                            value: elegido,
                            activeColor: _mdNeon,
                            checkColor: Colors.black,
                            title: Text(
                              p.nombre,
                              style: GoogleFonts.inter(
                                color: Colors.white,
                                fontSize: 13.5,
                              ),
                            ),
                            subtitle: Text(
                              fmtPesos(p.precio),
                              style: GoogleFonts.inter(
                                color: _mdNeon,
                                fontSize: 12,
                              ),
                            ),
                            onChanged: (_) {
                              _cambiar(() {
                                elegido
                                    ? seccion.platos.remove(p.id)
                                    : seccion.platos.add(p.id);
                              });
                              setModal(() {});
                            },
                          );
                        }).toList(),
                      );
                    }).toList(),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () => Navigator.of(contexto).pop(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _mdNeon,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 13),
                      ),
                      child: const Text(
                        "Listo",
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
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
                child: const Text(
                  "Reintentar",
                  style: TextStyle(color: _mdNeon),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        Text(
          "Arma las secciones del menú y agrega los platos de cada una.",
          style: GoogleFonts.inter(color: _mdMuted, fontSize: 12.5),
        ),
        const SizedBox(height: 12),

        if (_publicado)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: const Color(0x262EA043),
              border: Border.all(color: _mdVerde),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              "● Publicado — visible para clientes y meseros",
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: _mdVerde, fontSize: 12.5),
            ),
          ),

        for (int i = 0; i < _secciones.length; i++) _tarjetaSeccion(i),

        OutlinedButton.icon(
          onPressed: () => _cambiar(() => _secciones.add(_nuevaSeccion(""))),
          icon: const Icon(Icons.add, color: _mdNeon, size: 18),
          label: Text(
            "Agregar sección",
            style: GoogleFonts.inter(
              color: _mdNeon,
              fontWeight: FontWeight.w700,
            ),
          ),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: _mdNeon),
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        ),
        const SizedBox(height: 20),

        Row(
          children: [
            Expanded(
              child: ElevatedButton(
                onPressed: _procesando ? null : _confirmarPublicar,
                style: ElevatedButton.styleFrom(
                  backgroundColor: _mdNeon,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(
                  _procesando ? "Guardando..." : "↑ Publicar menú del día",
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
            const SizedBox(width: 10),
            OutlinedButton(
              onPressed: _procesando ? null : _confirmarLimpiar,
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
              child: const Text("Limpiar", style: TextStyle(color: _mdMuted)),
            ),
          ],
        ),
      ],
    );
  }

  // ==============================================================
  // TARJETA DE UNA SECCIÓN
  // ==============================================================

  Widget _tarjetaSeccion(int indice) {
    final seccion = _secciones[indice];

    return Container(
      key: ValueKey(seccion.clave),
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _mdCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _mdNeonBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  key: ValueKey("nombre-${seccion.clave}"),
                  initialValue: seccion.nombre,
                  maxLength: 60,
                  style: GoogleFonts.spaceGrotesk(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                  cursorColor: _mdNeon,
                  decoration: const InputDecoration(
                    hintText: "Nombre (ej. Comida rápida)",
                    hintStyle: TextStyle(color: _mdMuted, fontSize: 13),
                    counterText: "",
                    isDense: true,
                    enabledBorder: UnderlineInputBorder(
                      borderSide: BorderSide(color: Color(0xFF333333)),
                    ),
                    focusedBorder: UnderlineInputBorder(
                      borderSide: BorderSide(color: _mdNeon),
                    ),
                  ),
                  onChanged: (v) => _cambiar(() => seccion.nombre = v),
                ),
              ),
              IconButton(
                tooltip: "Subir",
                icon: const Icon(Icons.arrow_upward, size: 18),
                color: _mdMuted,
                onPressed: indice == 0
                    ? null
                    : () => _cambiar(() {
                        final s = _secciones.removeAt(indice);
                        _secciones.insert(indice - 1, s);
                      }),
              ),
              IconButton(
                tooltip: "Bajar",
                icon: const Icon(Icons.arrow_downward, size: 18),
                color: _mdMuted,
                onPressed: indice == _secciones.length - 1
                    ? null
                    : () => _cambiar(() {
                        final s = _secciones.removeAt(indice);
                        _secciones.insert(indice + 1, s);
                      }),
              ),
              IconButton(
                tooltip: "Quitar sección",
                icon: const Icon(Icons.close, size: 18),
                color: const Color(0xFFE74C3C),
                onPressed: () => _cambiar(() => _secciones.removeAt(indice)),
              ),
            ],
          ),
          const SizedBox(height: 8),

          if (seccion.platos.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Text(
                "Sin platos todavía",
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: _mdMuted, fontSize: 12),
              ),
            )
          else
            ReorderableListView(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              buildDefaultDragHandles: false,
              onReorder: (anterior, nuevo) => _cambiar(() {
                if (nuevo > anterior) nuevo -= 1;
                final id = seccion.platos.removeAt(anterior);
                seccion.platos.insert(nuevo, id);
              }),
              children: [
                for (int j = 0; j < seccion.platos.length; j++)
                  _filaPlato(seccion, j),
              ],
            ),

          const SizedBox(height: 6),
          TextButton.icon(
            onPressed: () => _elegirPlatos(seccion),
            icon: const Icon(
              Icons.add_circle_outline,
              color: _mdNeon,
              size: 18,
            ),
            label: Text(
              "Agregar platos",
              style: GoogleFonts.inter(
                color: _mdNeon,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _filaPlato(SeccionEditable seccion, int j) {
    final id = seccion.platos[j];
    final plato = _plato(id);

    return Container(
      key: ValueKey("plato-${seccion.clave}-$id"),
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        color: _mdNeonSoft.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          ReorderableDragStartListener(
            index: j,
            child: const Padding(
              padding: EdgeInsets.all(6),
              child: Icon(Icons.drag_handle, color: _mdMuted, size: 20),
            ),
          ),
          Expanded(
            child: Text(
              plato?.nombre ?? "Plato no disponible",
              style: GoogleFonts.inter(color: Colors.white, fontSize: 13),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text(
            plato != null ? fmtPesos(plato.precio) : "",
            style: GoogleFonts.inter(
              color: _mdNeon,
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 16),
            color: _mdMuted,
            visualDensity: VisualDensity.compact,
            onPressed: () => _cambiar(() => seccion.platos.removeAt(j)),
          ),
        ],
      ),
    );
  }
}

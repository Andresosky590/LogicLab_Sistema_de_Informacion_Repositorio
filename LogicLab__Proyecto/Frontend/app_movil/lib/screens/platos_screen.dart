import 'dart:typed_data';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import '../controllers/plato_controller.dart';
import '../models/plato_model.dart';
import '../repositories/auth_repository.dart' show baseUrl;
import '../widgets/admin_drawer.dart';

// ================================================================
// COLORES — misma paleta que el resto del panel admin
// ================================================================

const Color _plNeon = Color(0xFFFF1744);
const Color _plNeonBorder = Color(0x4DFF1744);
const Color _plBg = Color(0xFF0A0A0A);
const Color _plCard = Color(0x0AFFFFFF);
const Color _plMuted = Color(0xFF888888);
const Color _plInputBg = Color(0x14FFFFFF);

class PlatosScreen extends StatefulWidget {
  const PlatosScreen({super.key});

  @override
  State<PlatosScreen> createState() => _PlatosScreenState();
}

class _PlatosScreenState extends State<PlatosScreen> {
  final _controller = PlatoController();

  bool _cargando = true;
  String? _error;

  List<Plato> _platos = [];
  List<Categoria> _categorias = [];

  String _busqueda = "";
  int? _filtroCategoria; // null = "todas"

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
      final datos = await _controller.cargarPlatos();
      if (!mounted) return;
      setState(() {
        _platos = datos.platos;
        _categorias = datos.categorias;
        _cargando = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst("PlatoException: ", "");
        _cargando = false;
      });
    }
  }

  String _nombreCategoria(int id) {
    final match = _categorias.where((c) => c.id == id);
    return match.isEmpty ? "" : match.first.nombre;
  }

  String _fmtPrecio(double precio) {
    final texto = precio.toStringAsFixed(0);
    final buffer = StringBuffer();
    for (int i = 0; i < texto.length; i++) {
      final posDesdeElFinal = texto.length - i;
      buffer.write(texto[i]);
      if (posDesdeElFinal > 1 && posDesdeElFinal % 3 == 1) buffer.write(".");
    }
    return "\$$buffer";
  }

  List<Plato> get _filtrados {
    return _platos.where((p) {
      final coincideBusqueda = p.nombre.toLowerCase().contains(
        _busqueda.toLowerCase(),
      );
      final coincideCategoria =
          _filtroCategoria == null || p.idCategoria == _filtroCategoria;
      return coincideBusqueda && coincideCategoria;
    }).toList();
  }

  // ==============================================================
  // CAMBIAR DISPONIBILIDAD (optimista, con rollback si falla)
  // ==============================================================

  Future<void> _toggleDisponibilidad(Plato plato) async {
    final nuevoValor = !plato.disponible;

    setState(() {
      _platos = _platos
          .map((p) => p.id == plato.id ? p.copyWith(disponible: nuevoValor) : p)
          .toList();
    });

    try {
      await _controller.cambiarDisponibilidad(plato.id, nuevoValor);
    } catch (e) {
      if (!mounted) return;
      // Revertimos si el backend no lo aceptó.
      setState(() {
        _platos = _platos
            .map(
              (p) => p.id == plato.id ? p.copyWith(disponible: !nuevoValor) : p,
            )
            .toList();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("No se pudo actualizar la disponibilidad."),
          backgroundColor: Color(0xFFE74C3C),
        ),
      );
    }
  }

  // ==============================================================
  // BUILD
  // ==============================================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _plBg,
      drawer: const AdminDrawer(seccionActiva: "Platos"),
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          "GESTIÓN DE PLATOS",
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
            fontSize: 13,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline, color: _plNeon),
            tooltip: "Agregar plato",
            onPressed: _categorias.isEmpty
                ? null
                : () => _abrirFormularioNuevo(context),
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_cargando) {
      return const Center(child: CircularProgressIndicator(color: _plNeon));
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, color: _plMuted, size: 40),
              const SizedBox(height: 14),
              Text(
                "No se pudo cargar la carta",
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
                style: GoogleFonts.inter(color: _plMuted, fontSize: 12.5),
              ),
              const SizedBox(height: 14),
              TextButton(
                onPressed: _cargar,
                child: const Text(
                  "Reintentar",
                  style: TextStyle(color: _plNeon),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: _plNeon,
      backgroundColor: Colors.black,
      onRefresh: _cargar,
      child: Column(
        children: [
          // --------------------------------------------------------
          // BUSCADOR
          // --------------------------------------------------------
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: TextField(
              style: GoogleFonts.inter(color: Colors.white, fontSize: 13.5),
              decoration: InputDecoration(
                hintText: "Buscar...",
                hintStyle: GoogleFonts.inter(color: _plMuted, fontSize: 13.5),
                prefixIcon: const Icon(Icons.search, color: _plMuted, size: 19),
                filled: true,
                fillColor: _plInputBg,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (v) => setState(() => _busqueda = v),
            ),
          ),

          // --------------------------------------------------------
          // FILTROS DE CATEGORÍA
          // --------------------------------------------------------
          SizedBox(
            height: 36,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _ChipCategoria(
                  label: "Todos",
                  activo: _filtroCategoria == null,
                  onTap: () => setState(() => _filtroCategoria = null),
                ),
                for (final c in _categorias)
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: _ChipCategoria(
                      label: c.nombre,
                      activo: _filtroCategoria == c.id,
                      onTap: () => setState(() => _filtroCategoria = c.id),
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 6),

          // --------------------------------------------------------
          // LISTA
          // --------------------------------------------------------
          Expanded(
            child: _filtrados.isEmpty
                ? ListView(
                    // ListView (no Center solo) para que el
                    // RefreshIndicator siga funcionando con lista vacía.
                    children: [
                      const SizedBox(height: 60),
                      Center(
                        child: Text(
                          "No se encontraron platos",
                          style: GoogleFonts.inter(
                            color: _plMuted,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 20),
                    itemCount: _filtrados.length,
                    itemBuilder: (context, index) {
                      final plato = _filtrados[index];
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _PlatoCard(
                          plato: plato,
                          nombreCategoria: _nombreCategoria(plato.idCategoria),
                          precioFmt: _fmtPrecio(plato.precio),
                          onToggleDisponible: () =>
                              _toggleDisponibilidad(plato),
                          onEditar: () =>
                              _abrirFormularioEdicion(context, plato),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  // ==============================================================
  // FORMULARIO: EDITAR PLATO
  // ==============================================================

  void _abrirFormularioEdicion(BuildContext context, Plato plato) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _FormularioPlato(
        titulo: plato.nombre,
        categoria: _nombreCategoria(plato.idCategoria),
        descripcionInicial: plato.descripcion ?? "",
        precioInicial: plato.precio,
        esEdicion: true,
        imagenUrlExistente: plato.imagenUrl != null
            ? "$baseUrl${plato.imagenUrl}"
            : null,
        onGuardar: (descripcion, precio, _, imagen) async {
          await _controller.actualizarPlato(
            id: plato.id,
            descripcion: descripcion,
            precio: precio,
          );
          if (imagen != null) {
            await _controller.subirImagen(plato.id, imagen);
          }
          await _cargar();
        },
        onEliminar: () async {
          await _controller.eliminarPlato(plato.id);
          await _cargar();
        },
      ),
    );
  }

  // ==============================================================
  // FORMULARIO: NUEVO PLATO
  // ==============================================================

  void _abrirFormularioNuevo(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _FormularioPlato(
        titulo: "Nuevo plato",
        esEdicion: false,
        categorias: _categorias,
        onGuardar: (descripcion, precio, datosNuevo, imagen) async {
          final nuevoId = await _controller.crearPlato(
            nombre: datosNuevo!.nombre,
            descripcion: descripcion,
            precio: precio,
            idCategoria: datosNuevo.idCategoria,
          );
          if (imagen != null) {
            await _controller.subirImagen(nuevoId, imagen);
          }
          await _cargar();
        },
      ),
    );
  }
}

// ================================================================
// CHIP DE CATEGORÍA
// ================================================================

class _ChipCategoria extends StatelessWidget {
  final String label;
  final bool activo;
  final VoidCallback onTap;

  const _ChipCategoria({
    required this.label,
    required this.activo,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: activo ? _plNeon : _plCard,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: activo ? _plNeon : _plNeonBorder),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: GoogleFonts.inter(
            color: activo ? Colors.black : Colors.white,
            fontSize: 12.5,
            fontWeight: activo ? FontWeight.w700 : FontWeight.w500,
          ),
        ),
      ),
    );
  }
}

// ================================================================
// TARJETA DE PLATO
// ================================================================

class _PlatoCard extends StatelessWidget {
  final Plato plato;
  final String nombreCategoria;
  final String precioFmt;
  final VoidCallback onToggleDisponible;
  final VoidCallback onEditar;

  const _PlatoCard({
    required this.plato,
    required this.nombreCategoria,
    required this.precioFmt,
    required this.onToggleDisponible,
    required this.onEditar,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _plCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _plNeonBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ----------------------------------------------------
          // MINIATURA
          // ----------------------------------------------------
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: plato.imagenUrl != null
                ? Image.network(
                    "$baseUrl${plato.imagenUrl}",
                    width: 56,
                    height: 56,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => const _MiniaturaVacia(),
                    loadingBuilder: (context, child, progreso) {
                      if (progreso == null) return child;
                      return const SizedBox(
                        width: 56,
                        height: 56,
                        child: Center(
                          child: SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: _plNeon,
                            ),
                          ),
                        ),
                      );
                    },
                  )
                : const _MiniaturaVacia(),
          ),

          const SizedBox(width: 12),

          // ----------------------------------------------------
          // INFO
          // ----------------------------------------------------
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        plato.nombre,
                        style: GoogleFonts.spaceGrotesk(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (!plato.disponible)
                      Container(
                        margin: const EdgeInsets.only(left: 6),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0x33E74C3C),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          "AGOTADO",
                          style: GoogleFonts.inter(
                            color: const Color(0xFFE74C3C),
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(
                  nombreCategoria,
                  style: GoogleFonts.inter(color: _plMuted, fontSize: 11),
                ),
                if ((plato.descripcion ?? "").isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    plato.descripcion!,
                    style: GoogleFonts.inter(
                      color: const Color(0xFFBBBBBB),
                      fontSize: 11.5,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text(
                      precioFmt,
                      style: GoogleFonts.spaceGrotesk(
                        color: _plNeon,
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const Spacer(),
                    TextButton(
                      onPressed: onEditar,
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      child: Text(
                        "Editar",
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // ----------------------------------------------------
          // SWITCH DISPONIBILIDAD
          // ----------------------------------------------------
          Column(
            children: [
              Switch(
                value: plato.disponible,
                activeThumbColor: _plNeon,
                onChanged: (_) => onToggleDisponible(),
              ),
              Text(
                plato.disponible ? "Disponible" : "Agotado",
                style: GoogleFonts.inter(color: _plMuted, fontSize: 9.5),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ================================================================
// MINIATURA VACÍA (sin imagen subida todavía)
// ================================================================

class _MiniaturaVacia extends StatelessWidget {
  const _MiniaturaVacia();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      height: 56,
      decoration: BoxDecoration(
        color: const Color(0x14FFFFFF),
        borderRadius: BorderRadius.circular(10),
      ),
      child: const Icon(Icons.restaurant_rounded, color: _plMuted, size: 22),
    );
  }
}

// ================================================================
// DATOS EXCLUSIVOS DE UN PLATO NUEVO (nombre + categoría elegida)
// ================================================================

class _DatosPlatoNuevo {
  final String nombre;
  final int idCategoria;

  _DatosPlatoNuevo({required this.nombre, required this.idCategoria});
}

// ================================================================
// FORMULARIO (crear / editar) — hoja inferior
// ================================================================

class _FormularioPlato extends StatefulWidget {
  final String titulo;
  final String? categoria; // solo edición: se muestra, no se edita
  final String descripcionInicial;
  final double precioInicial;
  final bool esEdicion;
  final String? imagenUrlExistente; // solo edición: URL completa actual
  final List<Categoria> categorias; // solo creación
  final Future<void> Function(
    String? descripcion,
    double precio,
    _DatosPlatoNuevo? datosNuevo,
    XFile? imagen,
  )
  onGuardar;
  final Future<void> Function()? onEliminar;

  const _FormularioPlato({
    required this.titulo,
    this.categoria,
    this.descripcionInicial = "",
    this.precioInicial = 0,
    required this.esEdicion,
    this.imagenUrlExistente,
    this.categorias = const [],
    required this.onGuardar,
    this.onEliminar,
  });

  @override
  State<_FormularioPlato> createState() => _FormularioPlatoState();
}

class _FormularioPlatoState extends State<_FormularioPlato> {
  late final TextEditingController _nombreCtrl;
  late final TextEditingController _descripcionCtrl;
  late final TextEditingController _precioCtrl;

  final ImagePicker _picker = ImagePicker();
  XFile? _imagenSeleccionada;

  // Los bytes se leen al elegir la foto para poder mostrar la vista previa
  // con Image.memory: Image.file no existe en Flutter Web.
  Uint8List? _imagenBytes;

  int? _categoriaSeleccionada;
  bool _guardando = false;
  bool _eliminando = false;
  String? _mensajeError;

  @override
  void initState() {
    super.initState();
    _nombreCtrl = TextEditingController();
    _descripcionCtrl = TextEditingController(text: widget.descripcionInicial);
    _precioCtrl = TextEditingController(
      text: widget.precioInicial > 0
          ? widget.precioInicial.toStringAsFixed(0)
          : "",
    );
  }

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _descripcionCtrl.dispose();
    _precioCtrl.dispose();
    super.dispose();
  }

  // ==============================================================
  // ELEGIR IMAGEN (galería o cámara)
  // ==============================================================

  Future<void> _elegirImagen(ImageSource origen) async {
    try {
      final xfile = await _picker.pickImage(
        source: origen,
        imageQuality: 80,
        maxWidth: 1600,
      );
      if (xfile == null) return;

      final bytes = await xfile.readAsBytes();
      if (!mounted) return;

      // Mismo tope de 5 MB que tiene el backend (multer).
      if (bytes.length > 5 * 1024 * 1024) {
        setState(
          () => _mensajeError =
              "La imagen pesa más de 5 MB. Elige una más liviana.",
        );
        return;
      }

      setState(() {
        _imagenSeleccionada = xfile;
        _imagenBytes = bytes;
        _mensajeError = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _mensajeError = "No se pudo acceder a la imagen: $e");
    }
  }

  void _mostrarOpcionesImagen() {
    // En el navegador no hay cámara que elegir: va directo al selector de archivos.
    if (kIsWeb) {
      _elegirImagen(ImageSource.gallery);
      return;
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF161616),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_library_outlined, color: _plNeon),
              title: Text(
                "Elegir de la galería",
                style: GoogleFonts.inter(color: Colors.white, fontSize: 13.5),
              ),
              onTap: () {
                Navigator.of(context).pop();
                _elegirImagen(ImageSource.gallery);
              },
            ),
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined, color: _plNeon),
              title: Text(
                "Tomar una foto",
                style: GoogleFonts.inter(color: Colors.white, fontSize: 13.5),
              ),
              onTap: () {
                Navigator.of(context).pop();
                _elegirImagen(ImageSource.camera);
              },
            ),
            const SizedBox(height: 6),
          ],
        ),
      ),
    );
  }

  Future<void> _guardar() async {
    final precio = double.tryParse(_precioCtrl.text.replaceAll(",", ""));

    if (precio == null || precio <= 0) {
      setState(() => _mensajeError = "Ingresa un precio válido.");
      return;
    }

    _DatosPlatoNuevo? datosNuevo;

    if (!widget.esEdicion) {
      if (_nombreCtrl.text.trim().isEmpty) {
        setState(() => _mensajeError = "El nombre es obligatorio.");
        return;
      }
      if (_categoriaSeleccionada == null) {
        setState(() => _mensajeError = "Selecciona una categoría.");
        return;
      }
      datosNuevo = _DatosPlatoNuevo(
        nombre: _nombreCtrl.text.trim(),
        idCategoria: _categoriaSeleccionada!,
      );
    }

    setState(() {
      _guardando = true;
      _mensajeError = null;
    });

    try {
      await widget.onGuardar(
        _descripcionCtrl.text.trim().isEmpty
            ? null
            : _descripcionCtrl.text.trim(),
        precio,
        datosNuevo,
        _imagenSeleccionada,
      );
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _mensajeError = e.toString().replaceFirst("PlatoException: ", "");
        _guardando = false;
      });
    }
  }

  Future<void> _eliminar() async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        backgroundColor: const Color(0xFF161616),
        title: Text(
          "¿Eliminar \"${widget.titulo}\"?",
          style: GoogleFonts.spaceGrotesk(color: Colors.white, fontSize: 15),
        ),
        content: Text(
          "Esta acción no se puede deshacer.",
          style: GoogleFonts.inter(color: _plMuted, fontSize: 12.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text("Cancelar", style: TextStyle(color: _plMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text(
              "Eliminar",
              style: TextStyle(color: Color(0xFFE74C3C)),
            ),
          ),
        ],
      ),
    );

    if (confirmar != true || widget.onEliminar == null) return;

    setState(() {
      _eliminando = true;
      _mensajeError = null;
    });

    try {
      await widget.onEliminar!();
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _mensajeError = "Error al eliminar el plato.";
        _eliminando = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final ocupado = _guardando || _eliminando;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 24),
        decoration: const BoxDecoration(
          color: Color(0xFF121212),
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          border: Border(top: BorderSide(color: _plNeonBorder)),
        ),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: _plMuted,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),

              Text(
                widget.esEdicion ? "EDICIÓN" : "NUEVO PLATO",
                style: GoogleFonts.spaceGrotesk(
                  color: _plNeon,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 4),

              if (widget.esEdicion) ...[
                Text(
                  widget.titulo,
                  style: GoogleFonts.spaceGrotesk(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if (widget.categoria != null)
                  Text(
                    widget.categoria!,
                    style: GoogleFonts.inter(color: _plMuted, fontSize: 12),
                  ),
              ] else ...[
                const SizedBox(height: 10),
                _Etiqueta("Nombre"),
                _Campo(controller: _nombreCtrl, hint: "Ej: Bandeja Paisa"),
                const SizedBox(height: 12),
                _Etiqueta("Categoría"),
                _SelectorCategoria(
                  categorias: widget.categorias,
                  seleccionada: _categoriaSeleccionada,
                  onSeleccionar: (id) =>
                      setState(() => _categoriaSeleccionada = id),
                ),
              ],

              const SizedBox(height: 14),
              _Etiqueta("Foto del plato"),
              GestureDetector(
                onTap: _mostrarOpcionesImagen,
                child: Container(
                  height: 100,
                  width: double.infinity,
                  clipBehavior: Clip.hardEdge,
                  decoration: BoxDecoration(
                    color: _plInputBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: _plNeonBorder),
                  ),
                  child: _imagenSeleccionada != null
                      ? Stack(
                          fit: StackFit.expand,
                          children: [
                            Image.memory(_imagenBytes!, fit: BoxFit.cover),
                            Positioned(
                              right: 6,
                              bottom: 6,
                              child: _EtiquetaCambiarFoto(),
                            ),
                          ],
                        )
                      : widget.imagenUrlExistente != null
                      ? Stack(
                          fit: StackFit.expand,
                          children: [
                            Image.network(
                              widget.imagenUrlExistente!,
                              fit: BoxFit.cover,
                              errorBuilder: (_, _, _) => const _SinFotoAun(),
                            ),
                            Positioned(
                              right: 6,
                              bottom: 6,
                              child: _EtiquetaCambiarFoto(),
                            ),
                          ],
                        )
                      : const _SinFotoAun(),
                ),
              ),

              const SizedBox(height: 14),
              _Etiqueta("Descripción"),
              _Campo(
                controller: _descripcionCtrl,
                hint: "Breve descripción...",
                maxLines: 3,
              ),

              const SizedBox(height: 12),
              _Etiqueta("Precio"),
              _Campo(
                controller: _precioCtrl,
                hint: "0",
                keyboardType: TextInputType.number,
                sufijo: "COP",
              ),

              if (_mensajeError != null) ...[
                const SizedBox(height: 12),
                Text(
                  _mensajeError!,
                  style: GoogleFonts.inter(
                    color: const Color(0xFFE74C3C),
                    fontSize: 12.5,
                  ),
                ),
              ],

              const SizedBox(height: 20),

              Row(
                children: [
                  if (widget.esEdicion && widget.onEliminar != null)
                    TextButton(
                      onPressed: ocupado ? null : _eliminar,
                      child: Text(
                        _eliminando ? "Eliminando..." : "Eliminar",
                        style: const TextStyle(color: Color(0xFFE74C3C)),
                      ),
                    ),
                  const Spacer(),
                  TextButton(
                    onPressed: ocupado
                        ? null
                        : () => Navigator.of(context).pop(),
                    child: const Text(
                      "Cancelar",
                      style: TextStyle(color: _plMuted),
                    ),
                  ),
                  const SizedBox(width: 6),
                  ElevatedButton(
                    onPressed: ocupado ? null : _guardar,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _plNeon,
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 18,
                        vertical: 10,
                      ),
                    ),
                    child: Text(
                      _guardando
                          ? "Guardando..."
                          : (widget.esEdicion ? "Guardar" : "Crear Plato"),
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ================================================================
// WIDGETS AUXILIARES DEL FORMULARIO
// ================================================================

class _SinFotoAun extends StatelessWidget {
  const _SinFotoAun();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.add_a_photo_outlined, color: _plMuted, size: 22),
          const SizedBox(height: 6),
          Text(
            "Toca para elegir una foto",
            style: GoogleFonts.inter(color: _plMuted, fontSize: 11.5),
          ),
        ],
      ),
    );
  }
}

class _EtiquetaCambiarFoto extends StatelessWidget {
  const _EtiquetaCambiarFoto();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.65),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        "Cambiar foto",
        style: GoogleFonts.inter(
          color: Colors.white,
          fontSize: 10.5,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _Etiqueta extends StatelessWidget {
  final String texto;
  const _Etiqueta(this.texto);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Text(
        texto,
        style: GoogleFonts.inter(
          color: _plMuted,
          fontSize: 11.5,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _Campo extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final int maxLines;
  final TextInputType? keyboardType;
  final String? sufijo;

  const _Campo({
    required this.controller,
    required this.hint,
    this.maxLines = 1,
    this.keyboardType,
    this.sufijo,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      keyboardType: keyboardType,
      style: GoogleFonts.inter(color: Colors.white, fontSize: 13.5),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.inter(color: _plMuted, fontSize: 13),
        suffixText: sufijo,
        suffixStyle: GoogleFonts.inter(color: _plMuted, fontSize: 12),
        filled: true,
        fillColor: _plInputBg,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 10,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
      ),
    );
  }
}

class _SelectorCategoria extends StatelessWidget {
  final List<Categoria> categorias;
  final int? seleccionada;
  final void Function(int) onSeleccionar;

  const _SelectorCategoria({
    required this.categorias,
    required this.seleccionada,
    required this.onSeleccionar,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: categorias.map((c) {
        final activa = seleccionada == c.id;
        return GestureDetector(
          onTap: () => onSeleccionar(c.id),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
            decoration: BoxDecoration(
              color: activa ? _plNeon : _plInputBg,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: activa ? _plNeon : _plNeonBorder),
            ),
            child: Text(
              c.nombre,
              style: GoogleFonts.inter(
                color: activa ? Colors.black : Colors.white,
                fontSize: 12.5,
                fontWeight: activa ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

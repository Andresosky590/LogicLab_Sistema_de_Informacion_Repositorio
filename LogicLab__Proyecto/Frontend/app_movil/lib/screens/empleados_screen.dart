import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/empleado_controller.dart';
import '../models/empleado_model.dart';
import '../models/usuario_model.dart';
import '../widgets/admin_drawer.dart';

// ================================================================
// COLORES — misma paleta que el resto del panel admin
// ================================================================

const Color _emNeon = Color(0xFFFF1744);
const Color _emNeonBorder = Color(0x4DFF1744);
const Color _emBg = Color(0xFF0A0A0A);
const Color _emCard = Color(0x0AFFFFFF);
const Color _emMuted = Color(0xFF888888);
const Color _emInputBg = Color(0x14FFFFFF);

// Un color de acento por rol, solo para diferenciar los avatares de
// un vistazo — el rojo neón principal (_emNeon) sigue siendo el
// color de marca del panel admin.
const Map<int, Color> _colorPorRol = {
  RolId.mesero: Color(
    0xFFE87D2A,
  ), // mismo naranja que Hojas_de_Estilo/Mesero.css
  RolId.cocinero: Color(
    0xFF39FF14,
  ), // mismo verde que Hojas_de_Estilo/Cocinero.css
  RolId.administrador: _emNeon,
};

class EmpleadosScreen extends StatefulWidget {
  const EmpleadosScreen({super.key});

  @override
  State<EmpleadosScreen> createState() => _EmpleadosScreenState();
}

class _EmpleadosScreenState extends State<EmpleadosScreen> {
  final _controller = EmpleadoController();

  bool _cargando = true;
  String? _error;
  List<Empleado> _empleados = [];
  List<Empleado> _solicitudes = [];

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  // ==============================================================
  // CARGAR (empleados activos + solicitudes pendientes)
  // ==============================================================

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });

    try {
      final resultados = await Future.wait([
        _controller.cargarEmpleados(),
        _controller.cargarSolicitudes(),
      ]);
      if (!mounted) return;
      setState(() {
        _empleados = resultados[0];
        _solicitudes = resultados[1];
        _cargando = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString().replaceFirst("EmpleadoException: ", "");
        _cargando = false;
      });
    }
  }

  List<Empleado> _porRol(int rolId) =>
      _empleados.where((e) => e.rolId == rolId).toList();

  void _aviso(String texto, {bool error = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(texto),
        backgroundColor: error
            ? const Color(0xFFE74C3C)
            : const Color(0xFF1E8E4E),
      ),
    );
  }

  // ==============================================================
  // SOLICITUDES: APROBAR / DESCARTAR
  // ==============================================================

  Future<void> _aprobar(Empleado solicitud, int rolId) async {
    try {
      await _controller.aprobarSolicitud(solicitud.id, rolId);
      if (!mounted) return;
      _aviso("${solicitud.nombreCompleto} ya puede iniciar sesión.");
      await _cargar();
    } catch (e) {
      if (!mounted) return;
      _aviso(e.toString(), error: true);
    }
  }

  Future<void> _descartar(Empleado solicitud) async {
    final confirmar = await showDialog<bool>(
      context: context,
      builder: (contexto) => AlertDialog(
        backgroundColor: const Color(0xFF161616),
        title: Text(
          "¿Descartar la solicitud de \"${solicitud.nombreCompleto}\"?",
          style: GoogleFonts.spaceGrotesk(color: Colors.white, fontSize: 15),
        ),
        content: Text(
          "La solicitud se eliminará. Si la persona sí trabaja en el "
          "restaurante, tendrá que enviarla de nuevo o puedes crearla tú con el botón +.",
          style: GoogleFonts.inter(color: _emMuted, fontSize: 12.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(contexto).pop(false),
            child: const Text("Cancelar", style: TextStyle(color: _emMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.of(contexto).pop(true),
            child: const Text(
              "Descartar",
              style: TextStyle(color: Color(0xFFE74C3C)),
            ),
          ),
        ],
      ),
    );
    if (confirmar != true) return;

    try {
      await _controller.descartarSolicitud(solicitud.id);
      if (!mounted) return;
      _aviso("Solicitud descartada.");
      await _cargar();
    } catch (e) {
      if (!mounted) return;
      _aviso(e.toString(), error: true);
    }
  }

  // ==============================================================
  // BUILD
  // ==============================================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _emBg,
      drawer: const AdminDrawer(seccionActiva: "Empleados"),
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          "GESTIÓN DE USUARIOS",
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
      return const Center(child: CircularProgressIndicator(color: _emNeon));
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, color: _emMuted, size: 40),
              const SizedBox(height: 14),
              Text(
                "No se pudieron cargar los usuarios",
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
                style: GoogleFonts.inter(color: _emMuted, fontSize: 12.5),
              ),
              const SizedBox(height: 14),
              TextButton(
                onPressed: _cargar,
                child: const Text(
                  "Reintentar",
                  style: TextStyle(color: _emNeon),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: _emNeon,
      backgroundColor: Colors.black,
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
        children: [
          Text(
            "${_empleados.length} empleados registrados",
            style: GoogleFonts.inter(color: _emMuted, fontSize: 12.5),
          ),
          const SizedBox(height: 18),

          if (_solicitudes.isNotEmpty) ...[
            _SeccionSolicitudes(
              solicitudes: _solicitudes,
              onAprobar: _aprobar,
              onDescartar: _descartar,
            ),
            const SizedBox(height: 22),
          ],

          _SeccionRol(
            titulo: "MESEROS",
            rolId: RolId.mesero,
            empleados: _porRol(RolId.mesero),
            onAgregar: () => _abrirFormularioNuevo(RolId.mesero),
            onEditar: _abrirFormularioEdicion,
          ),
          const SizedBox(height: 22),

          _SeccionRol(
            titulo: "COCINEROS",
            rolId: RolId.cocinero,
            empleados: _porRol(RolId.cocinero),
            onAgregar: () => _abrirFormularioNuevo(RolId.cocinero),
            onEditar: _abrirFormularioEdicion,
          ),
          const SizedBox(height: 22),

          _SeccionRol(
            titulo: "ADMINISTRADORES",
            rolId: RolId.administrador,
            empleados: _porRol(RolId.administrador),
            onAgregar: () => _abrirFormularioNuevo(RolId.administrador),
            onEditar: _abrirFormularioEdicion,
          ),
        ],
      ),
    );
  }

  // ==============================================================
  // FORMULARIO: NUEVO EMPLEADO
  // ==============================================================

  void _abrirFormularioNuevo(int rolId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _FormularioEmpleado(
        esEdicion: false,
        rolInicial: rolId,
        rolFijo: true, // se crea dentro del grupo en el que se tocó "+"
        onGuardar: (nombre, apellido, email, rol, password) async {
          await _controller.crearEmpleado(
            nombre: nombre,
            apellido: apellido,
            email: email,
            password: password!,
            rolId: rol,
          );
          await _cargar();
        },
      ),
    );
  }

  // ==============================================================
  // FORMULARIO: EDITAR EMPLEADO
  // ==============================================================

  void _abrirFormularioEdicion(Empleado empleado) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _FormularioEmpleado(
        esEdicion: true,
        titulo: empleado.nombreCompleto,
        nombreInicial: empleado.nombre,
        apellidoInicial: empleado.apellido,
        emailInicial: empleado.email,
        rolInicial: empleado.rolId,
        rolFijo: false, // en edición sí se puede cambiar el rol
        onGuardar: (nombre, apellido, email, rol, password) async {
          await _controller.actualizarEmpleado(
            id: empleado.id,
            nombre: nombre,
            apellido: apellido,
            email: email,
            rolId: rol,
            password: password,
          );
          await _cargar();
        },
        onEliminar: () async {
          await _controller.eliminarEmpleado(empleado.id);
          await _cargar();
        },
      ),
    );
  }
}

// ================================================================
// SECCIÓN POR ROL (Meseros / Cocineros / Administradores)
// ================================================================

class _SeccionRol extends StatelessWidget {
  final String titulo;
  final int rolId;
  final List<Empleado> empleados;
  final VoidCallback onAgregar;
  final void Function(Empleado) onEditar;

  const _SeccionRol({
    required this.titulo,
    required this.rolId,
    required this.empleados,
    required this.onAgregar,
    required this.onEditar,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              titulo,
              style: GoogleFonts.spaceGrotesk(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: _emCard,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: _emNeonBorder),
              ),
              child: Text(
                "${empleados.length}",
                style: GoogleFonts.inter(
                  color: _emMuted,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const Spacer(),
            InkWell(
              borderRadius: BorderRadius.circular(20),
              onTap: onAgregar,
              child: Container(
                padding: const EdgeInsets.all(4),
                child: const Icon(
                  Icons.add_circle_outline,
                  color: _emNeon,
                  size: 22,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),

        if (empleados.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              "Sin empleados en este rol",
              style: GoogleFonts.inter(color: _emMuted, fontSize: 12.5),
            ),
          )
        else
          ...empleados.map(
            (e) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _EmpleadoCard(empleado: e, onEditar: () => onEditar(e)),
            ),
          ),
      ],
    );
  }
}

// ================================================================
// TARJETA DE EMPLEADO
// ================================================================

class _EmpleadoCard extends StatelessWidget {
  final Empleado empleado;
  final VoidCallback onEditar;

  const _EmpleadoCard({required this.empleado, required this.onEditar});

  @override
  Widget build(BuildContext context) {
    final color = _colorPorRol[empleado.rolId] ?? _emNeon;
    final inicial = empleado.nombre.isNotEmpty
        ? empleado.nombre[0].toUpperCase()
        : "?";

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _emCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _emNeonBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withValues(alpha: 0.15),
              border: Border.all(color: color, width: 1.5),
            ),
            alignment: Alignment.center,
            child: Text(
              inicial,
              style: GoogleFonts.spaceGrotesk(
                color: color,
                fontSize: 16,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  empleado.nombreCompleto,
                  style: GoogleFonts.spaceGrotesk(
                    color: Colors.white,
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  empleado.email,
                  style: GoogleFonts.inter(color: _emMuted, fontSize: 11.5),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onEditar,
            icon: const Icon(Icons.edit_outlined, color: _emMuted, size: 19),
            tooltip: "Editar",
            visualDensity: VisualDensity.compact,
          ),
        ],
      ),
    );
  }
}

// ================================================================
// FORMULARIO: NUEVO / EDITAR EMPLEADO
// ================================================================

class _FormularioEmpleado extends StatefulWidget {
  final bool esEdicion;
  final String? titulo;
  final String nombreInicial;
  final String apellidoInicial;
  final String emailInicial;
  final int rolInicial;
  final bool rolFijo;
  final Future<void> Function(
    String nombre,
    String apellido,
    String email,
    int rolId,
    String? password,
  )
  onGuardar;
  final Future<void> Function()? onEliminar;

  const _FormularioEmpleado({
    required this.esEdicion,
    this.titulo,
    this.nombreInicial = "",
    this.apellidoInicial = "",
    this.emailInicial = "",
    required this.rolInicial,
    required this.rolFijo,
    required this.onGuardar,
    this.onEliminar,
  });

  @override
  State<_FormularioEmpleado> createState() => _FormularioEmpleadoState();
}

class _FormularioEmpleadoState extends State<_FormularioEmpleado> {
  late final TextEditingController _nombreCtrl;
  late final TextEditingController _apellidoCtrl;
  late final TextEditingController _emailCtrl;
  final _passwordCtrl = TextEditingController();

  late int _rolSeleccionado;
  bool _guardando = false;
  bool _eliminando = false;
  String? _mensajeError;

  @override
  void initState() {
    super.initState();
    _nombreCtrl = TextEditingController(text: widget.nombreInicial);
    _apellidoCtrl = TextEditingController(text: widget.apellidoInicial);
    _emailCtrl = TextEditingController(text: widget.emailInicial);
    _rolSeleccionado = widget.rolInicial;
  }

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _apellidoCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _guardar() async {
    final nombre = _nombreCtrl.text.trim();
    final apellido = _apellidoCtrl.text.trim();
    final email = _emailCtrl.text.trim();
    final password = _passwordCtrl.text.trim();

    if (nombre.isEmpty || apellido.isEmpty || email.isEmpty) {
      setState(
        () => _mensajeError = "Nombre, apellido y email son obligatorios.",
      );
      return;
    }
    if (!widget.esEdicion && password.isEmpty) {
      setState(() => _mensajeError = "La contraseña es obligatoria.");
      return;
    }

    setState(() {
      _guardando = true;
      _mensajeError = null;
    });

    try {
      await widget.onGuardar(
        nombre,
        apellido,
        email,
        _rolSeleccionado,
        password.isEmpty ? null : password,
      );
      if (!mounted) return;
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _mensajeError = e.toString().replaceFirst("EmpleadoException: ", "");
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
          "¿Desactivar a \"${widget.titulo}\"?",
          style: GoogleFonts.spaceGrotesk(color: Colors.white, fontSize: 15),
        ),
        content: Text(
          "Ya no podrá iniciar sesión, pero su historial de pedidos se conserva.",
          style: GoogleFonts.inter(color: _emMuted, fontSize: 12.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text("Cancelar", style: TextStyle(color: _emMuted)),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text(
              "Desactivar",
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
        _mensajeError = "Error al desactivar el usuario.";
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
          border: Border(top: BorderSide(color: _emNeonBorder)),
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
                    color: _emMuted,
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
              ),

              Text(
                widget.esEdicion
                    ? "EDICIÓN"
                    : "NUEVO ${nombresRol[_rolSeleccionado]?.toUpperCase()}",
                style: GoogleFonts.spaceGrotesk(
                  color: _emNeon,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 4),

              if (widget.esEdicion) ...[
                Text(
                  widget.titulo ?? "",
                  style: GoogleFonts.spaceGrotesk(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 10),
              ] else ...[
                const SizedBox(height: 6),
              ],

              _Etiqueta("Nombre"),
              _Campo(controller: _nombreCtrl, hint: "Ej: Andrés"),
              const SizedBox(height: 12),

              _Etiqueta("Apellido"),
              _Campo(controller: _apellidoCtrl, hint: "Ej: Velandia"),
              const SizedBox(height: 12),

              _Etiqueta("Email"),
              _Campo(
                controller: _emailCtrl,
                hint: "correo@ejemplo.com",
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 12),

              if (!widget.rolFijo) ...[
                _Etiqueta("Rol"),
                _SelectorRol(
                  seleccionado: _rolSeleccionado,
                  onSeleccionar: (id) => setState(() => _rolSeleccionado = id),
                ),
                const SizedBox(height: 12),
              ],

              _Etiqueta(
                widget.esEdicion ? "Nueva contraseña (opcional)" : "Contraseña",
              ),
              _Campo(
                controller: _passwordCtrl,
                hint: widget.esEdicion
                    ? "Dejar vacío para no cambiar"
                    : "Contraseña segura...",
                obscureText: true,
              ),
              if (!widget.esEdicion) ...[
                const SizedBox(height: 4),
                Text(
                  "Se guardará encriptada automáticamente.",
                  style: GoogleFonts.inter(color: _emMuted, fontSize: 11),
                ),
              ],

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
                        _eliminando ? "Desactivando..." : "Desactivar",
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
                      style: TextStyle(color: _emMuted),
                    ),
                  ),
                  const SizedBox(width: 6),
                  ElevatedButton(
                    onPressed: ocupado ? null : _guardar,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _emNeon,
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
                          : (widget.esEdicion ? "Guardar" : "Crear Usuario"),
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
// SELECTOR DE ROL (chips) — mismo patrón que _SelectorCategoria
// en platos_screen.dart
// ================================================================

class _SelectorRol extends StatelessWidget {
  final int seleccionado;
  final void Function(int) onSeleccionar;

  const _SelectorRol({required this.seleccionado, required this.onSeleccionar});

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: nombresRol.entries.map((entry) {
        final activo = seleccionado == entry.key;
        return GestureDetector(
          onTap: () => onSeleccionar(entry.key),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
            decoration: BoxDecoration(
              color: activo ? _emNeon : _emInputBg,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: activo ? _emNeon : _emNeonBorder),
            ),
            child: Text(
              entry.value,
              style: GoogleFonts.inter(
                color: activo ? Colors.black : Colors.white,
                fontSize: 12.5,
                fontWeight: activo ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

// ================================================================
// ETIQUETA + CAMPO — mismos widgets reutilizables que en
// platos_screen.dart (duplicados aquí, privados a este archivo,
// para no crear un acoplamiento entre pantallas por un detalle visual).
// ================================================================

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
          color: _emMuted,
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
  final TextInputType? keyboardType;
  final bool obscureText;

  const _Campo({
    required this.controller,
    required this.hint,
    this.keyboardType,
    this.obscureText = false,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      style: GoogleFonts.inter(color: Colors.white, fontSize: 13.5),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.inter(color: _emMuted, fontSize: 13),
        filled: true,
        fillColor: _emInputBg,
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

// ================================================================
// SOLICITUDES DE REGISTRO (empleados nuevos esperando aprobación)
// ================================================================

class _SeccionSolicitudes extends StatelessWidget {
  final List<Empleado> solicitudes;
  final Future<void> Function(Empleado, int) onAprobar;
  final Future<void> Function(Empleado) onDescartar;

  const _SeccionSolicitudes({
    required this.solicitudes,
    required this.onAprobar,
    required this.onDescartar,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(
              "SOLICITUDES DE REGISTRO",
              style: GoogleFonts.spaceGrotesk(
                color: Colors.white,
                fontSize: 13,
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: _emNeon,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                "${solicitudes.length}",
                style: GoogleFonts.inter(
                  color: Colors.black,
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        ...solicitudes.map(
          (s) => Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _SolicitudCard(
              // la key evita que una tarjeta herede el rol elegido de otra
              key: ValueKey(s.id),
              solicitud: s,
              onAprobar: (rolId) => onAprobar(s, rolId),
              onDescartar: () => onDescartar(s),
            ),
          ),
        ),
      ],
    );
  }
}

class _SolicitudCard extends StatefulWidget {
  final Empleado solicitud;
  final Future<void> Function(int rolId) onAprobar;
  final Future<void> Function() onDescartar;

  const _SolicitudCard({
    super.key,
    required this.solicitud,
    required this.onAprobar,
    required this.onDescartar,
  });

  @override
  State<_SolicitudCard> createState() => _SolicitudCardState();
}

class _SolicitudCardState extends State<_SolicitudCard> {
  // Por defecto se aprueba con el rol que pidió el empleado
  late int _rol = widget.solicitud.rolId;
  bool _procesando = false;

  Future<void> _ejecutar(Future<void> Function() accion) async {
    setState(() => _procesando = true);
    await accion();
    if (mounted) setState(() => _procesando = false);
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.solicitud;
    final fecha = s.fechaRegistro.length >= 16
        ? s.fechaRegistro.substring(0, 16)
        : s.fechaRegistro;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _emCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _emNeon),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            s.nombreCompleto,
            style: GoogleFonts.spaceGrotesk(
              color: Colors.white,
              fontSize: 13.5,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            s.email,
            style: GoogleFonts.inter(color: _emMuted, fontSize: 11.5),
          ),
          Text(
            "Documento: ${s.numeroDocumento ?? "—"} · $fecha",
            style: GoogleFonts.inter(color: _emMuted, fontSize: 11.5),
          ),
          const SizedBox(height: 10),
          _Etiqueta("Aprobar como"),
          Wrap(
            spacing: 8,
            children: [RolId.mesero, RolId.cocinero].map((id) {
              final elegido = _rol == id;
              return ChoiceChip(
                label: Text(nombresRol[id]!),
                selected: elegido,
                showCheckmark: false,
                selectedColor: _emNeon,
                backgroundColor: _emInputBg,
                labelStyle: GoogleFonts.inter(
                  color: elegido ? Colors.black : Colors.white,
                  fontSize: 12.5,
                ),
                side: BorderSide(color: elegido ? _emNeon : _emNeonBorder),
                onSelected: _procesando
                    ? null
                    : (_) => setState(() => _rol = id),
              );
            }).toList(),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              TextButton(
                onPressed: _procesando
                    ? null
                    : () => _ejecutar(widget.onDescartar),
                child: const Text(
                  "Descartar",
                  style: TextStyle(color: Color(0xFFE74C3C)),
                ),
              ),
              const Spacer(),
              ElevatedButton(
                onPressed: _procesando
                    ? null
                    : () => _ejecutar(() => widget.onAprobar(_rol)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _emNeon,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(
                  _procesando ? "..." : "Aprobar",
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/auth_controller.dart';
import '../models/tipo_documento_model.dart';
import '../models/usuario_model.dart';

// Paleta neón — la misma de login_screen.dart y de Login.css en la web,
// para que el registro se vea como parte del login.
const Color _neonRed = Color(0xFFFF2C4F);
const Color _neonRedGlow = Color(0x8CFF2C4F);
const Color _neonOrange = Color(0xFFFF9736);
const Color _neonGreen = Color(0xFF19FFA0);
const Color _neonBlue = Color(0xFF2FC8FF);
const Color _ink = Color(0xFFF5F4F7);
const Color _inkDim = Color(0xFF9B98A5);
const Color _glass = Color(0x8C100F14);

// Mismas reglas que valida el backend (userController.js)
final RegExp _emailValido = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');
final RegExp _docValido = RegExp(r'^[A-Za-z0-9]{5,20}$');

// ================================================================
// SOLICITAR REGISTRO — empleado nuevo, sin sesión
// ================================================================
class SolicitarRegistroScreen extends StatefulWidget {
  const SolicitarRegistroScreen({super.key});

  @override
  State<SolicitarRegistroScreen> createState() =>
      _SolicitarRegistroScreenState();
}

class _SolicitarRegistroScreenState extends State<SolicitarRegistroScreen> {
  final _authController = AuthController();

  final _nombreCtrl = TextEditingController();
  final _apellidoCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _documentoCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmarCtrl = TextEditingController();

  List<TipoDocumento> _tiposDocumento = [];
  int? _tipoDocId;
  int? _rolId;
  bool _enviando = false;
  bool _verPassword = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _cargarTipos();
  }

  @override
  void dispose() {
    _nombreCtrl.dispose();
    _apellidoCtrl.dispose();
    _emailCtrl.dispose();
    _documentoCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmarCtrl.dispose();
    super.dispose();
  }

  Future<void> _cargarTipos() async {
    try {
      final tipos = await _authController.cargarTiposDocumento();
      if (!mounted) return;
      setState(() => _tiposDocumento = tipos);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    }
  }

  // Devuelve el primer error encontrado, o null si todo está bien
  String? _validar() {
    if (_nombreCtrl.text.trim().isEmpty ||
        _apellidoCtrl.text.trim().isEmpty ||
        _emailCtrl.text.trim().isEmpty ||
        _documentoCtrl.text.trim().isEmpty ||
        _passwordCtrl.text.isEmpty ||
        _tipoDocId == null ||
        _rolId == null) {
      return "Todos los campos son obligatorios.";
    }
    if (!_emailValido.hasMatch(_emailCtrl.text.trim())) {
      return "El correo no tiene un formato válido.";
    }
    if (!_docValido.hasMatch(_documentoCtrl.text.trim())) {
      return "El documento debe tener entre 5 y 20 letras o números, sin puntos ni espacios.";
    }
    if (_passwordCtrl.text.length < 6) {
      return "La contraseña debe tener al menos 6 caracteres.";
    }
    if (_passwordCtrl.text != _confirmarCtrl.text) {
      return "Las contraseñas no coinciden.";
    }
    return null;
  }

  Future<void> _enviar() async {
    final error = _validar();
    if (error != null) {
      setState(() => _error = error);
      return;
    }

    setState(() {
      _enviando = true;
      _error = null;
    });

    try {
      final mensaje = await _authController.solicitarRegistro(
        nombre: _nombreCtrl.text.trim(),
        apellido: _apellidoCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        tipoDocId: _tipoDocId!,
        numeroDocumento: _documentoCtrl.text.trim(),
        rolId: _rolId!,
        password: _passwordCtrl.text,
      );
      if (!mounted) return;

      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (contexto) => AlertDialog(
          backgroundColor: const Color(0xFF15131A),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
            side: BorderSide(color: _neonRed.withValues(alpha: 0.35)),
          ),
          icon: const Icon(
            Icons.hourglass_top_rounded,
            color: _neonRed,
            size: 34,
          ),
          title: Text(
            "Solicitud enviada",
            style: GoogleFonts.spaceGrotesk(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          content: Text(
            mensaje,
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              color: _inkDim,
              fontSize: 13.5,
              height: 1.4,
            ),
          ),
          actions: [
            Center(
              child: TextButton(
                onPressed: () => Navigator.pop(contexto),
                child: Text(
                  "Entendido",
                  style: GoogleFonts.inter(
                    color: _neonRed,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      );
      if (!mounted) return;
      Navigator.of(context).pop(); // vuelve al login
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _enviando = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF08070B),
      body: Stack(
        children: [
          // --- Orbes de neón de fondo (mismos colores del login) ---
          const _Orbe(
            color: _neonRed,
            size: 320,
            top: -110,
            left: -90,
            opacity: 0.5,
          ),
          const _Orbe(
            color: _neonGreen,
            size: 280,
            bottom: -120,
            right: -80,
            opacity: 0.4,
          ),
          const _Orbe(
            color: _neonOrange,
            size: 170,
            top: 70,
            right: 20,
            opacity: 0.25,
          ),
          const _Orbe(
            color: _neonBlue,
            size: 200,
            bottom: 120,
            left: 10,
            opacity: 0.25,
          ),

          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.arrow_back_rounded, color: _ink),
                      tooltip: "Volver al inicio de sesión",
                    ),
                  ),
                  const SizedBox(height: 4),

                  // --- Encabezado como el del login ---
                  Text(
                    "REGISTRO DE PERSONAL · RESTAURANTE",
                    textAlign: TextAlign.center,
                    style: GoogleFonts.spaceGrotesk(
                      color: _inkDim,
                      fontSize: 10.5,
                      letterSpacing: 3,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    "MANGATA",
                    textAlign: TextAlign.center,
                    style: GoogleFonts.unbounded(
                      color: Colors.white,
                      fontSize: 34,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 2,
                      shadows: [
                        const Shadow(color: _neonRedGlow, blurRadius: 8),
                        const Shadow(color: _neonRedGlow, blurRadius: 26),
                        Shadow(
                          color: _neonBlue.withValues(alpha: 0.45),
                          blurRadius: 10,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),

                  // --- Tarjeta de vidrio con el formulario ---
                  _TarjetaVidrio(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Center(
                          child: Container(
                            width: 46,
                            height: 46,
                            decoration: BoxDecoration(
                              color: _neonRed.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: _neonRed.withValues(alpha: 0.3),
                              ),
                            ),
                            child: const Icon(
                              Icons.person_add_alt_1_outlined,
                              color: _neonRed,
                              size: 22,
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          "Solicitar registro",
                          textAlign: TextAlign.center,
                          style: GoogleFonts.spaceGrotesk(
                            color: Colors.white,
                            fontSize: 23,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          "Para empleados nuevos. El administrador debe aprobar tu solicitud antes de que puedas ingresar.",
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            color: _inkDim,
                            fontSize: 12.5,
                            height: 1.45,
                          ),
                        ),
                        const SizedBox(height: 22),

                        Row(
                          children: [
                            Expanded(
                              child: _CampoNeon(
                                controller: _nombreCtrl,
                                hint: "Nombre",
                                icono: Icons.person_outline,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _CampoNeon(
                                controller: _apellidoCtrl,
                                hint: "Apellido",
                                icono: Icons.person_outline,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _CampoNeon(
                          controller: _emailCtrl,
                          hint: "Correo",
                          icono: Icons.mail_outline,
                          teclado: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 12),
                        _SelectorNeon<int>(
                          hint: "Tipo de documento",
                          icono: Icons.badge_outlined,
                          valor: _tipoDocId,
                          opciones: {
                            for (final t in _tiposDocumento)
                              t.id: t.descripcion,
                          },
                          onCambio: (v) => setState(() => _tipoDocId = v),
                        ),
                        const SizedBox(height: 12),
                        _CampoNeon(
                          controller: _documentoCtrl,
                          hint: "Número de documento",
                          icono: Icons.numbers_rounded,
                          teclado: TextInputType.number,
                        ),
                        const SizedBox(height: 12),
                        _SelectorNeon<int>(
                          hint: "¿En qué cargo vas a trabajar?",
                          icono: Icons.work_outline,
                          valor: _rolId,
                          opciones: const {
                            RolId.mesero: "Mesero",
                            RolId.cocinero: "Cocinero",
                          },
                          onCambio: (v) => setState(() => _rolId = v),
                        ),
                        const SizedBox(height: 12),
                        _CampoNeon(
                          controller: _passwordCtrl,
                          hint: "Contraseña (mínimo 6)",
                          icono: Icons.lock_outline,
                          oculto: !_verPassword,
                          sufijo: IconButton(
                            splashRadius: 18,
                            icon: Icon(
                              _verPassword
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined,
                              color: _inkDim,
                              size: 19,
                            ),
                            onPressed: () =>
                                setState(() => _verPassword = !_verPassword),
                          ),
                        ),
                        const SizedBox(height: 12),
                        _CampoNeon(
                          controller: _confirmarCtrl,
                          hint: "Confirmar contraseña",
                          icono: Icons.lock_outline,
                          oculto: !_verPassword,
                        ),

                        if (_error != null) ...[
                          const SizedBox(height: 14),
                          Text(
                            _error!,
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(
                              color: _neonRed,
                              fontSize: 12.5,
                            ),
                          ),
                        ],

                        const SizedBox(height: 20),
                        _BotonNeon(
                          texto: "Enviar solicitud",
                          cargando: _enviando,
                          onPressed: _enviando ? null : _enviar,
                        ),
                        const SizedBox(height: 6),
                        Center(
                          child: TextButton(
                            onPressed: _enviando
                                ? null
                                : () => Navigator.of(context).pop(),
                            child: Text(
                              "Ya tengo cuenta, volver al inicio de sesión",
                              style: GoogleFonts.inter(
                                color: _inkDim,
                                fontSize: 12.5,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 30),
                  Text(
                    "RESTAURANTE MANGATA",
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      color: Colors.white.withValues(alpha: 0.25),
                      fontSize: 11,
                      letterSpacing: 1.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// --- Tarjeta de vidrio esmerilado (igual que la del login) ---
class _TarjetaVidrio extends StatelessWidget {
  final Widget child;
  const _TarjetaVidrio({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.5),
            blurRadius: 60,
            offset: const Offset(0, 30),
          ),
          BoxShadow(
            color: _neonRedGlow.withValues(alpha: 0.3),
            blurRadius: 50,
            spreadRadius: -12,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(26),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
          child: Container(
            padding: const EdgeInsets.fromLTRB(20, 26, 20, 18),
            decoration: BoxDecoration(
              color: _glass,
              borderRadius: BorderRadius.circular(26),
              border: Border.all(color: _neonRed.withValues(alpha: 0.35)),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

// Decoración de píldora compartida por campos y selectores
BoxDecoration _decoracionPildora(bool enfocado) => BoxDecoration(
  color: enfocado
      ? _neonRed.withValues(alpha: 0.06)
      : Colors.white.withValues(alpha: 0.04),
  borderRadius: BorderRadius.circular(50),
  border: Border.all(
    color: enfocado ? _neonRed : Colors.white.withValues(alpha: 0.12),
  ),
  boxShadow: enfocado
      ? [BoxShadow(color: _neonRed.withValues(alpha: 0.18), blurRadius: 14)]
      : [],
);

// --- Campo de texto píldora con brillo al enfocar ---
class _CampoNeon extends StatefulWidget {
  final TextEditingController controller;
  final String hint;
  final IconData icono;
  final TextInputType? teclado;
  final bool oculto;
  final Widget? sufijo;

  const _CampoNeon({
    required this.controller,
    required this.hint,
    required this.icono,
    this.teclado,
    this.oculto = false,
    this.sufijo,
  });

  @override
  State<_CampoNeon> createState() => _CampoNeonState();
}

class _CampoNeonState extends State<_CampoNeon> {
  final _foco = FocusNode();

  @override
  void initState() {
    super.initState();
    _foco.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _foco.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      decoration: _decoracionPildora(_foco.hasFocus),
      child: TextField(
        controller: widget.controller,
        focusNode: _foco,
        obscureText: widget.oculto,
        keyboardType: widget.teclado,
        style: GoogleFonts.inter(color: _ink, fontSize: 14),
        cursorColor: _neonRed,
        decoration: InputDecoration(
          hintText: widget.hint,
          hintStyle: GoogleFonts.inter(
            color: Colors.white.withValues(alpha: 0.38),
            fontSize: 14,
          ),
          prefixIcon: Icon(widget.icono, color: _inkDim, size: 19),
          suffixIcon: widget.sufijo,
          border: InputBorder.none,
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(vertical: 15),
        ),
      ),
    );
  }
}

// --- Lista desplegable con el mismo estilo de píldora ---
class _SelectorNeon<T> extends StatelessWidget {
  final String hint;
  final IconData icono;
  final T? valor;
  final Map<T, String> opciones;
  final ValueChanged<T?> onCambio;

  const _SelectorNeon({
    required this.hint,
    required this.icono,
    required this.valor,
    required this.opciones,
    required this.onCambio,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.only(left: 14, right: 10),
      decoration: _decoracionPildora(false),
      child: Row(
        children: [
          Icon(icono, color: _inkDim, size: 19),
          const SizedBox(width: 12),
          Expanded(
            child: DropdownButtonHideUnderline(
              child: DropdownButton<T>(
                value: valor,
                isExpanded: true,
                dropdownColor: const Color(0xFF1A1820),
                borderRadius: BorderRadius.circular(14),
                icon: const Icon(
                  Icons.keyboard_arrow_down_rounded,
                  color: _neonRed,
                ),
                hint: Text(
                  hint,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    color: Colors.white.withValues(alpha: 0.38),
                    fontSize: 14,
                  ),
                ),
                style: GoogleFonts.inter(color: _ink, fontSize: 14),
                items: opciones.entries
                    .map(
                      (e) => DropdownMenuItem<T>(
                        value: e.key,
                        child: Text(e.value),
                      ),
                    )
                    .toList(),
                onChanged: onCambio,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// --- Botón con degradado rojo → naranja (igual que "Ingresar") ---
class _BotonNeon extends StatelessWidget {
  final String texto;
  final bool cargando;
  final VoidCallback? onPressed;

  const _BotonNeon({
    required this.texto,
    required this.cargando,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(50),
        onTap: onPressed,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(50),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [_neonRed, _neonOrange],
            ),
            boxShadow: [
              BoxShadow(
                color: _neonRed.withValues(alpha: 0.5),
                blurRadius: 24,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 15),
            alignment: Alignment.center,
            child: cargando
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Color(0xFF0A0A0C),
                    ),
                  )
                : Text(
                    texto,
                    style: GoogleFonts.spaceGrotesk(
                      color: const Color(0xFF0A0A0C),
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                      letterSpacing: 0.4,
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}

// --- Orbe de neón difuminado de fondo ---
class _Orbe extends StatelessWidget {
  final Color color;
  final double size;
  final double? top;
  final double? left;
  final double? right;
  final double? bottom;
  final double opacity;

  const _Orbe({
    required this.color,
    required this.size,
    this.top,
    this.left,
    this.right,
    this.bottom,
    required this.opacity,
  });

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: top,
      left: left,
      right: right,
      bottom: bottom,
      child: IgnorePointer(
        child: ImageFiltered(
          imageFilter: ImageFilter.blur(sigmaX: 60, sigmaY: 60),
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  color.withValues(alpha: opacity),
                  color.withValues(alpha: 0.0),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

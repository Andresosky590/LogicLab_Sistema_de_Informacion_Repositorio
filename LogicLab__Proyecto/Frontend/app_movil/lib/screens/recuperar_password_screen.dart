import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/auth_controller.dart';

// Misma paleta neón que login_screen.dart (y Login.css en la web).
const Color _neonRed = Color(0xFFFF2C4F);
const Color _neonOrange = Color(0xFFFF9736);
const Color _neonGreen = Color(0xFF19FFA0);
const Color _ink = Color(0xFFF5F4F7);
const Color _inkDim = Color(0xFF9B98A5);

// Tiempo mínimo antes de poder pedir otro código (el backend también lo exige).
const int _segundosReenvio = 60;

class RecuperarPasswordScreen extends StatefulWidget {
  // Correo que la persona ya había escrito en el login (opcional).
  final String emailInicial;

  const RecuperarPasswordScreen({super.key, this.emailInicial = ''});

  @override
  State<RecuperarPasswordScreen> createState() =>
      _RecuperarPasswordScreenState();
}

class _RecuperarPasswordScreenState extends State<RecuperarPasswordScreen> {
  final _authController = AuthController();
  late final _emailController = TextEditingController(
    text: widget.emailInicial,
  );
  final _codigoController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmarController = TextEditingController();

  int _paso = 1; // 1 = pedir el código · 2 = código + contraseña nueva
  bool _cargando = false;
  bool _passwordVisible = false;
  String? _error;
  String? _info;
  int _espera = 0;
  Timer? _timer;

  @override
  void dispose() {
    _timer?.cancel();
    _emailController.dispose();
    _codigoController.dispose();
    _passwordController.dispose();
    _confirmarController.dispose();
    super.dispose();
  }

  // Cuenta regresiva para habilitar "Reenviar código".
  void _iniciarEspera() {
    _timer?.cancel();
    setState(() => _espera = _segundosReenvio);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted || _espera <= 1) t.cancel();
      if (mounted) setState(() => _espera = _espera > 0 ? _espera - 1 : 0);
    });
  }

  Future<void> _solicitarCodigo() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      setState(() => _error = "Ingresa tu correo");
      return;
    }

    setState(() {
      _cargando = true;
      _error = null;
    });

    try {
      final mensaje = await _authController.solicitarCodigo(email);
      if (!mounted) return;
      setState(() {
        _paso = 2;
        _info = mensaje;
      });
      _iniciarEspera();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _cargando = false);
    }
  }

  String? _validarPaso2() {
    if (_codigoController.text.trim().length != 6) {
      return "El código tiene 6 dígitos";
    }
    if (_passwordController.text.length < 6) {
      return "La contraseña debe tener al menos 6 caracteres";
    }
    if (_passwordController.text != _confirmarController.text) {
      return "Las contraseñas no coinciden";
    }
    return null;
  }

  Future<void> _restablecer() async {
    final errorLocal = _validarPaso2();
    if (errorLocal != null) {
      setState(() => _error = errorLocal);
      return;
    }

    setState(() {
      _cargando = true;
      _error = null;
    });

    try {
      final mensaje = await _authController.restablecerPassword(
        _emailController.text.trim(),
        _codigoController.text.trim(),
        _passwordController.text,
      );
      if (!mounted) return;

      // El SnackBar sobrevive al cambio de pantalla: se ve ya en el login.
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("$mensaje. Ya puedes iniciar sesión.")),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _cargando = false;
      });
    }
  }

  void _cambiarCorreo() {
    _timer?.cancel();
    _codigoController.clear();
    _passwordController.clear();
    _confirmarController.clear();
    setState(() {
      _paso = 1;
      _error = null;
      _info = null;
      _espera = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF08070B),
      body: Stack(
        children: [
          _brillo(_neonRed, Alignment.topLeft),
          _brillo(_neonGreen, Alignment.bottomRight),
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 32,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Container(
                    padding: const EdgeInsets.fromLTRB(28, 32, 28, 20),
                    decoration: BoxDecoration(
                      color: const Color(0xCC100F14),
                      borderRadius: BorderRadius.circular(28),
                      border: Border.all(
                        color: _neonRed.withValues(alpha: 0.35),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: _neonRed.withValues(alpha: 0.15),
                          blurRadius: 50,
                          spreadRadius: -12,
                        ),
                      ],
                    ),
                    child: _paso == 1 ? _buildPaso1() : _buildPaso2(),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Paso 1: correo ──────────────────────────────────────────────────────
  Widget _buildPaso1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _encabezado(
          Icons.mark_email_read_outlined,
          "Recuperar contraseña",
          "Te enviaremos un código de 6 dígitos a tu correo",
        ),
        _campo(
          controller: _emailController,
          hint: "Correo",
          icon: Icons.mail_outline,
          keyboardType: TextInputType.emailAddress,
        ),
        _mensajes(),
        _BotonNeon(
          label: "Enviar código",
          loading: _cargando,
          onPressed: _cargando ? null : _solicitarCodigo,
        ),
        _volverAlLogin(),
      ],
    );
  }

  // ── Paso 2: código + contraseña nueva ───────────────────────────────────
  Widget _buildPaso2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _encabezado(
          Icons.lock_reset,
          "Verifica tu identidad",
          "Escribe el código enviado a ${_emailController.text.trim()} y elige tu nueva contraseña",
        ),
        _campo(
          controller: _codigoController,
          hint: "Código de 6 dígitos",
          icon: Icons.pin_outlined,
          keyboardType: TextInputType.number,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        ),
        _campo(
          controller: _passwordController,
          hint: "Nueva contraseña",
          icon: Icons.lock_outline,
          obscureText: !_passwordVisible,
          suffix: IconButton(
            splashRadius: 18,
            icon: Icon(
              _passwordVisible
                  ? Icons.visibility_off_outlined
                  : Icons.visibility_outlined,
              color: _inkDim,
              size: 19,
            ),
            onPressed: () =>
                setState(() => _passwordVisible = !_passwordVisible),
          ),
        ),
        _campo(
          controller: _confirmarController,
          hint: "Confirmar contraseña",
          icon: Icons.lock_outline,
          obscureText: !_passwordVisible,
        ),
        _mensajes(),
        _BotonNeon(
          label: "Cambiar contraseña",
          loading: _cargando,
          onPressed: _cargando ? null : _restablecer,
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _enlace(
              _espera > 0 ? "Reenviar código (${_espera}s)" : "Reenviar código",
              (_espera > 0 || _cargando) ? null : _solicitarCodigo,
            ),
            _enlace("Cambiar correo", _cambiarCorreo),
          ],
        ),
        _volverAlLogin(),
      ],
    );
  }

  // ── Piezas reutilizables ────────────────────────────────────────────────
  Widget _brillo(Color color, Alignment centro) {
    return Positioned.fill(
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: centro,
            radius: 0.9,
            colors: [color.withValues(alpha: 0.28), color.withValues(alpha: 0)],
          ),
        ),
      ),
    );
  }

  Widget _encabezado(IconData icono, String titulo, String subtitulo) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: _neonRed.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: _neonRed.withValues(alpha: 0.3)),
            ),
            child: Icon(icono, color: _neonRed, size: 22),
          ),
        ),
        const SizedBox(height: 18),
        Text(
          titulo,
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.3,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          subtitulo,
          style: GoogleFonts.inter(color: _inkDim, fontSize: 13.5, height: 1.4),
        ),
        const SizedBox(height: 26),
      ],
    );
  }

  Widget _campo({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool obscureText = false,
    TextInputType? keyboardType,
    int? maxLength,
    List<TextInputFormatter>? inputFormatters,
    Widget? suffix,
  }) {
    final borde = OutlineInputBorder(
      borderRadius: BorderRadius.circular(50),
      borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.12)),
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextField(
        controller: controller,
        obscureText: obscureText,
        keyboardType: keyboardType,
        maxLength: maxLength,
        inputFormatters: inputFormatters,
        style: GoogleFonts.inter(color: _ink, fontSize: 14.5),
        cursorColor: _neonRed,
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.inter(
            color: Colors.white.withValues(alpha: 0.35),
            fontSize: 14.5,
          ),
          counterText: '',
          prefixIcon: Icon(icon, color: _inkDim, size: 19),
          suffixIcon: suffix,
          filled: true,
          fillColor: Colors.white.withValues(alpha: 0.04),
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(vertical: 15),
          enabledBorder: borde,
          border: borde,
          focusedBorder: borde.copyWith(
            borderSide: const BorderSide(color: _neonRed),
          ),
        ),
      ),
    );
  }

  // Error (rojo) o aviso del backend (verde), lo que haya.
  Widget _mensajes() {
    final texto = _error ?? _info;
    return Padding(
      padding: EdgeInsets.only(top: texto == null ? 0 : 2, bottom: texto == null ? 4 : 14),
      child: texto == null
          ? null
          : Text(
              texto,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                color: _error != null ? _neonRed : _neonGreen,
                fontSize: 13,
              ),
            ),
    );
  }

  Widget _enlace(String texto, VoidCallback? onPressed) {
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        foregroundColor: _inkDim,
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
      child: Text(texto, style: GoogleFonts.inter(fontSize: 12.5)),
    );
  }

  Widget _volverAlLogin() {
    return _enlace(
      "Volver al inicio de sesión",
      _cargando ? null : () => Navigator.of(context).pop(),
    );
  }
}

// Botón con degradado rojo → naranja (mismo look que el de login_screen.dart).
class _BotonNeon extends StatelessWidget {
  final String label;
  final bool loading;
  final VoidCallback? onPressed;

  const _BotonNeon({
    required this.label,
    required this.loading,
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
            child: loading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Color(0xFF0A0A0C),
                    ),
                  )
                : Text(
                    label,
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

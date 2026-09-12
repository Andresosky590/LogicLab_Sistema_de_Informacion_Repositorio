import 'dart:math' as math;
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/auth_controller.dart';
import '../models/usuario_model.dart';
import 'mesero_inicio_screen.dart';
import 'cocinero_inicio_screen.dart';
import 'admin_inicio_screen.dart';

// Paleta neón — misma que Hojas_de_Estilo/Login.css en la web, para que
// el login se vea igual en PC y en celular.
const Color _neonRed = Color(0xFFFF2C4F);
const Color _neonRedGlow = Color(0x8CFF2C4F);
const Color _neonOrange = Color(0xFFFF9736);
const Color _neonGreen = Color(0xFF19FFA0);
const Color _neonBlue = Color(0xFF2FC8FF);
const Color _ink = Color(0xFFF5F4F7);
const Color _inkDim = Color(0xFF9B98A5);
const Color _glass = Color(0x8C100F14);

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _authController = AuthController();

  bool _cargando = false;
  String? _errorMensaje;
  bool _passwordVisible = false;

  late final AnimationController _orbController;

  @override
  void initState() {
    super.initState();
    // Deriva de forma continua, igual que "loginOrbDrift" en el CSS (16s, ease-in-out, infinito).
    _orbController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 16),
    )..repeat();
  }

  @override
  void dispose() {
    _orbController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _iniciarSesion() async {
    setState(() {
      _cargando = true;
      _errorMensaje = null;
    });

    try {
      final Usuario usuario = await _authController.login(
        _emailController.text.trim(),
        _passwordController.text,
      );

      if (!mounted) return;

      // Redirige según el rol — mismo criterio que ya usa la web.
      Widget pantallaDestino;
      switch (usuario.rolId) {
        case RolId.mesero:
          pantallaDestino = const MeseroHomeScreen();
          break;
        case RolId.cocinero:
          pantallaDestino = const CocineroHomeScreen();
          break;
        case RolId.administrador:
          pantallaDestino = const AdminHomeScreen();
          break;
        default:
          setState(() {
            _errorMensaje = "Rol de usuario no reconocido";
            _cargando = false;
          });
          return;
      }

      Navigator.of(context)
          .pushReplacement(MaterialPageRoute(builder: (_) => pantallaDestino));
    } catch (e) {
      setState(() {
        _errorMensaje = e.toString().replaceFirst("AuthException: ", "");
        _cargando = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF08070B),
      body: Stack(
        children: [
          // --- Orbes de neón ambiental (equivalente a .login-orb en CSS) ---
          AnimatedBuilder(
            animation: _orbController,
            builder: (context, _) {
              final t = _orbController.value * 2 * math.pi;
              return Stack(
                children: [
                  _NeonOrb(
                    color: _neonRed,
                    size: 340,
                    top: -110 + 18 * _sinShift(t, 0),
                    left: -90 + 18 * _cosShift(t, 0),
                    opacity: 0.55,
                  ),
                  _NeonOrb(
                    color: _neonGreen,
                    size: 300,
                    bottom: -120 + 18 * _sinShift(t, 4),
                    right: -80 + 18 * _cosShift(t, 4),
                    opacity: 0.45,
                  ),
                  _NeonOrb(
                    color: _neonOrange,
                    size: 180,
                    top: 60 + 12 * _sinShift(t, 8),
                    right: 30 + 12 * _cosShift(t, 8),
                    opacity: 0.30,
                  ),
                  _NeonOrb(
                    color: _neonBlue,
                    size: 210,
                    bottom: 80 + 12 * _sinShift(t, 12),
                    left: 24 + 12 * _cosShift(t, 12),
                    opacity: 0.30,
                  ),
                ],
              );
            },
          ),

          // --- Contenido ---
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 24),
                  _LoginHero(),
                  const SizedBox(height: 40),
                  _LoginCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          decoration: BoxDecoration(
                            color: _neonRed.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: _neonRed.withOpacity(0.3),
                            ),
                          ),
                          child: const Icon(
                            Icons.storefront_outlined,
                            color: _neonRed,
                            size: 22,
                          ),
                        ),
                        const SizedBox(height: 18),
                        Text(
                          "Inicio de Sesión",
                          style: GoogleFonts.spaceGrotesk(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.3,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          "Acceso para meseros, cocina y administración",
                          style: GoogleFonts.inter(
                            color: _inkDim,
                            fontSize: 13.5,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 26),

                        _NeonTextField(
                          controller: _emailController,
                          hint: "Correo",
                          icon: Icons.mail_outline,
                          keyboardType: TextInputType.emailAddress,
                        ),
                        const SizedBox(height: 14),
                        _NeonTextField(
                          controller: _passwordController,
                          hint: "Contraseña",
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
                            onPressed: () => setState(
                              () => _passwordVisible = !_passwordVisible,
                            ),
                          ),
                        ),

                        if (_errorMensaje != null) ...[
                          const SizedBox(height: 16),
                          Text(
                            _errorMensaje!,
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(
                              color: _neonRed,
                              fontSize: 13,
                            ),
                          ),
                        ],

                        const SizedBox(height: 22),
                        _NeonButton(
                          label: "Ingresar",
                          loading: _cargando,
                          onPressed: _cargando ? null : _iniciarSesion,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 46),
                  Text(
                    "RESTAURANTE MANGATA",
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      color: Colors.white.withOpacity(0.25),
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

  double _sinShift(double t, double delaySeconds) {
    final shifted = t - (delaySeconds / 16) * 2 * math.pi;
    return math.sin(shifted);
  }

  double _cosShift(double t, double delaySeconds) {
    final shifted = t - (delaySeconds / 16) * 2 * math.pi;
    return math.cos(shifted);
  }
}

// --- Encabezado "MANGATA" con brillo de neón, como .login-wordmark ---
class _LoginHero extends StatefulWidget {
  @override
  State<_LoginHero> createState() => _LoginHeroState();
}

class _LoginHeroState extends State<_LoginHero>
    with SingleTickerProviderStateMixin {
  late final AnimationController _flicker;
  late final Animation<double> _opacity;

  @override
  void initState() {
    super.initState();
    _flicker = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..forward();
    _opacity = CurvedAnimation(parent: _flicker, curve: Curves.easeIn);
  }

  @override
  void dispose() {
    _flicker.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          "MENÚ DIGITAL · RESTAURANTE",
          style: GoogleFonts.spaceGrotesk(
            color: _inkDim,
            fontSize: 11,
            letterSpacing: 4,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 14),
        FadeTransition(
          opacity: _opacity,
          child: Text(
            "MANGATA",
            textAlign: TextAlign.center,
            style: GoogleFonts.unbounded(
              color: Colors.white,
              fontSize: 40,
              fontWeight: FontWeight.w800,
              letterSpacing: 2,
              shadows: [
                Shadow(color: _neonRedGlow, blurRadius: 8),
                Shadow(color: _neonRedGlow, blurRadius: 26),
                Shadow(color: _neonBlue.withOpacity(0.45), blurRadius: 10),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

// --- Tarjeta de vidrio esmerilado (equivalente a .login-form-staff) ---
class _LoginCard extends StatelessWidget {
  final Widget child;
  const _LoginCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.5),
            blurRadius: 60,
            offset: const Offset(0, 30),
          ),
          BoxShadow(
            color: _neonRedGlow.withOpacity(0.35),
            blurRadius: 50,
            spreadRadius: -12,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(28),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 22, sigmaY: 22),
          child: Container(
            padding: const EdgeInsets.fromLTRB(28, 32, 28, 32),
            decoration: BoxDecoration(
              color: _glass,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: _neonRed.withOpacity(0.35)),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}

// --- Campo de texto estilo píldora con glow al enfocar (.login-input-staff) ---
class _NeonTextField extends StatefulWidget {
  final TextEditingController controller;
  final String hint;
  final IconData icon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final Widget? suffix;

  const _NeonTextField({
    required this.controller,
    required this.hint,
    required this.icon,
    this.obscureText = false,
    this.keyboardType,
    this.suffix,
  });

  @override
  State<_NeonTextField> createState() => _NeonTextFieldState();
}

class _NeonTextFieldState extends State<_NeonTextField> {
  final _focusNode = FocusNode();
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(() {
      setState(() => _focused = _focusNode.hasFocus);
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      decoration: BoxDecoration(
        color: _focused
            ? _neonRed.withOpacity(0.06)
            : Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(50),
        border: Border.all(
          color: _focused ? _neonRed : Colors.white.withOpacity(0.12),
        ),
        boxShadow: _focused
            ? [BoxShadow(color: _neonRed.withOpacity(0.18), blurRadius: 14)]
            : [],
      ),
      child: TextField(
        controller: widget.controller,
        focusNode: _focusNode,
        obscureText: widget.obscureText,
        keyboardType: widget.keyboardType,
        style: GoogleFonts.inter(color: _ink, fontSize: 14.5),
        cursorColor: _neonRed,
        decoration: InputDecoration(
          hintText: widget.hint,
          hintStyle: GoogleFonts.inter(
            color: Colors.white.withOpacity(0.35),
            fontSize: 14.5,
          ),
          prefixIcon: Icon(widget.icon, color: _inkDim, size: 19),
          suffixIcon: widget.suffix,
          border: InputBorder.none,
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(vertical: 15),
        ),
      ),
    );
  }
}

// --- Botón con degradado rojo → naranja (.login-button-staff) ---
class _NeonButton extends StatelessWidget {
  final String label;
  final bool loading;
  final VoidCallback? onPressed;

  const _NeonButton({
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
                color: _neonRed.withOpacity(0.5),
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

// --- Orbe de neón difuminado (.login-orb) ---
class _NeonOrb extends StatelessWidget {
  final Color color;
  final double size;
  final double? top;
  final double? left;
  final double? right;
  final double? bottom;
  final double opacity;

  const _NeonOrb({
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
                colors: [color.withOpacity(opacity), color.withOpacity(0.0)],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

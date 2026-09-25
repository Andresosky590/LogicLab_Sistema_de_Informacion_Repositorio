import 'package:flutter/material.dart';

import 'controllers/cliente_controller.dart';
import 'models/mesa_model.dart';
import 'screens/cliente_vista_general_screen.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(const MangataApp());
}

class MangataApp extends StatelessWidget {
  const MangataApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mangata',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const _PantallaInicial(),
    );
  }
}

// BUGFIX: en Flutter Web, refrescar la página reinicia toda la app
// desde main() — antes eso mandaba SIEMPRE a LoginScreen, así que un
// cliente en plena sesión de mesa (sin usuario/contraseña con qué
// volver a entrar) quedaba fuera sin más remedio que escanear el QR
// de nuevo. Ahora, antes de decidir la pantalla inicial, se revisa si
// hay una sesión de mesa guardada (ver ClienteController) y, si la
// hay, se entra directo ahí — la única forma de cerrarla es el botón
// SALIR de esa pantalla.
class _PantallaInicial extends StatefulWidget {
  const _PantallaInicial();

  @override
  State<_PantallaInicial> createState() => _PantallaInicialState();
}

class _PantallaInicialState extends State<_PantallaInicial> {
  final _clienteController = ClienteController();
  Mesa? _mesaGuardada;
  bool _cargando = true;

  @override
  void initState() {
    super.initState();
    _revisar();
  }

  Future<void> _revisar() async {
    final mesa = await _clienteController.obtenerSesionMesaGuardada();
    if (!mounted) return;
    setState(() {
      _mesaGuardada = mesa;
      _cargando = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_cargando) {
      return const Scaffold(
        backgroundColor: Color(0xFF0A0A0A),
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFFFF2C4F)),
        ),
      );
    }

    if (_mesaGuardada != null) {
      return ClienteVistaGeneralScreen(mesa: _mesaGuardada!);
    }

    return const LoginScreen();
  }
}

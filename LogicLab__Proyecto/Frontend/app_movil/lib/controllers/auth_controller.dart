import 'package:shared_preferences/shared_preferences.dart';

import '../models/usuario_model.dart';
import '../repositories/auth_repository.dart';

// Esta clase es el "puente" entre la pantalla (screens/login_screen.dart)
// y el repositorio que habla con la API. También se encarga de guardar
// el token en el celular para que la sesión sobreviva a un cierre de app.
class AuthController {
  final AuthRepository _repository = AuthRepository();

  // Intenta iniciar sesión y, si funciona, guarda el token y los datos
  // del usuario en el almacenamiento local del celular.
  Future<Usuario> login(String email, String password) async {
    final (usuario, token) = await _repository.login(email, password);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    await prefs.setInt('usuarioId', usuario.id);
    await prefs.setString('usuarioNombre', usuario.nombre);
    await prefs.setString('usuarioApellido', usuario.apellido);
    await prefs.setInt('rolId', usuario.rolId);

    return usuario;
  }

  // Para cuando la app abre: revisa si ya había una sesión guardada.
  Future<String?> obtenerTokenGuardado() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('token');
  }

  // Recuperación de contraseña (no requiere sesión iniciada).
  Future<String> solicitarCodigo(String email) =>
      _repository.solicitarCodigo(email);

  Future<String> restablecerPassword(
    String email,
    String codigo,
    String nuevaPassword,
  ) => _repository.restablecerPassword(email, codigo, nuevaPassword);

  Future<void> cerrarSesion() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
  }
}
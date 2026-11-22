import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/empleado_model.dart';
import 'auth_repository.dart' show baseUrl;

class EmpleadoException implements Exception {
  final String message;
  EmpleadoException(this.message);

  @override
  String toString() => message;
}

class EmpleadoRepository {
  Future<Map<String, String>> _headersConToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? "";
    return {
      "Authorization": "Bearer $token",
      "Content-Type": "application/json",
    };
  }

  // Hace la petición con token y convierte los errores de red en
  // EmpleadoException, para no repetir el try/catch en cada método.
  Future<http.Response> _enviar(
    String metodo,
    String ruta, {
    Map<String, dynamic>? body,
  }) async {
    final headers = await _headersConToken();
    final url = Uri.parse("$baseUrl$ruta");
    try {
      switch (metodo) {
        case "POST":
          return await http.post(url, headers: headers, body: jsonEncode(body));
        case "PUT":
          return await http.put(url, headers: headers, body: jsonEncode(body));
        case "DELETE":
          return await http.delete(url, headers: headers);
        default:
          return await http.get(url, headers: headers);
      }
    } catch (e) {
      throw EmpleadoException("No se pudo conectar con el servidor.");
    }
  }

  // Lanza el "message" del backend si la respuesta no fue exitosa.
  void _verificar(http.Response response, String mensajePorDefecto) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;
    final data = _tryDecode(response.body);
    throw EmpleadoException(data?['message'] ?? mensajePorDefecto);
  }

  List<Empleado> _lista(http.Response response) {
    // Cuando no hay empleados el backend responde con un objeto
    // { message: "No hay registros" } en vez de una lista.
    final decoded = jsonDecode(response.body);
    if (decoded is! List) return [];
    return decoded.map((e) => Empleado.fromJson(e)).toList();
  }

  // GET /api/usuarios/listar — solo empleados activos.
  Future<List<Empleado>> obtenerEmpleados() async {
    final response = await _enviar("GET", "/api/usuarios/listar");
    _verificar(response, "No se pudieron cargar los empleados.");
    return _lista(response);
  }

  // POST /api/usuarios/registro — solo admin (requiere token).
  // Crea el empleado ya activo. tipoDocId va fijo en 1, como en Empleados.jsx.
  Future<void> crearEmpleado({
    required String nombre,
    required String apellido,
    required String email,
    required String password,
    required int rolId,
  }) async {
    final response = await _enviar(
      "POST",
      "/api/usuarios/registro",
      body: {
        "nombre": nombre,
        "apellido": apellido,
        "email": email,
        "password": password,
        "tipoDocId": 1,
        "rolId": rolId,
      },
    );
    _verificar(response, "Error al crear el usuario.");
  }

  // PUT /api/usuarios/actualizar/:id — password es opcional: si viene
  // vacío/null no se cambia la contraseña actual.
  Future<void> actualizarEmpleado({
    required int id,
    required String nombre,
    required String apellido,
    required String email,
    required int rolId,
    String? password,
  }) async {
    final response = await _enviar(
      "PUT",
      "/api/usuarios/actualizar/$id",
      body: {
        "nombre": nombre,
        "apellido": apellido,
        "email": email,
        "rolId": rolId,
        if (password != null && password.isNotEmpty) "password": password,
      },
    );
    _verificar(response, "Error al guardar los cambios.");
  }

  // DELETE /api/usuarios/eliminar/:id — no borra: deja al usuario
  // inactivo; no puede iniciar sesión pero conserva su historial.
  Future<void> eliminarEmpleado(int id) async {
    final response = await _enviar("DELETE", "/api/usuarios/eliminar/$id");
    _verificar(response, "Error al desactivar el usuario.");
  }

  // ── Solicitudes de registro ───────────────────────────────────────────

  // GET /api/usuarios/solicitudes — empleados nuevos esperando aprobación.
  Future<List<Empleado>> obtenerSolicitudes() async {
    final response = await _enviar("GET", "/api/usuarios/solicitudes");
    _verificar(response, "No se pudieron cargar las solicitudes.");
    return _lista(response);
  }

  // PUT /api/usuarios/solicitudes/:id/aprobar — pasa a activo con ese rol.
  Future<void> aprobarSolicitud(int id, int rolId) async {
    final response = await _enviar(
      "PUT",
      "/api/usuarios/solicitudes/$id/aprobar",
      body: {"rolId": rolId},
    );
    _verificar(response, "Error al aprobar la solicitud.");
  }

  // DELETE /api/usuarios/solicitudes/:id — la solicitud se elimina.
  Future<void> descartarSolicitud(int id) async {
    final response = await _enviar("DELETE", "/api/usuarios/solicitudes/$id");
    _verificar(response, "Error al descartar la solicitud.");
  }

  Map<String, dynamic>? _tryDecode(String body) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return null;
    }
  }
}

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

  // GET /api/usuarios/listar — requiere token. Solo trae empleados
  // activos (igual que en la web).
  Future<List<Empleado>> obtenerEmpleados() async {
    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.get(
        Uri.parse("$baseUrl/api/usuarios/listar"),
        headers: headers,
      );
    } catch (e) {
      throw EmpleadoException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw EmpleadoException("No se pudieron cargar los empleados.");
    }
    // Cuando no hay empleados el backend responde con un objeto
    // { message: "No hay registros" } en vez de una lista.
    final decoded = jsonDecode(response.body);
    if (decoded is! List) return [];
    return decoded.map((e) => Empleado.fromJson(e)).toList();
  }

  // POST /api/usuarios/registro — pública (no requiere token, igual
  // que en la web). tipoDocId va fijo en 1, como en Empleados.jsx.
  Future<void> crearEmpleado({
    required String nombre,
    required String apellido,
    required String email,
    required String password,
    required int rolId,
  }) async {
    late http.Response response;
    try {
      response = await http.post(
        Uri.parse("$baseUrl/api/usuarios/registro"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "nombre": nombre,
          "apellido": apellido,
          "email": email,
          "password": password,
          "tipoDocId": 1,
          "rolId": rolId,
        }),
      );
    } catch (e) {
      throw EmpleadoException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 201) {
      final data = _tryDecode(response.body);
      throw EmpleadoException(data?['message'] ?? "Error al crear el usuario.");
    }
  }

  // PUT /api/usuarios/actualizar/:id — requiere token. password es
  // opcional: si viene vacío/null no se cambia la contraseña actual.
  Future<void> actualizarEmpleado({
    required int id,
    required String nombre,
    required String apellido,
    required String email,
    required int rolId,
    String? password,
  }) async {
    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.put(
        Uri.parse("$baseUrl/api/usuarios/actualizar/$id"),
        headers: headers,
        body: jsonEncode({
          "nombre": nombre,
          "apellido": apellido,
          "email": email,
          "rolId": rolId,
          if (password != null && password.isNotEmpty) "password": password,
        }),
      );
    } catch (e) {
      throw EmpleadoException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      final data = _tryDecode(response.body);
      throw EmpleadoException(
        data?['message'] ?? "Error al guardar los cambios.",
      );
    }
  }

  // DELETE /api/usuarios/eliminar/:id — requiere token. El backend ya
  // no borra al usuario: lo desactiva (Activo = 0) y no puede volver
  // a iniciar sesión, pero conserva su historial de pedidos.
  Future<void> eliminarEmpleado(int id) async {
    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.delete(
        Uri.parse("$baseUrl/api/usuarios/eliminar/$id"),
        headers: headers,
      );
    } catch (e) {
      throw EmpleadoException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw EmpleadoException("Error al desactivar el usuario.");
    }
  }

  Map<String, dynamic>? _tryDecode(String body) {
    try {
      return jsonDecode(body);
    } catch (_) {
      return null;
    }
  }
}

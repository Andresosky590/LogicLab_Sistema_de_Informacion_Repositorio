import 'dart:convert';

import 'package:http/http.dart' as http;

import 'auth_repository.dart' show baseUrl;

class PqrsfException implements Exception {
  final String message;
  PqrsfException(this.message);

  @override
  String toString() => message;
}

class TipoPqrsf {
  final int id;
  final String nombre;
  TipoPqrsf({required this.id, required this.nombre});

  factory TipoPqrsf.fromJson(Map<String, dynamic> json) {
    return TipoPqrsf(id: json['id_TipoPQRSF'], nombre: json['TipoPQRSF'] ?? "");
  }
}

// Ambos endpoints son públicos — el cliente no inicia sesión.
class PqrsfRepository {
  // GET /api/pqrsf/tipos
  Future<List<TipoPqrsf>> obtenerTipos() async {
    late http.Response response;
    try {
      response = await http.get(Uri.parse("$baseUrl/api/pqrsf/tipos"));
    } catch (e) {
      throw PqrsfException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw PqrsfException("No se pudieron cargar los tipos de PQRSF.");
    }
    final List<dynamic> data = jsonDecode(response.body);
    return data.map((e) => TipoPqrsf.fromJson(e)).toList();
  }

  // POST /api/pqrsf/crear
  Future<void> enviar({
    required int idTipoPqrsf,
    required String mensaje,
    String? nombre,
  }) async {
    late http.Response response;
    try {
      response = await http.post(
        Uri.parse("$baseUrl/api/pqrsf/crear"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "id_TipoPQRSF": idTipoPqrsf,
          "nombre": (nombre == null || nombre.trim().isEmpty)
              ? null
              : nombre.trim(),
          "mensaje": mensaje.trim(),
        }),
      );
    } catch (e) {
      throw PqrsfException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 201) {
      final data = _tryDecode(response.body);
      throw PqrsfException(data?['message'] ?? "No se pudo enviar el mensaje.");
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

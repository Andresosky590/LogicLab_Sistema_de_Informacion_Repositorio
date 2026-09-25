import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/mesa_model.dart';
import 'auth_repository.dart' show baseUrl;

class MesaException implements Exception {
  final String message;
  MesaException(this.message);

  @override
  String toString() => message;
}

class MesaRepository {
  Future<Map<String, String>> _headersConToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? "";
    return {"Authorization": "Bearer $token"};
  }

  // GET /api/mesas/admin/listar — trae el QR_Token de cada mesa.
  Future<List<Mesa>> obtenerMesasConQr() async {
    final headers = await _headersConToken();

    late http.Response response;
    try {
      response = await http.get(
        Uri.parse("$baseUrl/api/mesas/admin/listar"),
        headers: headers,
      );
    } catch (e) {
      throw MesaException("No se pudo conectar con el servidor.");
    }

    if (response.statusCode != 200) {
      throw MesaException("No se pudieron cargar las mesas.");
    }

    final List<dynamic> data = jsonDecode(response.body);
    return data.map((e) => Mesa.fromJson(e)).toList();
  }

  // PUT /api/mesas/:id/regenerar-qr — invalida el QR anterior (ya no
  // sirve el que esté impreso y pegado en la mesa) y genera uno nuevo.
  Future<void> regenerarQr(int idMesa) async {
    final headers = await _headersConToken();

    late http.Response response;
    try {
      response = await http.put(
        Uri.parse("$baseUrl/api/mesas/$idMesa/regenerar-qr"),
        headers: headers,
      );
    } catch (e) {
      throw MesaException("No se pudo conectar con el servidor.");
    }

    if (response.statusCode != 200) {
      throw MesaException("No se pudo regenerar el código QR.");
    }
  }
}

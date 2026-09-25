import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/reporte_model.dart';
import 'auth_repository.dart' show baseUrl;

class ReporteException implements Exception {
  final String message;
  ReporteException(this.message);

  // Sin esto, mostrar el error en pantalla imprime
  // "Instance of 'ReporteException'" en vez del mensaje real.
  @override
  String toString() => message;
}

class ReporteRepository {
  Future<Map<String, String>> _headersConToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? "";
    return {"Authorization": "Bearer $token"};
  }

  // GET /api/reportes/ventas?periodo=esta_semana|este_mes|mes_pasado
  // Requiere token (verificarToken en el backend).
  Future<ReporteVentas> obtenerVentas(PeriodoReporte periodo) async {
    final headers = await _headersConToken();

    late http.Response response;
    try {
      response = await http.get(
        Uri.parse("$baseUrl/api/reportes/ventas?periodo=${periodo.valor}"),
        headers: headers,
      );
    } catch (e) {
      throw ReporteException("No se pudo conectar con el servidor.");
    }

    if (response.statusCode != 200) {
      throw ReporteException("No se pudo generar el reporte de ventas.");
    }

    final data = jsonDecode(response.body);

    if (data is! Map<String, dynamic>) {
      throw ReporteException("El servidor devolvió un reporte inesperado.");
    }

    return ReporteVentas.fromJson(data);
  }
}
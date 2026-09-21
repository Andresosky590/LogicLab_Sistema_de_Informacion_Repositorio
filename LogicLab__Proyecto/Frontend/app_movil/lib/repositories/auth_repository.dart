import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/usuario_model.dart';

// ── IMPORTANTE ────────────────────────────────────────────────────────────
// Esta es la URL base de tu backend. Cámbiala según dónde estés probando:
//
// - Emulador de Android:      http://10.0.2.2:5030
//   (10.0.2.2 es cómo el emulador de Android le dice "localhost de mi PC")
// - Celular físico (USB/WiFi): http://TU_IP_LOCAL:5030
//   (ej. http://192.168.1.15:5030 — la IP de tu PC en la red, no "localhost")
// - iOS simulator:             http://localhost:5030 (sí funciona directo)
//
// Para saber tu IP local en Windows: abre cmd y corre "ipconfig",
// busca "Dirección IPv4" de tu red WiFi.
const String baseUrl = "http://localhost:5030";

// ── IMPORTANTE (HU15 — QR de mesas) ─────────────────────────────────────
// URL del FRONTEND WEB (Vite), no del backend — es lo que va codificado
// dentro del QR que el cliente escanea con su celular. El puerto por
// defecto de Vite es el 5173.
//
// Igual que con baseUrl: en el celular del admin generando el QR no
// importa tanto (ese solo genera/regenera), pero el celular del CLIENTE
// que va a escanear el QR impreso sí necesita que esto sea una dirección
// a la que su celular pueda llegar — la IP local de tu PC en la red del
// restaurante, nunca "localhost".
const String webBaseUrl = "http://localhost:5173";

class AuthException implements Exception {
  final String message;
  AuthException(this.message);

  // Sin esto, mostrar el error en pantalla (e.toString()) imprime
  // "Instance of 'AuthException'" en vez del mensaje real.
  @override
  String toString() => message;
}

class AuthRepository {
  // Devuelve el Usuario y el token si el login es correcto.
  // Lanza AuthException con el mensaje del backend si falla.
  Future<(Usuario, String)> login(String email, String password) async {
    final url = Uri.parse("$baseUrl/api/usuarios/login");

    late http.Response response;
    try {
      response = await http.post(
        url,
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"email": email, "password": password}),
      );
    } catch (e) {
      // Error de red (backend apagado, IP mal puesta, sin internet, etc.)
      throw AuthException(
        "No se pudo conectar con el servidor. Verifica tu conexión.",
      );
    }

    final data = jsonDecode(response.body);

    if (response.statusCode != 200) {
      // El backend manda el mensaje de error en "message"
      throw AuthException(data['message'] ?? "Error al iniciar sesión");
    }

    final usuario = Usuario.fromJson(data['usuario']);
    final token = data['token'] as String;

    return (usuario, token);
  }
}

import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart' show MediaType;
import 'package:image_picker/image_picker.dart' show XFile;
import 'package:shared_preferences/shared_preferences.dart';

import '../models/plato_model.dart';
import 'auth_repository.dart' show baseUrl;

class PlatoException implements Exception {
  final String message;
  PlatoException(this.message);

  @override
  String toString() => message;
}

class PlatoRepository {
  Future<Map<String, String>> _headersConToken() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? "";
    return {
      "Authorization": "Bearer $token",
      "Content-Type": "application/json",
    };
  }

  // GET /api/platos/listar — requiere token (igual que en la web).
  Future<List<Plato>> obtenerPlatos() async {
    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.get(
        Uri.parse("$baseUrl/api/platos/listar"),
        headers: headers,
      );
    } catch (e) {
      throw PlatoException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw PlatoException("No se pudieron cargar los platos.");
    }
    final List<dynamic> data = jsonDecode(response.body);
    return data.map((e) => Plato.fromJson(e)).toList();
  }

  // GET /api/categorias/listar — solo categorías activas.
  Future<List<Categoria>> obtenerCategorias() async {
    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.get(
        Uri.parse("$baseUrl/api/categorias/listar"),
        headers: headers,
      );
    } catch (e) {
      throw PlatoException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw PlatoException("No se pudieron cargar las categorías.");
    }
    final List<dynamic> data = jsonDecode(response.body);
    return data.map((e) => Categoria.fromJson(e)).toList();
  }

  // POST /api/platos/agregar — devuelve el id del plato recién creado
  // (lo necesita quien llama para poder subirle la imagen justo después).
  Future<int> crearPlato({
    required String nombre,
    required String? descripcion,
    required double precio,
    required int idCategoria,
  }) async {
    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.post(
        Uri.parse("$baseUrl/api/platos/agregar"),
        headers: headers,
        body: jsonEncode({
          "nombre": nombre,
          "descripcion": (descripcion == null || descripcion.trim().isEmpty)
              ? null
              : descripcion.trim(),
          "precio": precio,
          "id_Categoria": idCategoria,
        }),
      );
    } catch (e) {
      throw PlatoException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 201) {
      final data = _tryDecode(response.body);
      throw PlatoException(data?['message'] ?? "Error al crear el plato.");
    }
    final data = jsonDecode(response.body);
    return data['id'] as int;
  }

  // PUT /api/platos/actualizar/:id — solo descripción y precio,
  // igual que en la web (el nombre y la categoría no se editan ahí).
  Future<void> actualizarPlato({
    required int id,
    required String? descripcion,
    required double precio,
  }) async {
    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.put(
        Uri.parse("$baseUrl/api/platos/actualizar/$id"),
        headers: headers,
        body: jsonEncode({"descripcion": descripcion, "precio": precio}),
      );
    } catch (e) {
      throw PlatoException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw PlatoException("Error al guardar los cambios.");
    }
  }

  // DELETE /api/platos/eliminar/:id
  Future<void> eliminarPlato(int id) async {
    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.delete(
        Uri.parse("$baseUrl/api/platos/eliminar/$id"),
        headers: headers,
      );
    } catch (e) {
      throw PlatoException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw PlatoException("Error al eliminar el plato.");
    }
  }

  // PUT /api/platos/disponibilidad/:id
  Future<void> cambiarDisponibilidad(int id, bool disponible) async {
    final headers = await _headersConToken();
    late http.Response response;
    try {
      response = await http.put(
        Uri.parse("$baseUrl/api/platos/disponibilidad/$id"),
        headers: headers,
        body: jsonEncode({"disponible": disponible}),
      );
    } catch (e) {
      throw PlatoException("No se pudo conectar con el servidor.");
    }
    if (response.statusCode != 200) {
      throw PlatoException("Error al actualizar la disponibilidad.");
    }
  }

  // POST /api/platos/:id/imagen (multipart) — sube la foto del plato.
  // Devuelve la ruta relativa (ImagenUrl) que guardó el backend;
  // hay que anteponerle baseUrl para poder mostrarla con Image.network.
  //
  // Recibe un XFile (no un File de dart:io) para que funcione igual en
  // el celular Y en Flutter Web, donde dart:io no existe. Por eso se
  // suben los BYTES de la imagen en vez de una ruta de archivo.
  Future<String> subirImagen(int idPlato, XFile archivo) async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token') ?? "";

    final bytes = await archivo.readAsBytes();

    final uri = Uri.parse("$baseUrl/api/platos/$idPlato/imagen");
    final request = http.MultipartRequest("POST", uri)
      ..headers["Authorization"] = "Bearer $token"
      ..files.add(
        http.MultipartFile.fromBytes(
          "imagen",
          bytes,
          filename: archivo.name,
          contentType: _tipoDeImagen(archivo.name),
        ),
      );

    late http.StreamedResponse streamed;
    try {
      streamed = await request.send();
    } catch (e) {
      throw PlatoException("No se pudo conectar con el servidor.");
    }

    final response = await http.Response.fromStream(streamed);

    if (response.statusCode != 200) {
      final data = _tryDecode(response.body);
      throw PlatoException(data?['message'] ?? "No se pudo subir la imagen.");
    }

    final data = jsonDecode(response.body);
    return data['imagenUrl'] as String;
  }

  // multer (backend) valida el Content-Type de la imagen y solo deja pasar
  // jpeg/png/webp. Desde el celular lo detecta http solo; desde la web los
  // bytes llegan "sin tipo", así que se lo decimos según la extensión.
  MediaType _tipoDeImagen(String nombreArchivo) {
    final extension = nombreArchivo.toLowerCase().split('.').last;
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return MediaType('image', 'jpeg');
      case 'png':
        return MediaType('image', 'png');
      case 'webp':
        return MediaType('image', 'webp');
      default:
        throw PlatoException("Solo se permiten imágenes JPG, PNG o WEBP.");
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

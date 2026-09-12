// Representa al usuario que inició sesión (mesero, cocinero o administrador).
// Coincide con el objeto "usuario" que devuelve POST /api/usuarios/login.
class Usuario {
  final int id;
  final String nombre;
  final String apellido;
  final String email;
  final int rolId;

  Usuario({
    required this.id,
    required this.nombre,
    required this.apellido,
    required this.email,
    required this.rolId,
  });

  factory Usuario.fromJson(Map<String, dynamic> json) {
    return Usuario(
      id: json['id'],
      nombre: json['nombre'],
      apellido: json['apellido'],
      email: json['email'],
      rolId: json['rolId'],
    );
  }
}

// IDs de rol tal como están definidos en la tabla `roles` de la BD.
class RolId {
  static const int mesero = 1;
  static const int cocinero = 2;
  static const int administrador = 3;
}

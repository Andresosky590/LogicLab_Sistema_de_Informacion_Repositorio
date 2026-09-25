// Representa un empleado (mesero, cocinero o administrador) tal como
// lo devuelve GET /api/usuarios/listar
// ({ id_Usuarios_Restaurante, Nombre, Apellido, Email, id_Roles_Usuarios, Activo }).
//
// Distinto del modelo `Usuario` (models/usuario_model.dart), que
// representa la sesión iniciada y viene de POST /api/usuarios/login
// con nombres de campo diferentes (nombre, apellido, email, rolId).
class Empleado {
  final int id;
  final String nombre;
  final String apellido;
  final String email;
  final int rolId;
  final bool activo;

  Empleado({
    required this.id,
    required this.nombre,
    required this.apellido,
    required this.email,
    required this.rolId,
    required this.activo,
  });

  String get nombreCompleto => "$nombre $apellido";

  factory Empleado.fromJson(Map<String, dynamic> json) {
    return Empleado(
      id: json['id_Usuarios_Restaurante'],
      nombre: json['Nombre'] ?? "",
      apellido: json['Apellido'] ?? "",
      email: json['Email'] ?? "",
      rolId: json['id_Roles_Usuarios'],
      activo: json['Activo'] == 1 || json['Activo'] == true,
    );
  }
}

// Nombres de rol para mostrar en pantalla — mismos ids que RolId en
// usuario_model.dart (1 mesero, 2 cocinero, 3 administrador).
const Map<int, String> nombresRol = {
  1: "Mesero",
  2: "Cocinero",
  3: "Administrador",
};

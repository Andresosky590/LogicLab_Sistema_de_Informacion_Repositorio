class NotificacionMesa {
  final int id;
  final String titulo;
  final String mensaje;
  final int? numeroMesa;

  NotificacionMesa({
    required this.id,
    required this.titulo,
    required this.mensaje,
    this.numeroMesa,
  });

  factory NotificacionMesa.fromJson(Map<String, dynamic> json) =>
      NotificacionMesa(
        id: json['id_Notificaciones'] as int,
        titulo: json['Titulo']?.toString() ?? 'Alerta de mesa',
        mensaje: json['Mensaje']?.toString() ?? '',
        numeroMesa: json['Numero_mesa'] as int?,
      );
}

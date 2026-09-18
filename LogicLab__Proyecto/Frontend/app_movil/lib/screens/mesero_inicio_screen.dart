import 'package:flutter/material.dart';
import '../controllers/mesero_controller.dart';
import '../models/mesa_model.dart';
import '../models/pedido_mesero_model.dart';
import '../repositories/mesero_repository.dart';

class MeseroHomeScreen extends StatefulWidget {
  const MeseroHomeScreen({super.key});

  @override
  State<MeseroHomeScreen> createState() => _MeseroHomeScreenState();
}

class _MeseroHomeScreenState extends State<MeseroHomeScreen> {
  final MeseroController _controller = MeseroController();
  final MeseroRepository _repository = MeseroRepository();

  late Future<ResumenMesero> _resumenFuture;
  late Future<List<Mesa>> _mesasFuture;
  late Future<List<PedidoMesero>> _pedidosFuture; // Añadido para la HU19

  @override
  void initState() {
    super.initState();
    _cargarDatos();
  }

  void _cargarDatos() {
    setState(() {
      _resumenFuture = _controller.cargarResumen();
      _mesasFuture = _controller.cargarMesas();
      _pedidosFuture = _repository
          .obtenerPedidos(); // Carga de pedidos para notificaciones
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Panel del Mesero - LogicLab"),
        actions: [
          // Indicador de notificaciones para pedidos listos (HU19)
          FutureBuilder<List<PedidoMesero>>(
            future: _pedidosFuture,
            builder: (context, snapshot) {
              int pedidosListos = 0;
              if (snapshot.hasData) {
                pedidosListos = snapshot.data!
                    .where((p) => p.estado.toLowerCase() == 'listo')
                    .length;
              }

              if (pedidosListos == 0) {
                return IconButton(
                  icon: const Icon(Icons.notifications_none),
                  tooltip: "No hay pedidos listos",
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          "No hay pedidos listos en cocina por ahora.",
                        ),
                        duration: Duration(seconds: 2),
                      ),
                    );
                  },
                );
              }

              return Stack(
                alignment: Alignment.center,
                children: [
                  IconButton(
                    icon: const Icon(
                      Icons.notifications_active,
                      color: Colors.orange,
                    ),
                    tooltip: "Tienes pedidos listos",
                    onPressed: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            "¡Tienes $pedidosListos pedido(s) listos para entregar!",
                          ),
                          backgroundColor: Colors.orange.shade800,
                          duration: const Duration(seconds: 3),
                        ),
                      );
                    },
                  ),
                  Positioned(
                    right: 8,
                    top: 8,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '$pedidosListos',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
          // Botón de actualizar general
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: "Actualizar datos",
            onPressed: () {
              _cargarDatos();
            },
          ),
        ],
      ),
      body: FutureBuilder<ResumenMesero>(
        future: _resumenFuture,
        builder: (context, snapshotResumen) {
          if (snapshotResumen.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshotResumen.hasError) {
            return Center(child: Text("Error: ${snapshotResumen.error}"));
          } else if (!snapshotResumen.hasData) {
            return const Center(child: Text("No hay datos disponibles."));
          }

          final resumen = snapshotResumen.data!;

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Saludo y métricas rápidas
                Text(
                  "¡Bienvenido, ${resumen.nombre}!",
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _tarjetaMetrica(
                      "Pedidos Hoy",
                      "${resumen.pedidosHoy}",
                      Colors.blue,
                    ),
                    _tarjetaMetrica(
                      "Entregados",
                      "${resumen.entregadosHoy}",
                      Colors.green,
                    ),
                    _tarjetaMetrica(
                      "Ventas",
                      "\$${resumen.gananciaHoy.toStringAsFixed(2)}",
                      Colors.orange,
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const Text(
                  "Estado de las Mesas",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),

                // Grid de mesas
                Expanded(
                  child: FutureBuilder<List<Mesa>>(
                    future: _mesasFuture,
                    builder: (context, snapshotMesas) {
                      if (snapshotMesas.connectionState ==
                          ConnectionState.waiting) {
                        return const Center(child: CircularProgressIndicator());
                      } else if (snapshotMesas.hasError) {
                        return const Center(
                          child: Text("Error al cargar mesas"),
                        );
                      } else if (!snapshotMesas.hasData ||
                          snapshotMesas.data!.isEmpty) {
                        return const Center(
                          child: Text("No hay mesas registradas."),
                        );
                      }

                      final mesas = snapshotMesas.data!;
                      return GridView.builder(
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 3,
                              crossAxisSpacing: 10,
                              mainAxisSpacing: 10,
                              childAspectRatio: 1.3,
                            ),
                        itemCount: mesas.length,
                        itemBuilder: (context, index) {
                          final mesa = mesas[index];
                          // Validar el estado de la mesa para cambiar color (libre / ocupada)
                          bool ocupada = mesa.estado.toLowerCase() == 'ocupada';
                          return Card(
                            color: ocupada
                                ? Colors.red.shade900
                                : Colors.green.shade900,
                            child: Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    "Mesa ${mesa.numero}",
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    mesa.estado.toUpperCase(),
                                    style: const TextStyle(
                                      color: Colors.white70,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _tarjetaMetrica(String titulo, String valor, Color color) {
    return Card(
      elevation: 4,
      child: Container(
        padding: const EdgeInsets.all(12),
        width: 100,
        child: Column(
          children: [
            Text(
              titulo,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 8),
            Text(
              valor,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

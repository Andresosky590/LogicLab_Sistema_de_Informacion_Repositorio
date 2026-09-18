import 'package:flutter/material.dart';
import '../models/mesa_model.dart';
import '../repositories/mesero_repository.dart';

class MeseroMesasScreen extends StatefulWidget {
  const MeseroMesasScreen({super.key});

  @override
  State<MeseroMesasScreen> createState() => _MeseroMesasScreenState();
}

class _MeseroMesasScreenState extends State<MeseroMesasScreen> {
  final MeseroRepository _repository = MeseroRepository();
  late Future<List<Mesa>> _mesasFuture;

  @override
  void initState() {
    super.initState();
    _cargarMesas();
  }

  void _cargarMesas() {
    setState(() {
      _mesasFuture = _repository.obtenerMesas();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Gestión de Mesas"),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _cargarMesas,
            tooltip: "Actualizar mesas",
          ),
        ],
      ),
      body: FutureBuilder<List<Mesa>>(
        future: _mesasFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(
              child: Text(
                "Error: ${snapshot.error.toString().replaceAll('MeseroException: ', '')}",
                style: const TextStyle(color: Colors.red),
              ),
            );
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text("No hay mesas registradas."));
          }

          final mesas = snapshot.data!;

          return Padding(
            padding: const EdgeInsets.all(12.0),
            child: GridView.builder(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3, // Número de columnas en la cuadrícula
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 1.1,
              ),
              itemCount: mesas.length,
              itemBuilder: (context, index) {
                final mesa = mesas[index];
                final bool isOcupada = mesa.estado.toLowerCase() == 'ocupada';

                return InkWell(
                  onTap: () {
                    // Aquí puedes programar la acción al presionar una mesa,
                    // por ejemplo: abrir el modal para tomar un pedido o ver la cuenta.
                    _mostrarOpcionesMesa(context, mesa);
                  },
                  child: Card(
                    elevation: 4,
                    color: isOcupada ? Colors.red.shade900 : Colors.green.shade800,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(8.0),
                      -child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            isOcupada ? Icons.restaurant : Icons.table_restaurant,
                            size: 36,
                            color: Colors.white,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            "Mesa ${mesa.numero}",
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.black26,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              mesa.estado.toUpperCase(),
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.white70,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }

  void _mostrarOpcionesMesa(BuildContext context, Mesa mesa) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text("Mesa ${mesa.numero}"),
        content: Text("Estado actual: ${mesa.estado}\n¿Qué acción deseas realizar?"),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Cerrar"),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // TODO: Navegar a la pantalla de creación de pedidos para esta mesa
            },
            child: const Text("Tomar Pedido"),
          ),
        ],
      ),
    );
  }
}
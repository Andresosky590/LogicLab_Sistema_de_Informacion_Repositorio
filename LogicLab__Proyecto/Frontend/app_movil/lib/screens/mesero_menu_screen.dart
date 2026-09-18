import 'package:flutter/material.dart';
import '../repositories/mesero_repository.dart';

class MeseroMenuScreen extends StatefulWidget {
  const MeseroMenuScreen({super.key});

  @override
  State<MeseroMenuScreen> createState() => _MeseroMenuScreenState();
}

class _MeseroMenuScreenState extends State<MeseroMenuScreen> {
  final MeseroRepository _repository = MeseroRepository();
  late Future<List<dynamic>> _menuFuture;

  @override
  void initState() {
    super.initState();
    _menuFuture = _repository.obtenerMenuDelDia();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Menú del Día")),
      body: FutureBuilder<List<dynamic>>(
        future: _menuFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text("Error: ${snapshot.error}"));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(
              child: Text("No hay platos en el menú del día."),
            );
          }

          final platos = snapshot.data!;
          return ListView.builder(
            itemCount: platos.length,
            itemBuilder: (context, index) {
              final plato = platos[index];
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                child: ListTile(
                  title: Text(
                    plato['nombre'] ?? 'Plato sin nombre',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(plato['descripcion'] ?? ''),
                  trailing: Text(
                    "\$${plato['precio']}",
                    style: const TextStyle(
                      color: Colors.green,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

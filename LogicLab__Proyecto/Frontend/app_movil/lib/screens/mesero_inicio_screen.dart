import 'package:flutter/material.dart';

// Placeholder temporal — el contenido real se desarrolla en HU02
// (Mesero: ver menú del día y mesas disponibles).
class MeseroHomeScreen extends StatelessWidget {
  const MeseroHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Mesero")),
      body: const Center(child: Text("Bienvenido, mesero")),
    );
  }
}

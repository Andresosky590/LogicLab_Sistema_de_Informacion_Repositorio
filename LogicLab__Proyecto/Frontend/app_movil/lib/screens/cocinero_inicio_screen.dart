import 'package:flutter/material.dart';

// Placeholder temporal — el contenido real se desarrolla en HU03
// (Cocinero: recibir pedidos entrantes en tiempo real).
class CocineroHomeScreen extends StatelessWidget {
  const CocineroHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Cocinero")),
      body: const Center(child: Text("Bienvenido, cocinero")),
    );
  }
}

import 'package:flutter/material.dart';

// Placeholder temporal — el contenido real se desarrolla en
// HU05, HU12, HU13 (gestión de platos, disponibilidad, usuarios).
class AdminHomeScreen extends StatelessWidget {
  const AdminHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Administrador")),
      body: const Center(child: Text("Bienvenido, administrador")),
    );
  }
}

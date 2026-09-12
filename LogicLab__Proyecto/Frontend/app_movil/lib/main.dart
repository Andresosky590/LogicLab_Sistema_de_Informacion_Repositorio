import 'package:flutter/material.dart';

import 'screens/login_screen.dart';

void main() {
  runApp(const MangataApp());
}

class MangataApp extends StatelessWidget {
  const MangataApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mangata',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}

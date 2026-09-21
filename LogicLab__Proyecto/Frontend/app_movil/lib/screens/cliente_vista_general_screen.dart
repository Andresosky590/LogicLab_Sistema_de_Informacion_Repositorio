import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/cliente_controller.dart';
import '../formato.dart';
import '../models/menu_dia_model.dart';
import '../models/mesa_model.dart';
import '../models/pedido_cliente_model.dart';
import '../repositories/auth_repository.dart' show baseUrl;

// ================================================================
// COLORES — misma paleta neón del login
// ================================================================

const Color _clNeon = Color(0xFFFF2C4F);
const Color _clNeonSoft = Color(0x26FF2C4F);
const Color _clAzul = Color(0xFF2FC8FF);
const Color _clBg = Color(0xFF0A0A0A);
const Color _clCard = Color(0x0FFFFFFF);
const Color _clMuted = Color(0xFF9B98A5);

// Misma imagen fija por categoría que usa VistaCliente.jsx (IMG_CATEGORIA)
// — la web tampoco usa la foto real de cada plato acá, solo estas 4.
const Map<int, String> _imagenCategoria = {
  1: "assets/images/CartaCorriente.png",
  2: "assets/images/CartaComidaRapida.png",
  3: "assets/images/CartaEspecial.png",
  4: "assets/images/CartaBebidas.png",
};

String _rutaImagen(int idCategoria) =>
    _imagenCategoria[idCategoria] ?? "assets/images/CartaCorriente.png";

// Vista que ve el cliente al escanear el QR de su mesa desde la app:
// el menú real de hoy (o el aviso de que aún no se ha publicado), más
// el estado de su pedido si ya tiene uno activo. Es de solo lectura —
// pedir y pagar sigue siendo el flujo de la web (VistaCliente.jsx).
class ClienteVistaGeneralScreen extends StatefulWidget {
  final Mesa mesa;

  const ClienteVistaGeneralScreen({super.key, required this.mesa});

  @override
  State<ClienteVistaGeneralScreen> createState() =>
      _ClienteVistaGeneralScreenState();
}

class _ClienteVistaGeneralScreenState extends State<ClienteVistaGeneralScreen> {
  final _controller = ClienteController();

  bool _cargando = true;
  String? _error;
  PedidoCliente? _pedidoActivo;
  MenuDia? _menu;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _error = null;
    });

    try {
      final resultados = await Future.wait([
        _controller.obtenerPedidosActivos(widget.mesa.numero),
        _controller.obtenerMenuHoy(),
      ]);

      if (!mounted) return;
      setState(() {
        // Igual que hace VistaCliente.jsx: de todos los pedidos de la
        // mesa (puede haber varios de días/rondas anteriores), solo
        // nos importa el que esté realmente en curso ahora mismo.
        // "Entregado" no cuenta como activo — ya terminó, no hay nada
        // que mostrarle al cliente sobre ese pedido en esta pantalla.
        final pedidos = resultados[0] as List<PedidoCliente>;
        final enCurso = pedidos
            .where(
              (p) =>
                  ["pendiente", "preparando", "listo"].contains(p.estadoPedido),
            )
            .toList();
        _pedidoActivo = enCurso.isEmpty ? null : enCurso.first;

        _menu = resultados[1] as MenuDia?;
        _cargando = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _cargando = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _clBg,
      body: SafeArea(
        child: Column(
          children: [
            _encabezado(),
            Expanded(child: _buildCuerpo()),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("PQRSF: próximamente en la app.")),
          );
        },
        backgroundColor: _clNeon,
        icon: const Icon(Icons.forum_outlined, color: Colors.white),
        label: Text(
          "PQRSF",
          style: GoogleFonts.inter(
            color: Colors.white,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }

  // --------------------------------------------------------------
  // ENCABEZADO — Mesa #, título, SALIR (igual que VistaCliente.jsx)
  // --------------------------------------------------------------

  Widget _encabezado() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 10),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 7,
                ),
                decoration: BoxDecoration(
                  color: _clAzul.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: _clAzul),
                ),
                child: Text(
                  "Mesa #${widget.mesa.numero}",
                  style: GoogleFonts.inter(
                    color: _clAzul,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const Spacer(),
              OutlinedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: _clNeon),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                ),
                child: Text(
                  "SALIR",
                  style: GoogleFonts.inter(
                    color: _clNeon,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            "Restaurante Mangata",
            style: GoogleFonts.playfairDisplay(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 10),
          const Divider(color: _clNeonSoft, height: 1),
        ],
      ),
    );
  }

  // --------------------------------------------------------------
  // CUERPO
  // --------------------------------------------------------------

  Widget _buildCuerpo() {
    if (_cargando) {
      return const Center(child: CircularProgressIndicator(color: _clNeon));
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, color: _clMuted, size: 40),
              const SizedBox(height: 14),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: _clMuted, fontSize: 13),
              ),
              const SizedBox(height: 14),
              TextButton(
                onPressed: _cargar,
                child: const Text(
                  "Reintentar",
                  style: TextStyle(color: _clNeon),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: _clNeon,
      backgroundColor: Colors.black,
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(18, 4, 18, 100),
        children: [
          if (_pedidoActivo != null) ...[
            _tarjetaPedido(_pedidoActivo!),
            const SizedBox(height: 18),
          ],

          if (_menu == null) _menuNoPublicado() else _contenidoMenu(_menu!),
        ],
      ),
    );
  }

  // --------------------------------------------------------------
  // MENÚ NO PUBLICADO — mismo texto exacto que VistaCliente.jsx
  // --------------------------------------------------------------

  Widget _menuNoPublicado() {
    return Padding(
      padding: const EdgeInsets.only(top: 60),
      child: Column(
        children: [
          Text(
            "El menú de hoy aún no está listo.",
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            "El administrador lo publicará en breve.",
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(color: _clMuted, fontSize: 12.5),
          ),
        ],
      ),
    );
  }

  // --------------------------------------------------------------
  // MENÚ DEL DÍA
  // --------------------------------------------------------------

  Widget _contenidoMenu(MenuDia menu) {
    // Mismo criterio que la web: todo lo que no sea categoría 4
    // (Bebidas) va junto bajo "PLATOS" — no se separa por categoría.
    final platos = menu.items.where((i) => i.idCategoria != 4).toList();
    final bebidas = menu.items.where((i) => i.idCategoria == 4).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (platos.isNotEmpty) ...[
          _tituloSeccion("PLATOS"),
          const SizedBox(height: 10),
          ...platos.map(_tarjetaItem),
          const SizedBox(height: 18),
        ],
        if (bebidas.isNotEmpty) ...[
          _tituloSeccion("BEBIDAS"),
          const SizedBox(height: 10),
          ...bebidas.map(_tarjetaItem),
        ],
      ],
    );
  }

  Widget _tituloSeccion(String texto) {
    return Center(
      child: Text(
        texto,
        style: GoogleFonts.spaceGrotesk(
          color: _clAzul,
          fontSize: 13,
          fontWeight: FontWeight.w700,
          letterSpacing: 2,
        ),
      ),
    );
  }

  // Una sola tarjeta para cualquier ítem del menú (Corriente del Día
  // incluida) — misma imagen de categoría, nombre, descripción y precio
  // que muestra la web, sin el selector de cantidad ni "Agregar al
  // pedido" porque acá no se pide, solo se consulta.
  Widget _tarjetaItem(MenuDiaItem item) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: _clCard,
        borderRadius: BorderRadius.circular(14),
        border: item.esCorriente ? Border.all(color: _clNeon) : null,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 16 / 9,
            child: item.imagenUrl != null
                ? Image.network(
                    "$baseUrl${item.imagenUrl}",
                    fit: BoxFit.cover,
                    // Si la URL falla (archivo borrado, red caída),
                    // no se rompe la tarjeta: cae a la imagen genérica.
                    errorBuilder: (_, __, ___) => Image.asset(
                      _rutaImagen(item.idCategoria),
                      fit: BoxFit.cover,
                    ),
                  )
                : Image.asset(_rutaImagen(item.idCategoria), fit: BoxFit.cover),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.nombrePlato,
                  style: GoogleFonts.inter(
                    color: Colors.white,
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                if ((item.descripcion ?? "").isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    item.descripcion!,
                    style: GoogleFonts.inter(color: _clMuted, fontSize: 12),
                  ),
                ],
                const SizedBox(height: 8),
                Text(
                  fmtPesos(item.precio),
                  style: GoogleFonts.spaceGrotesk(
                    color: _clAzul,
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // --------------------------------------------------------------
  // PEDIDO ACTIVO
  // --------------------------------------------------------------

  Widget _tarjetaPedido(PedidoCliente pedido) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _clCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _clNeonSoft),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  "Pedido #${pedido.id}",
                  style: GoogleFonts.spaceGrotesk(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Text(
                fmtPesos(pedido.totalPagar),
                style: GoogleFonts.spaceGrotesk(
                  color: _clNeon,
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            pedido.estadoLegible,
            style: GoogleFonts.inter(
              color: _clNeon,
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (pedido.items.isNotEmpty) ...[
            const SizedBox(height: 10),
            const Divider(color: _clNeonSoft, height: 1),
            const SizedBox(height: 10),
            ...pedido.items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  "${item.cantidad}x ${item.nombrePlato}",
                  style: GoogleFonts.inter(color: _clMuted, fontSize: 12.5),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

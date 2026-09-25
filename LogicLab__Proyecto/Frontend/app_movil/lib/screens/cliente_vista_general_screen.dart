import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/cliente_controller.dart';
import '../formato.dart';
import '../models/menu_dia_model.dart';
import '../models/mesa_model.dart';
import '../models/pedido_cliente_model.dart';
import '../notificacion_sonido.dart';
import '../repositories/auth_repository.dart' show baseUrl;
import 'cliente_pago_screen.dart';
import 'cliente_pqrsf_screen.dart';
import 'login_screen.dart';

// ================================================================
// COLORES — misma paleta neón del login
// ================================================================

const Color _clNeon = Color(0xFFFF2C4F);
const Color _clNeonSoft = Color(0x26FF2C4F);
const Color _clAzul = Color(0xFF2FC8FF);
const Color _clAmarillo = Color(0xFFF1C40F);
const Color _clBg = Color(0xFF0A0A0A);
const Color _clCard = Color(0x0FFFFFFF);
const Color _clMuted = Color(0xFF9B98A5);

// Sin imágenes de respaldo por categoría — el admin sube una foto
// real por plato desde su dispositivo; si un plato todavía no tiene
// una, se muestra un ícono simple en vez de una imagen genérica.
Widget _placeholderImagen() {
  return Container(
    color: const Color(0x14FFFFFF),
    alignment: Alignment.center,
    child: const Icon(Icons.restaurant_menu_rounded, color: _clMuted, size: 28),
  );
}

// ================================================================
// Vista que ve el cliente al escanear el QR de su mesa desde la app.
//
// FLUJO:
// - Sin pedido activo ni reciente: arma el carrito y lo envía UNA
//   vez → nace el pedido, sin pagar todavía. Si después quiere
//   agregar algo más, eso ya lo hace el MESERO desde su propio
//   editor (le avisa en la mesa) — el cliente no vuelve a tocar el
//   carrito hasta que ese pedido se resuelva.
// - "pendiente" (el mesero todavía no lo mandó a cocina): solo
//   seguimiento, sin nada que pagar todavía.
// - "preparando" / "listo" (ya en cocina): si sigue sin pagar,
//   aparece la opción de pagar ahí mismo, antes de que llegue a la
//   mesa — el mesero puede cancelar pedido y pago en cualquier
//   momento de esta espera si el cliente ya no va a volver.
// - "entregado": pantalla de cierre — si por algún motivo llegó sin
//   pagar, ahí se pide el pago como último recurso; si no, va directo
//   al agradecimiento + PQRSF + ver menú de nuevo + salir.
// ================================================================
class ClienteVistaGeneralScreen extends StatefulWidget {
  final Mesa mesa;

  const ClienteVistaGeneralScreen({super.key, required this.mesa});

  @override
  State<ClienteVistaGeneralScreen> createState() =>
      _ClienteVistaGeneralScreenState();
}

class _ClienteVistaGeneralScreenState extends State<ClienteVistaGeneralScreen> {
  final _controller = ClienteController();

  Timer? _polling;
  bool _cargando = true;
  String? _error;
  PedidoCliente? _pedidoActivo;
  MenuDia? _menu;

  // El pedido que YA se entregó, mientras el cliente no haya
  // decidido "salir" o "ver el menú de nuevo" — dispara la pantalla
  // de cierre. Solo se activa para un pedido que ESTA sesión venía
  // siguiendo como "en curso", nunca para un pedido viejo de un
  // cliente anterior en la mesa.
  int? _idPedidoSeguido;
  PedidoCliente? _pedidoRecienEntregado;
  bool _liberandoMesa = false;

  // Para avisar (sonido + banner) justo cuando el pedido pasa a
  // "listo" — no en cada vuelta del polling mientras sigue en ese
  // estado, solo la primera vez que cambia a él.
  String? _estadoAnterior;

  // idPlato -> cantidad. El carrito para el PRIMER pedido — una vez
  // enviado, el cliente ya no vuelve a tocarlo (ver nota del flujo).
  final Map<int, int> _cantidades = {};
  bool _enviando = false;

  @override
  void initState() {
    super.initState();
    _cargar();
    // BUGFIX: antes esta pantalla solo cargaba una vez al entrar — el
    // cliente no se enteraba de que su pedido pasó a "preparando" o
    // "listo" sin deslizar para refrescar a mano. Ahora hace polling
    // cada 6s, en silencio (sin tapar la pantalla con el spinner).
    _polling = Timer.periodic(
      const Duration(seconds: 6),
      (_) => _cargar(silencioso: true),
    );
  }

  @override
  void dispose() {
    _polling?.cancel();
    super.dispose();
  }

  // Única forma de cerrar la sesión de esta mesa — un refresh de
  // página YA NO lo hace (ver guardarSesionMesa en el controller).
  // Además libera la mesa (queda "disponible") para el siguiente
  // cliente que se siente ahí.
  Future<void> _salir() async {
    setState(() => _liberandoMesa = true);
    await _controller.liberarMesa(widget.mesa.id);
    await _controller.cerrarSesionMesa();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  Future<void> _cargar({bool silencioso = false}) async {
    if (!silencioso) {
      setState(() {
        _cargando = true;
        _error = null;
      });
    }

    try {
      final resultados = await Future.wait([
        _controller.obtenerPedidosActivos(widget.mesa.numero),
        _controller.obtenerMenuHoy(),
      ]);

      if (!mounted) return;

      // Igual que hace VistaCliente.jsx: de todos los pedidos de la
      // mesa (puede haber varios de días/rondas anteriores), solo
      // nos importa el que esté realmente en curso ahora mismo.
      final pedidos = resultados[0] as List<PedidoCliente>;
      final enCurso = pedidos
          .where(
            (p) =>
                ["pendiente", "preparando", "listo"].contains(p.estadoPedido),
          )
          .toList();
      final nuevoPedidoActivo = enCurso.isEmpty ? null : enCurso.first;

      if (nuevoPedidoActivo != null &&
          nuevoPedidoActivo.estadoPedido == "listo" &&
          _estadoAnterior != null &&
          _estadoAnterior != "listo") {
        _alertarPedidoListo();
      }
      _estadoAnterior = nuevoPedidoActivo?.estadoPedido;

      // ¿Llegó el pedido? Solo cuenta si es el MISMO que esta sesión
      // venía siguiendo como "en curso" — nunca uno viejo de un
      // cliente anterior que se haya quedado sin cerrar en esta mesa.
      PedidoCliente? nuevoRecienEntregado = _pedidoRecienEntregado;
      if (nuevoPedidoActivo != null) {
        _idPedidoSeguido = nuevoPedidoActivo.id;
        nuevoRecienEntregado = null;
      } else if (_idPedidoSeguido != null) {
        // OJO: antes solo se buscaba acá cuando `nuevoRecienEntregado`
        // todavía era null (primera vez que se detecta la entrega). Por
        // eso, si el cliente pagaba desde esta misma pantalla de cierre,
        // el objeto se quedaba con el `estadoPago` viejo para siempre —
        // seguía mostrando "Pagar ahora" aunque el pago ya hubiera sido
        // aprobado. Ahora se refresca siempre con la versión más
        // reciente del pedido mientras siga "entregado".
        final match = pedidos.where((p) => p.id == _idPedidoSeguido);
        if (match.isNotEmpty && match.first.estadoPedido == "entregado") {
          nuevoRecienEntregado = match.first;
        }
      }

      setState(() {
        _pedidoActivo = nuevoPedidoActivo;
        _pedidoRecienEntregado = nuevoRecienEntregado;
        _menu = resultados[1] as MenuDia?;
        // El carrito que el cliente está armando no se toca en una
        // vuelta silenciosa del polling.
        if (!silencioso) _cantidades.clear();
        _error = null;
        _cargando = false;
      });
    } catch (e) {
      if (!mounted) return;
      if (silencioso) {
        setState(() => _cargando = false);
        return;
      }
      setState(() {
        _error = e.toString();
        _cargando = false;
      });
    }
  }

  void _alertarPedidoListo() {
    HapticFeedback.mediumImpact();
    NotificacionSonido.reproducir();

    if (!mounted) return;
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        backgroundColor: Color(0xFF19A971),
        duration: Duration(seconds: 4),
        content: Text(
          "🔔 ¡Tu pedido está listo! Ya casi llega a tu mesa.",
          style: TextStyle(fontWeight: FontWeight.w700),
        ),
      ),
    );
  }

  // ==============================================================
  // CARRITO — solo existe antes de haber enviado el primer pedido.
  // ==============================================================

  void _agregar(MenuDiaItem item) {
    setState(
      () => _cantidades[item.idPlatos] = (_cantidades[item.idPlatos] ?? 0) + 1,
    );
  }

  void _quitar(MenuDiaItem item) {
    setState(() {
      final actual = _cantidades[item.idPlatos] ?? 0;
      if (actual <= 1) {
        _cantidades.remove(item.idPlatos);
      } else {
        _cantidades[item.idPlatos] = actual - 1;
      }
    });
  }

  List<MenuDiaItem> get _itemsDelMenu => _menu?.items ?? [];

  MenuDiaItem? _buscarItem(int idPlato) {
    for (final item in _itemsDelMenu) {
      if (item.idPlatos == idPlato) return item;
    }
    return null;
  }

  double get _totalCarrito {
    double total = 0;
    _cantidades.forEach((idPlato, cantidad) {
      final item = _buscarItem(idPlato);
      if (item != null) total += item.precio * cantidad;
    });
    return total;
  }

  int get _cantidadTotalCarrito => _cantidades.values.fold(0, (a, b) => a + b);

  // ==============================================================
  // ENVIAR EL PRIMER (Y ÚNICO) PEDIDO DEL CLIENTE
  // ==============================================================

  Future<void> _enviarPedido() async {
    if (_cantidadTotalCarrito == 0) return;

    setState(() => _enviando = true);

    try {
      final items = <Map<String, dynamic>>[];
      _cantidades.forEach((idPlato, cantidad) {
        final item = _buscarItem(idPlato);
        if (item == null) return;
        items.add({
          "idPlato": item.idPlatos,
          "nombrePlato": item.nombrePlato,
          "cantidadPedido": cantidad,
          "notasEspeciales": null,
          "precioFinal": item.precio * cantidad,
          "idCategoria": item.idCategoria,
        });
      });

      await _controller.crearPedido(
        idMesa: widget.mesa.id,
        totalPagar: _totalCarrito,
        items: items,
      );

      if (!mounted) return;
      setState(() => _cantidades.clear());
      await _cargar();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: const Color(0xFFE74C3C),
        ),
      );
    } finally {
      if (mounted) setState(() => _enviando = false);
    }
  }

  // ==============================================================
  // PAGAR — disponible desde que el pedido está "en cocina" (o
  // después), nunca antes. Sirve tanto para el pedido en curso como
  // para el recién entregado que sigue sin pagar (último recurso).
  // ==============================================================

  Future<void> _pagar(PedidoCliente pedido) async {
    // La pasarela se abre como una ventana centrada, tanto en móvil
    // como en Flutter Web. Ya no reemplaza toda la vista del cliente.
    final aprobado = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        final anchoPantalla = MediaQuery.of(dialogContext).size.width;
        final altoPantalla = MediaQuery.of(dialogContext).size.height;

        return Dialog(
          backgroundColor: Colors.transparent,
          insetPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 24,
          ),
          child: SizedBox(
            width: anchoPantalla > 520 ? 520 : anchoPantalla - 32,
            height: altoPantalla > 760 ? 700 : altoPantalla * 0.86,
            child: ClientePagoScreen(
              idPedido: pedido.id,
              total: pedido.totalPagar,
              numeroMesa: widget.mesa.numero,
              comoDialogo: true,
            ),
          ),
        );
      },
    );

    if (aprobado == true) await _cargar();
  }

  void _abrirPqrsf() {
    Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const ClientePqrsfScreen()));
  }

  // El cliente quiere pedir otra ronda — se sale de la pantalla de
  // cierre y vuelve al menú normal.
  void _verMenuDeNuevo() {
    setState(() {
      _pedidoRecienEntregado = null;
      _idPedidoSeguido = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final sinPedidoAlguno =
        _pedidoActivo == null && _pedidoRecienEntregado == null;
    final hayCarritoSinEnviar = sinPedidoAlguno && _cantidadTotalCarrito > 0;

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
      bottomNavigationBar: hayCarritoSinEnviar
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: ElevatedButton(
                  onPressed: _enviando ? null : _enviarPedido,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _clNeon,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    _enviando
                        ? "Enviando..."
                        : "Enviar pedido · $_cantidadTotalCarrito ítem${_cantidadTotalCarrito == 1 ? "" : "s"} · ${fmtPesos(_totalCarrito)}",
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13.5,
                    ),
                  ),
                ),
              ),
            )
          : null,
      // PQRSF ya no es un botón flotante durante el pedido — solo
      // aparece integrado en la pantalla final de "Gracias por tu
      // visita", para no distraer del flujo de pedir/pagar.
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
                onPressed: _salir,
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

    if (_pedidoRecienEntregado != null) {
      return _buildPantallaDeCierre(_pedidoRecienEntregado!);
    }

    // Con un pedido en curso (pendiente/preparando/listo), la
    // pantalla se queda SOLO en su seguimiento — sin menú, sin
    // carrito. Si el cliente quiere agregar algo más, eso lo
    // resuelve con el mesero directamente.
    if (_pedidoActivo != null) {
      return RefreshIndicator(
        color: _clNeon,
        backgroundColor: Colors.black,
        onRefresh: _cargar,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(18, 4, 18, 40),
          children: [_tarjetaPedido(_pedidoActivo!)],
        ),
      );
    }

    // Sin ningún pedido todavía — el menú para armar el primero.
    return RefreshIndicator(
      color: _clNeon,
      backgroundColor: Colors.black,
      onRefresh: _cargar,
      child: ListView(
        padding: EdgeInsets.fromLTRB(
          18,
          4,
          18,
          _cantidadTotalCarrito > 0 ? 20 : 40,
        ),
        children: [
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

  Widget _tarjetaItem(MenuDiaItem item) {
    final cantidad = _cantidades[item.idPlatos] ?? 0;

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: _clCard,
        borderRadius: BorderRadius.circular(14),
        border: item.esCorriente
            ? Border.all(color: _clNeon)
            : (cantidad > 0 ? Border.all(color: _clAzul) : null),
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
                    errorBuilder: (_, _, _) => _placeholderImagen(),
                  )
                : _placeholderImagen(),
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
                const SizedBox(height: 10),
                Row(
                  children: [
                    Text(
                      fmtPesos(item.precio),
                      style: GoogleFonts.spaceGrotesk(
                        color: _clAzul,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const Spacer(),
                    cantidad == 0
                        ? OutlinedButton(
                            onPressed: () => _agregar(item),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: _clNeon),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 8,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: Text(
                              "+ Agregar",
                              style: GoogleFonts.inter(
                                color: _clNeon,
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          )
                        : Row(
                            children: [
                              _botonQty(Icons.remove, () => _quitar(item)),
                              SizedBox(
                                width: 30,
                                child: Text(
                                  "$cantidad",
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.spaceGrotesk(
                                    color: Colors.white,
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                              _botonQty(Icons.add, () => _agregar(item)),
                            ],
                          ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _botonQty(IconData icono, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: _clNeonSoft,
          borderRadius: BorderRadius.circular(7),
        ),
        child: Icon(icono, size: 16, color: _clNeon),
      ),
    );
  }

  // --------------------------------------------------------------
  // PANTALLA DE CIERRE — el pedido ya llegó a la mesa.
  // --------------------------------------------------------------

  Widget _buildPantallaDeCierre(PedidoCliente pedido) {
    final sinPagar = pedido.faltaPagar;

    return RefreshIndicator(
      color: _clNeon,
      backgroundColor: Colors.black,
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 40),
        children: [
          if (sinPagar)
            ..._seccionPagarEntregado(pedido)
          else ...[
            _encabezadoGracias(),
            const SizedBox(height: 28),
            _tarjetaCierre(
              icono: Icons.forum_outlined,
              titulo: "TU OPINIÓN NOS IMPORTA",
              texto:
                  "¿Alguna petición, queja, felicitación o sugerencia? Cuéntanos, nos ayuda a mejorar.",
              boton: "Dejar un comentario",
              colorBoton: _clNeon,
              onTap: _abrirPqrsf,
            ),
            const SizedBox(height: 14),
            _tarjetaCierre(
              icono: Icons.restaurant_menu_rounded,
              titulo: "¿TE QUEDASTE CON GANAS DE MÁS?",
              texto:
                  "Vuelve a ver el menú del día y cierra tu visita con algo más.",
              boton: "Ver el menú de nuevo",
              colorBoton: _clAzul,
              onTap: _verMenuDeNuevo,
            ),
            const SizedBox(height: 28),
            const Divider(color: _clNeonSoft, height: 1),
            const SizedBox(height: 20),
            Text(
              "¿Ya terminaste?",
              textAlign: TextAlign.center,
              style: GoogleFonts.spaceGrotesk(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              "No olvides tocar SALIR para dejar la mesa lista para el siguiente cliente.",
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: _clMuted, fontSize: 12),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _liberandoMesa ? null : _salir,
                icon: _liberandoMesa
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(
                        Icons.logout_rounded,
                        size: 18,
                        color: Colors.white,
                      ),
                label: Text(
                  _liberandoMesa ? "Saliendo..." : "SALIR",
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _clNeon,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _encabezadoGracias() {
    return Column(
      children: [
        Container(
          width: 68,
          height: 68,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: _clNeonSoft,
            border: Border.all(color: _clNeon, width: 1.5),
          ),
          child: const Icon(Icons.favorite_rounded, color: _clNeon, size: 30),
        ),
        const SizedBox(height: 18),
        Text(
          "¡Gracias por tu visita!",
          textAlign: TextAlign.center,
          style: GoogleFonts.playfairDisplay(
            color: Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          "MANGATA · EL MEJOR RESTAURANTE DEL PEDAZO",
          textAlign: TextAlign.center,
          style: GoogleFonts.spaceGrotesk(
            color: _clAzul,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.3,
          ),
        ),
      ],
    );
  }

  Widget _tarjetaCierre({
    required IconData icono,
    required String titulo,
    required String texto,
    required String boton,
    required Color colorBoton,
    required VoidCallback onTap,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _clCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorBoton.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icono, color: colorBoton, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  titulo,
                  style: GoogleFonts.spaceGrotesk(
                    color: colorBoton,
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            texto,
            style: GoogleFonts.inter(
              color: _clMuted,
              fontSize: 12.5,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: onTap,
              style: OutlinedButton.styleFrom(
                side: BorderSide(color: colorBoton),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: Text(
                boton,
                style: GoogleFonts.inter(
                  color: colorBoton,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Último recurso: llegó a la mesa pero por algún motivo sigue sin
  // pagar (lo normal es que ya se haya pagado durante "preparando"
  // o "listo" — ver _tarjetaPedido).
  List<Widget> _seccionPagarEntregado(PedidoCliente pedido) {
    return [
      const SizedBox(height: 20),
      const Icon(Icons.room_service_rounded, color: _clAmarillo, size: 40),
      const SizedBox(height: 14),
      Text(
        "¡Tu pedido ya llegó!",
        textAlign: TextAlign.center,
        style: GoogleFonts.playfairDisplay(
          color: Colors.white,
          fontSize: 22,
          fontWeight: FontWeight.w700,
        ),
      ),
      const SizedBox(height: 8),
      Text(
        "Paga si ya terminaste, o si quieres, paga antes — como prefieras.",
        textAlign: TextAlign.center,
        style: GoogleFonts.inter(color: _clMuted, fontSize: 13),
      ),
      const SizedBox(height: 20),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0x26F1C40F),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: _clAmarillo),
        ),
        child: Column(
          children: [
            Text(
              "TOTAL",
              style: GoogleFonts.inter(
                color: _clMuted,
                fontSize: 10.5,
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              fmtPesos(pedido.totalPagar),
              style: GoogleFonts.spaceGrotesk(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 16),
      SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: () => _pagar(pedido),
          style: ElevatedButton.styleFrom(
            backgroundColor: _clAmarillo,
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: const Text(
            "Pagar ahora",
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
      ),
    ];
  }

  // --------------------------------------------------------------
  // PEDIDO EN CURSO (pendiente / preparando / listo)
  // --------------------------------------------------------------

  Widget _tarjetaPedido(PedidoCliente pedido) {
    // Recién enviado, el mesero todavía no lo mandó a cocina — nada
    // que pagar todavía, solo esperar.
    final esperandoCocina = pedido.estadoPedido == "pendiente";
    // Ya en cocina (o listo) y sigue sin pagar — acá es cuando debe
    // aparecer la opción de pagar.
    final debePagar = !esperandoCocina && pedido.faltaPagar;

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _clCard,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: debePagar ? _clAmarillo : _clNeonSoft),
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
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Text(
                fmtPesos(pedido.totalPagar),
                style: GoogleFonts.spaceGrotesk(
                  color: _clNeon,
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            pedido.estadoLegible,
            style: GoogleFonts.inter(
              color: _clNeon,
              fontSize: 13.5,
              fontWeight: FontWeight.w600,
            ),
          ),
          if (pedido.items.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Divider(color: _clNeonSoft, height: 1),
            const SizedBox(height: 12),
            ...pedido.items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 5),
                child: Text(
                  "${item.cantidad}x ${item.nombrePlato}",
                  style: GoogleFonts.inter(color: _clMuted, fontSize: 13),
                ),
              ),
            ),
          ],
          if (debePagar) ...[
            const SizedBox(height: 16),
            const Divider(color: _clNeonSoft, height: 1),
            const SizedBox(height: 14),
            Row(
              children: [
                const Icon(
                  Icons.payments_outlined,
                  color: _clAmarillo,
                  size: 16,
                ),
                const SizedBox(width: 6),
                Text(
                  "Ya puedes pagar mientras esperas",
                  style: GoogleFonts.inter(
                    color: _clAmarillo,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => _pagar(pedido),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _clAmarillo,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: Text(
                  "Pagar ${fmtPesos(pedido.totalPagar)} ahora",
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

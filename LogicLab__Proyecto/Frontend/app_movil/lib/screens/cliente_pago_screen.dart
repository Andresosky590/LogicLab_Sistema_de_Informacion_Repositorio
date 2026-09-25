import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/cliente_controller.dart';
import '../formato.dart';

const Color _clNeon = Color(0xFFFF2C4F);
const Color _clNeonSoft = Color(0x26FF2C4F);
const Color _clBg = Color(0xFF0A0A0A);
const Color _clCard = Color(0x0FFFFFFF);
const Color _clMuted = Color(0xFF9B98A5);

class ClientePagoScreen extends StatefulWidget {
  final int idPedido;
  final double total;
  final int numeroMesa;
  final bool comoDialogo;

  const ClientePagoScreen({
    super.key,
    required this.idPedido,
    required this.total,
    required this.numeroMesa,
    this.comoDialogo = false,
  });

  @override
  State<ClientePagoScreen> createState() => _ClientePagoScreenState();
}

class _ClientePagoScreenState extends State<ClientePagoScreen> {
  final _controller = ClienteController();

  bool _cargando = true;
  String? _errorCarga;
  List<Map<String, dynamic>> _metodos = [];

  int? _metodoSeleccionado;
  String? _nombreMetodoSeleccionado;
  final Map<String, String> _datos = {};

  bool _simulando = false;
  String? _mensajeRechazo;
  bool _aprobado = false;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    setState(() {
      _cargando = true;
      _errorCarga = null;
    });
    try {
      final metodos = await _controller.obtenerMetodosPagoOnline();
      if (!mounted) return;
      if (metodos.isEmpty) {
        setState(() {
          _errorCarga = "No existen métodos de pago disponibles.";
          _cargando = false;
        });
        return;
      }
      setState(() {
        _metodos = metodos;
        _cargando = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorCarga = e.toString();
        _cargando = false;
      });
    }
  }

  void _elegirMetodo(Map<String, dynamic> metodo) {
    setState(() {
      _metodoSeleccionado = metodo['id_MetodoPago'] as int;
      _nombreMetodoSeleccionado = metodo['NombreMetodo']?.toString();
      _datos.clear();
      _mensajeRechazo = null;
    });
  }

  bool get _formularioCompleto {
    switch (_nombreMetodoSeleccionado) {
      case "Nequi":
      case "Daviplata":
        return (_datos['celular'] ?? "").isNotEmpty &&
            (_datos['codigo'] ?? "").isNotEmpty;
      case "PSE":
        return (_datos['correo'] ?? "").isNotEmpty &&
            (_datos['documento'] ?? "").isNotEmpty &&
            (_datos['banco'] ?? "").isNotEmpty;
      case "Tarjeta crédito":
      case "Tarjeta débito":
        return (_datos['numero'] ?? "").isNotEmpty &&
            (_datos['nombre'] ?? "").isNotEmpty &&
            (_datos['vencimiento'] ?? "").isNotEmpty &&
            (_datos['cvv'] ?? "").isNotEmpty;
      default:
        return false;
    }
  }

  Future<void> _confirmarPago() async {
    if (_metodoSeleccionado == null || !_formularioCompleto) return;

    setState(() {
      _simulando = true;
      _mensajeRechazo = null;
    });

    try {
      await _controller.simularPago(
        idPedido: widget.idPedido,
        idMetodoPago: _metodoSeleccionado!,
        datos: _datos,
      );
      if (!mounted) return;
      setState(() {
        _aprobado = true;
        _simulando = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _mensajeRechazo = e.toString();
        _simulando = false;
        // El cliente puede reintentar sin perder el pedido —
        // solo se limpia el formulario, no la selección de mesa/pedido.
        _metodoSeleccionado = null;
        _nombreMetodoSeleccionado = null;
        _datos.clear();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.comoDialogo) {
      return Material(
        color: _clBg,
        borderRadius: BorderRadius.circular(18),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            Container(
              color: Colors.black,
              padding: const EdgeInsets.fromLTRB(16, 12, 10, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      "PAGO · PEDIDO #${widget.idPedido}",
                      style: GoogleFonts.spaceGrotesk(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 12.5,
                        letterSpacing: 1,
                      ),
                    ),
                  ),
                  if (!_aprobado)
                    IconButton(
                      onPressed: _simulando
                          ? null
                          : () => Navigator.of(context).pop(false),
                      icon: const Icon(Icons.close_rounded),
                      color: Colors.white70,
                      tooltip: "Cerrar",
                    ),
                ],
              ),
            ),
            Expanded(child: _aprobado ? _vistaAprobado() : _buildCuerpo()),
          ],
        ),
      );
    }

    return PopScope(
      canPop: !_simulando,
      child: Scaffold(
        backgroundColor: _clBg,
        appBar: AppBar(
          backgroundColor: Colors.black,
          elevation: 0,
          automaticallyImplyLeading: !_aprobado,
          title: Text(
            "PAGO · PEDIDO #${widget.idPedido}",
            style: GoogleFonts.spaceGrotesk(
              color: Colors.white,
              fontWeight: FontWeight.w700,
              fontSize: 12.5,
              letterSpacing: 1,
            ),
          ),
        ),
        body: _aprobado ? _vistaAprobado() : _buildCuerpo(),
      ),
    );
  }

  Widget _vistaAprobado() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.check_circle_rounded,
              color: Color(0xFF19A971),
              size: 56,
            ),
            const SizedBox(height: 16),
            Text(
              "¡Pago aprobado!",
              style: GoogleFonts.spaceGrotesk(
                color: Colors.white,
                fontSize: 19,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "Pedido #${widget.idPedido} enviado a cocina.\nMesa #${widget.numeroMesa}.",
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(color: _clMuted, fontSize: 13.5),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(true),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _clNeon,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 13),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: const Text(
                  "Listo",
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCuerpo() {
    if (_cargando) {
      return const Center(child: CircularProgressIndicator(color: _clNeon));
    }
    if (_errorCarga != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, color: _clMuted, size: 40),
              const SizedBox(height: 14),
              Text(
                _errorCarga!,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: _clMuted, fontSize: 12.5),
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

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _clCard,
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            children: [
              Text(
                "TOTAL A PAGAR",
                style: GoogleFonts.inter(
                  color: _clMuted,
                  fontSize: 10.5,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                fmtPesos(widget.total),
                style: GoogleFonts.spaceGrotesk(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Text(
          "SELECCIONA UN MÉTODO DE PAGO",
          style: GoogleFonts.spaceGrotesk(
            color: _clNeon,
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 10),
        ..._metodos.map((m) {
          final id = m['id_MetodoPago'] as int;
          final nombre = m['NombreMetodo']?.toString() ?? "";
          final activo = _metodoSeleccionado == id;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: GestureDetector(
              onTap: () => _elegirMetodo(m),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  color: activo ? _clNeonSoft : _clCard,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: activo ? _clNeon : Colors.transparent,
                    width: 1.5,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _iconoMetodo(nombre),
                      color: activo ? _clNeon : _clMuted,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        nombre,
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    if (activo)
                      const Icon(Icons.check_circle, color: _clNeon, size: 18),
                  ],
                ),
              ),
            ),
          );
        }),
        if (_nombreMetodoSeleccionado != null) ...[
          const SizedBox(height: 8),
          _formularioMetodo(),
        ],
        if (_mensajeRechazo != null) ...[
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0x33E74C3C),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.error_outline_rounded,
                  color: Color(0xFFE74C3C),
                  size: 18,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _mensajeRechazo!,
                    style: GoogleFonts.inter(
                      color: const Color(0xFFE74C3C),
                      fontSize: 12.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
        Container(
          margin: const EdgeInsets.only(top: 16),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: _clCard,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              const Icon(Icons.info_outline_rounded, color: _clMuted, size: 15),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  "Simulación académica. No se realiza ningún cobro real.",
                  style: GoogleFonts.inter(color: _clMuted, fontSize: 11),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed:
                (_simulando ||
                    _metodoSeleccionado == null ||
                    !_formularioCompleto)
                ? null
                : _confirmarPago,
            style: ElevatedButton.styleFrom(
              backgroundColor: _clNeon,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              disabledBackgroundColor: _clNeon.withValues(alpha: 0.3),
            ),
            child: Text(
              _simulando ? "Procesando..." : "Confirmar pago",
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 14.5,
              ),
            ),
          ),
        ),
      ],
    );
  }

  IconData _iconoMetodo(String nombre) {
    if (nombre.contains("Nequi") || nombre.contains("Daviplata")) {
      return Icons.phone_android_rounded;
    }
    if (nombre == "PSE") return Icons.account_balance_rounded;
    return Icons.credit_card_rounded;
  }

  Widget _formularioMetodo() {
    switch (_nombreMetodoSeleccionado) {
      case "Nequi":
      case "Daviplata":
        return _tarjetaFormulario(
          [
            _campo(
              "celular",
              "Número de celular",
              teclado: TextInputType.phone,
              maxLen: 10,
            ),
            _campo(
              "codigo",
              "Código de confirmación",
              teclado: TextInputType.number,
              maxLen: 6,
            ),
          ],
          "Simulación: cualquier celular que empiece por 3 (10 dígitos) y cualquier código de 6 dígitos son aceptados.",
        );
      case "PSE":
        return _tarjetaFormulario([
          _campo(
            "correo",
            "Correo electrónico",
            teclado: TextInputType.emailAddress,
          ),
          _campo(
            "documento",
            "Número de documento",
            teclado: TextInputType.number,
          ),
          _selectorBanco(),
        ], null);
      case "Tarjeta crédito":
      case "Tarjeta débito":
        return _tarjetaFormulario(
          [
            _campo(
              "numero",
              "Número de tarjeta",
              teclado: TextInputType.number,
              maxLen: 16,
            ),
            _campo("nombre", "Nombre del titular"),
            Row(
              children: [
                Expanded(child: _campo("vencimiento", "MM/AA", maxLen: 5)),
                const SizedBox(width: 10),
                Expanded(
                  child: _campo(
                    "cvv",
                    "CVV",
                    teclado: TextInputType.number,
                    maxLen: 4,
                    oculto: true,
                  ),
                ),
              ],
            ),
          ],
          "Simulación: usa una fecha futura. El número debe tener 16 dígitos válidos (prueba 4111111111111111).",
        );
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _tarjetaFormulario(List<Widget> campos, String? ayuda) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _clCard,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (int i = 0; i < campos.length; i++) ...[
            campos[i],
            if (i != campos.length - 1) const SizedBox(height: 12),
          ],
          if (ayuda != null) ...[
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.info_outline_rounded,
                  color: _clMuted,
                  size: 14,
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    ayuda,
                    style: GoogleFonts.inter(color: _clMuted, fontSize: 10.5),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _campo(
    String clave,
    String hint, {
    TextInputType? teclado,
    int? maxLen,
    bool oculto = false,
  }) {
    return TextField(
      keyboardType: teclado,
      maxLength: maxLen,
      obscureText: oculto,
      style: GoogleFonts.inter(color: Colors.white, fontSize: 13.5),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.inter(color: _clMuted, fontSize: 13),
        counterText: "",
        filled: true,
        fillColor: const Color(0x14FFFFFF),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 10,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
      ),
      onChanged: (v) => setState(() => _datos[clave] = v),
    );
  }

  Widget _selectorBanco() {
    const bancos = [
      "Bancolombia",
      "Davivienda",
      "BBVA",
      "Banco de Bogotá",
      "Nequi",
    ];
    return DropdownButtonFormField<String>(
      initialValue: _datos['banco']?.isEmpty ?? true ? null : _datos['banco'],
      dropdownColor: const Color(0xFF161616),
      style: GoogleFonts.inter(color: Colors.white, fontSize: 13.5),
      decoration: InputDecoration(
        hintText: "Selecciona tu banco",
        hintStyle: GoogleFonts.inter(color: _clMuted, fontSize: 13),
        filled: true,
        fillColor: const Color(0x14FFFFFF),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 12,
          vertical: 10,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide.none,
        ),
      ),
      items: bancos
          .map((b) => DropdownMenuItem(value: b, child: Text(b)))
          .toList(),
      onChanged: (v) => setState(() => _datos['banco'] = v ?? ""),
    );
  }
}

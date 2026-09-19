import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../controllers/reporte_controller.dart';
import '../models/reporte_model.dart';
import '../reporte_pdf.dart';
import '../formato.dart';
import '../widgets/admin_drawer.dart';

// ================================================================
// COLORES — misma paleta neón que el resto del panel admin
// ================================================================

const Color _rpNeon = Color(0xFFFF1744);
const Color _rpNeonSoft = Color(0x26FF1744);
const Color _rpNeonBorder = Color(0x4DFF1744);
const Color _rpBg = Color(0xFF0A0A0A);
const Color _rpCard = Color(0x0AFFFFFF);
const Color _rpMuted = Color(0xFF888888);

class ReportesScreen extends StatefulWidget {
  const ReportesScreen({super.key});

  @override
  State<ReportesScreen> createState() => _ReportesScreenState();
}

class _ReportesScreenState extends State<ReportesScreen> {
  final _controller = ReporteController();

  PeriodoReporte _periodo = PeriodoReporte.esteMes;

  bool _cargando = true;
  bool _generandoPdf = false;
  String? _error;
  ReporteVentas? _reporte;

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
      final reporte = await _controller.cargarVentas(_periodo);
      if (!mounted) return;
      setState(() {
        _reporte = reporte;
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

  void _cambiarPeriodo(PeriodoReporte nuevo) {
    if (nuevo == _periodo) return;
    setState(() => _periodo = nuevo);
    _cargar();
  }

  // ==============================================================
  // DESCARGAR PDF
  // ==============================================================

  Future<void> _descargarPdf() async {
    final reporte = _reporte;
    if (reporte == null) return;

    setState(() => _generandoPdf = true);

    try {
      await ReportePdf.generarYCompartir(
        reporte: reporte,
        periodo: _periodo,
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("No se pudo generar el PDF: $e"),
          backgroundColor: const Color(0xFFE74C3C),
        ),
      );
    } finally {
      if (mounted) setState(() => _generandoPdf = false);
    }
  }

  // ==============================================================
  // BUILD
  // ==============================================================

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _rpBg,
      drawer: const AdminDrawer(seccionActiva: "Reportes"),
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          "REPORTES DE VENTAS",
          style: GoogleFonts.spaceGrotesk(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
            fontSize: 13,
          ),
        ),
        actions: [
          IconButton(
            icon: _generandoPdf
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: _rpNeon,
                    ),
                  )
                : const Icon(Icons.download_rounded, color: _rpNeon),
            tooltip: "Descargar PDF",
            // Sin reporte cargado (o vacío) no hay nada que exportar.
            onPressed: (_cargando || _generandoPdf || _reporte == null)
                ? null
                : _descargarPdf,
          ),
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: _rpNeon),
            tooltip: "Actualizar",
            onPressed: _cargando ? null : _cargar,
          ),
        ],
      ),
      body: Column(
        children: [
          _selectorPeriodo(),
          Expanded(child: _buildCuerpo()),
        ],
      ),
    );
  }

  // --------------------------------------------------------------
  // SELECTOR DE PERÍODO
  // --------------------------------------------------------------

  Widget _selectorPeriodo() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
      child: Row(
        children: PeriodoReporte.values.map((p) {
          final activo = p == _periodo;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.only(right: 8),
              child: GestureDetector(
                onTap: () => _cambiarPeriodo(p),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: activo ? _rpNeon : _rpCard,
                    borderRadius: BorderRadius.circular(9),
                    border: Border.all(
                      color: activo ? _rpNeon : _rpNeonBorder,
                    ),
                  ),
                  child: Text(
                    p.etiqueta,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      color: activo ? Colors.black : Colors.white,
                      fontSize: 11.5,
                      fontWeight: activo ? FontWeight.w700 : FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // --------------------------------------------------------------
  // CUERPO
  // --------------------------------------------------------------

  Widget _buildCuerpo() {
    if (_cargando) {
      return const Center(child: CircularProgressIndicator(color: _rpNeon));
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, color: _rpMuted, size: 40),
              const SizedBox(height: 14),
              Text(
                "No se pudo cargar el reporte",
                style: GoogleFonts.spaceGrotesk(
                  color: Colors.white,
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(color: _rpMuted, fontSize: 12.5),
              ),
              const SizedBox(height: 14),
              TextButton(
                onPressed: _cargar,
                child: const Text(
                  "Reintentar",
                  style: TextStyle(color: _rpNeon),
                ),
              ),
            ],
          ),
        ),
      );
    }

    final reporte = _reporte;
    if (reporte == null) return const SizedBox.shrink();

    return RefreshIndicator(
      color: _rpNeon,
      backgroundColor: Colors.black,
      onRefresh: _cargar,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 28),
        children: [
          if (reporte.sinDatos)
            _avisoSinDatos()
          else ...[
            _tarjetasMetricas(reporte.metricas),
            const SizedBox(height: 22),
            _seccion("INGRESOS POR DÍA"),
            _GraficaBarras(datos: reporte.porDia),
            const SizedBox(height: 22),
            _seccion("PAGOS POR MÉTODO"),
            _listaMetodos(reporte.porMetodo),
            const SizedBox(height: 22),
            _seccion("PLATOS MÁS VENDIDOS"),
            _listaRanking(reporte.ranking),
          ],
        ],
      ),
    );
  }

  Widget _avisoSinDatos() {
    return Padding(
      padding: const EdgeInsets.only(top: 60),
      child: Column(
        children: [
          const Icon(Icons.bar_chart_rounded, color: _rpMuted, size: 42),
          const SizedBox(height: 14),
          Text(
            "Sin ventas en este período",
            style: GoogleFonts.spaceGrotesk(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            "Prueba con otro período.",
            style: GoogleFonts.inter(color: _rpMuted, fontSize: 12.5),
          ),
        ],
      ),
    );
  }

  Widget _seccion(String titulo) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Text(
        titulo,
        style: GoogleFonts.spaceGrotesk(
          color: _rpNeon,
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.4,
        ),
      ),
    );
  }

  // --------------------------------------------------------------
  // MÉTRICAS
  // --------------------------------------------------------------

  Widget _tarjetasMetricas(MetricasReporte m) {
    return Column(
      children: [
        // Ingresos ocupa el ancho completo: es el número que el
        // admin viene a ver primero.
        _TarjetaMetrica(
          icono: Icons.payments_rounded,
          etiqueta: "Ingresos del período",
          valor: fmtPesos(m.ingresosTotales),
          destacada: true,
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _TarjetaMetrica(
                icono: Icons.receipt_long_rounded,
                etiqueta: "Ticket promedio",
                valor: fmtPesos(m.ticketPromedio),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _TarjetaMetrica(
                icono: Icons.shopping_bag_outlined,
                etiqueta: "Pedidos",
                valor: fmtMiles(m.totalPedidos),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _TarjetaMetrica(
                icono: Icons.check_circle_outline_rounded,
                etiqueta: "Entregados",
                valor: fmtMiles(m.entregados),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _TarjetaMetrica(
                icono: Icons.cancel_outlined,
                etiqueta: "Cancelados",
                valor: fmtMiles(m.cancelados),
                colorValor: const Color(0xFFE74C3C),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // --------------------------------------------------------------
  // MÉTODOS DE PAGO
  // --------------------------------------------------------------

  Widget _listaMetodos(List<PagoPorMetodo> metodos) {
    if (metodos.isEmpty) {
      return _cajaVacia("Sin pagos aprobados en este período.");
    }

    final totalGeneral = metodos.fold<double>(0, (suma, m) => suma + m.total);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _rpCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _rpNeonBorder),
      ),
      child: Column(
        children: metodos.map((m) {
          final porcentaje = totalGeneral > 0 ? m.total / totalGeneral : 0.0;

          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        m.metodo,
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Text(
                      "${m.cantidad} · ${fmtPesos(m.total)}",
                      style: GoogleFonts.inter(
                        color: _rpMuted,
                        fontSize: 11.5,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: porcentaje,
                    minHeight: 5,
                    backgroundColor: _rpNeonSoft,
                    valueColor: const AlwaysStoppedAnimation(_rpNeon),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  // --------------------------------------------------------------
  // RANKING
  // --------------------------------------------------------------

  Widget _listaRanking(List<PlatoRanking> ranking) {
    if (ranking.isEmpty) {
      return _cajaVacia("Sin platos entregados en este período.");
    }

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 14),
      decoration: BoxDecoration(
        color: _rpCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _rpNeonBorder),
      ),
      child: Column(
        children: List.generate(ranking.length, (i) {
          final plato = ranking[i];
          final esPodio = i < 3;
          final medalla = ["🥇", "🥈", "🥉"];

          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 9),
            child: Row(
              children: [
                SizedBox(
                  width: 28,
                  child: Text(
                    esPodio ? medalla[i] : "#${i + 1}",
                    style: GoogleFonts.inter(
                      color: esPodio ? Colors.white : _rpMuted,
                      fontSize: esPodio ? 15 : 11.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        plato.nombrePlato,
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 12.5,
                          fontWeight: esPodio
                              ? FontWeight.w700
                              : FontWeight.w400,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        fmtPesos(plato.ingresoGenerado),
                        style: GoogleFonts.inter(
                          color: _rpMuted,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  "${fmtMiles(plato.vecesPedido)} u.",
                  style: GoogleFonts.spaceGrotesk(
                    color: _rpNeon,
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _cajaVacia(String mensaje) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 26, horizontal: 14),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: _rpCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _rpNeonBorder),
      ),
      child: Text(
        mensaje,
        textAlign: TextAlign.center,
        style: GoogleFonts.inter(color: _rpMuted, fontSize: 12.5),
      ),
    );
  }
}

// ================================================================
// TARJETA DE MÉTRICA
// ================================================================

class _TarjetaMetrica extends StatelessWidget {
  final IconData icono;
  final String etiqueta;
  final String valor;
  final bool destacada;
  final Color? colorValor;

  const _TarjetaMetrica({
    required this.icono,
    required this.etiqueta,
    required this.valor,
    this.destacada = false,
    this.colorValor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: destacada ? _rpNeonSoft : _rpCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _rpNeonBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: _rpNeonSoft,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icono, color: _rpNeon, size: 19),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  etiqueta.toUpperCase(),
                  style: GoogleFonts.inter(
                    color: _rpMuted,
                    fontSize: 9.5,
                    letterSpacing: 0.6,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 3),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    valor,
                    style: GoogleFonts.spaceGrotesk(
                      color: colorValor ?? _rpNeon,
                      fontSize: destacada ? 22 : 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ================================================================
// GRÁFICA DE BARRAS
// ================================================================
//
// Hecha a mano con Containers en vez de agregar un paquete de
// gráficas: son pocas barras y así el proyecto no suma otra
// dependencia solo por esta pantalla. Scroll horizontal porque un
// mes puede traer 30 días y no caben en el ancho del celular.

class _GraficaBarras extends StatelessWidget {
  final List<VentaPorDia> datos;

  const _GraficaBarras({required this.datos});

  @override
  Widget build(BuildContext context) {
    if (datos.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 26),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: _rpCard,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: _rpNeonBorder),
        ),
        child: Text(
          "Sin ingresos registrados en este período.",
          style: GoogleFonts.inter(color: _rpMuted, fontSize: 12.5),
        ),
      );
    }

    // El máximo define la altura relativa de cada barra. Si todos los
    // días son 0 se usa 1 para no dividir por cero.
    final maximo = datos
        .map((d) => d.ingresos)
        .fold<double>(0, (a, b) => a > b ? a : b);
    final referencia = maximo > 0 ? maximo : 1.0;

    return Container(
      padding: const EdgeInsets.fromLTRB(14, 16, 14, 10),
      decoration: BoxDecoration(
        color: _rpCard,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _rpNeonBorder),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: datos.map((dia) {
            final proporcion = dia.ingresos / referencia;
            // Altura mínima de 3 para que un día en $0 siga siendo
            // visible como barra vacía, en vez de desaparecer.
            final altura = 3 + (proporcion * 120);

            return Padding(
              padding: const EdgeInsets.only(right: 10),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    fmtCompacto(dia.ingresos),
                    style: GoogleFonts.inter(
                      color: dia.ingresos > 0 ? Colors.white : _rpMuted,
                      fontSize: 8.5,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    width: 26,
                    height: altura,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [_rpNeon, Color(0xFFFF6B35)],
                      ),
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(5),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    dia.etiquetaCorta,
                    style: GoogleFonts.inter(color: _rpMuted, fontSize: 9),
                  ),
                  Text(
                    "${dia.pedidos}p",
                    style: GoogleFonts.inter(
                      color: _rpMuted.withValues(alpha: 0.7),
                      fontSize: 8,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}
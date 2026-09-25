import '../models/reporte_model.dart';
import '../repositories/reporte_repository.dart';

class ReporteController {
  final ReporteRepository _repository = ReporteRepository();

  Future<ReporteVentas> cargarVentas(PeriodoReporte periodo) {
    return _repository.obtenerVentas(periodo);
  }
}
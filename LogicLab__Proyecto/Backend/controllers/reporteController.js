const db = require("../config/db");

const ReporteController = {

    // ── Reporte de ventas por período ─────────────────────────────────────────
    // GET /api/reportes/ventas?periodo=este_mes | mes_pasado | esta_semana
    getVentas: (req, res) => {
        const { periodo = "este_mes" } = req.query;

        // Construir el filtro de fecha según el período solicitado
        let filtroFecha;
        switch (periodo) {
            case "esta_semana":
                filtroFecha = `YEARWEEK(p.Fecha_Pedido, 1) = YEARWEEK(CURDATE(), 1)`;
                break;
            case "mes_pasado":
                filtroFecha = `YEAR(p.Fecha_Pedido)  = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
                           AND MONTH(p.Fecha_Pedido) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))`;
                break;
            case "este_mes":
            default:
                filtroFecha = `YEAR(p.Fecha_Pedido) = YEAR(CURDATE())
                           AND MONTH(p.Fecha_Pedido) = MONTH(CURDATE())`;
                break;
        }

        // ── Consulta 1: métricas generales del período ──
        // NOTA: Pedidos no guarda el estado ni el método de pago como texto,
        // solo los FK (id_Estado, id_MetodoPago) — hay que unir con
        // estados_pedido/metodo_pago para poder filtrar/agrupar por nombre,
        // igual que ya hace pedidoModel.js en el resto del backend.
        const queryMetricas = `
            SELECT
                COUNT(*)                                                      AS total_pedidos,
                COUNT(CASE WHEN ep.NombreEstado = 'entregado'  THEN 1 END)    AS entregados,
                COUNT(CASE WHEN ep.NombreEstado = 'cancelado'  THEN 1 END)    AS cancelados,
                COALESCE(SUM(CASE WHEN ep.NombreEstado = 'entregado' THEN p.TotalPagar END), 0) AS ingresos_totales,
                COALESCE(AVG(CASE WHEN ep.NombreEstado = 'entregado' THEN p.TotalPagar END), 0) AS ticket_promedio,
                COUNT(CASE WHEN mp.NombreMetodo = 'Efectivo'      THEN 1 END) AS pagos_efectivo,
                COUNT(CASE WHEN mp.NombreMetodo = 'Tarjeta'       THEN 1 END) AS pagos_tarjeta,
                COUNT(CASE WHEN mp.NombreMetodo = 'Transferencia' THEN 1 END) AS pagos_transferencia
            FROM Pedidos p
            JOIN estados_pedido ep ON ep.id_Estado = p.id_Estado
            LEFT JOIN metodo_pago mp ON mp.id_MetodoPago = p.id_MetodoPago
            WHERE ${filtroFecha}
        `;

        // ── Consulta 2: ventas agrupadas por día (para la gráfica de barras) ──
        const queryPorDia = `
            SELECT
                DATE(p.Fecha_Pedido)                                        AS fecha,
                COUNT(*)                                                     AS pedidos,
                COALESCE(SUM(CASE WHEN ep.NombreEstado = 'entregado' THEN p.TotalPagar END), 0) AS ingresos
            FROM Pedidos p
            JOIN estados_pedido ep ON ep.id_Estado = p.id_Estado
            WHERE ${filtroFecha}
            GROUP BY DATE(p.Fecha_Pedido)
            ORDER BY fecha ASC
        `;

        // ── Consulta 3: ranking de platos más vendidos en el período ──
        const queryRanking = `
            SELECT
                dp.NombrePlato,
                SUM(dp.CantidadPedido)                   AS veces_pedido,
                SUM(dp.CantidadPedido * dp.PrecioFinal)  AS ingreso_generado
            FROM Detalle_Pedidos dp
            INNER JOIN Pedidos p ON p.id_Pedidos = dp.id_Pedidos
            JOIN estados_pedido ep ON ep.id_Estado = p.id_Estado
            WHERE ${filtroFecha}
              AND ep.NombreEstado = 'entregado'
            GROUP BY dp.NombrePlato
            ORDER BY veces_pedido DESC
            LIMIT 10
        `;

        // Ejecutar las 3 consultas en paralelo
        Promise.all([
            new Promise((resolve, reject) =>
                db.query(queryMetricas, (err, r) => err ? reject(err) : resolve(r[0]))
            ),
            new Promise((resolve, reject) =>
                db.query(queryPorDia, (err, r) => err ? reject(err) : resolve(r))
            ),
            new Promise((resolve, reject) =>
                db.query(queryRanking, (err, r) => err ? reject(err) : resolve(r))
            ),
        ])
        .then(([metricas, porDia, ranking]) => {
            res.status(200).json({ metricas, porDia, ranking, periodo });
        })
        .catch(err => {
            console.error("Error en reporte:", err);
            res.status(500).json({ error: "Error al generar el reporte" });
        });
    },
};

module.exports = ReporteController;
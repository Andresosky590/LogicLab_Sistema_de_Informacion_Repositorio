const MesaModel = require("../models/mesaModel");

// Estimación de permanencia, contada desde la última entrega de un pedido.
// Ej.: 2 personas → 30 min, 4 → 40 min, 6 → 50 min (tope 90).
const MINUTOS_BASE = 20;
const MINUTOS_POR_PERSONA = 5;
const MINUTOS_MAX = 90;
const PERSONAS_POR_DEFECTO = 2;
// Mesa ocupada que nunca pidió nada.
const MINUTOS_SIN_PEDIDOS = 15;

// Alerta: "sin_pedidos" | "por_cobrar" | "posible_salida" | null
const obtenerEstadoMesas = (callback) => {
    MesaModel.findOcupadasConActividad((err, rows) => {
        if (err) return callback(err);

        const mesas = rows.map(r => {
            const personas = r.Personas ?? null;
            const estimado = Math.min(
                MINUTOS_BASE + MINUTOS_POR_PERSONA * (personas ?? PERSONAS_POR_DEFECTO),
                MINUTOS_MAX
            );

            const validos = Number(r.PedidosValidos);
            const enCurso = Number(r.PedidosEnCurso);
            const sinPagar = Number(r.EntregadosSinPagar);
            const minOcupada = Number(r.MinutosOcupada ?? 0);
            const minEntrega =
                r.MinutosDesdeEntrega == null ? null : Number(r.MinutosDesdeEntrega);

            let alerta = null;

            if (validos === 0) {
                if (minOcupada >= MINUTOS_SIN_PEDIDOS) alerta = "sin_pedidos";
            } else if (enCurso === 0 && minEntrega !== null && minEntrega >= estimado) {
                alerta = sinPagar > 0 ? "por_cobrar" : "posible_salida";
            }

            return {
                id_Mesas: r.id_Mesas,
                Numero_mesa: r.Numero_mesa,
                Personas: personas,
                MinutosOcupada: minOcupada,
                MinutosDesdeEntrega: minEntrega,
                MinutosEstimados: estimado,
                Alerta: alerta
            };
        });

        callback(null, mesas);
    });
};

module.exports = { obtenerEstadoMesas };
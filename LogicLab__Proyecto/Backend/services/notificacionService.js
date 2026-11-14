const NotificacionModel = require("../models/notificacionModel");
const { obtenerEstadoMesas } = require("./estadoMesasService");

const ROL_MESERO = 1;
const INTERVALO_MS = 60 * 1000;

const PLANTILLAS = {
    posible_salida: m => ({
        titulo: `Mesa ${m.Numero_mesa}: posible salida`,
        mensaje: `Hace ${m.MinutosDesdeEntrega} min que recibieron su pedido (estimado ${m.MinutosEstimados} min${m.Personas ? ` para ${m.Personas} personas` : ""}). Si ya se fueron, libera la mesa.`
    }),
    por_cobrar: m => ({
        titulo: `Mesa ${m.Numero_mesa}: pedido sin pagar`,
        mensaje: `Hace ${m.MinutosDesdeEntrega} min que recibieron su pedido y aún no pagan. Revisa si necesitan la cuenta.`
    }),
    sin_pedidos: m => ({
        titulo: `Mesa ${m.Numero_mesa}: ocupada sin pedidos`,
        mensaje: `Lleva ${m.MinutosOcupada} min ocupada y no ha hecho ningún pedido. Si no hay nadie, libera la mesa.`
    })
};

const clave = (idMesa, tipo) => `${idMesa}:${tipo}`;

const revisarMesas = () => {
    // 1) Mesas liberadas: sus avisos activos ya no tienen sentido.
    NotificacionModel.resolverDeMesasLibres((err) => {
        if (err) return console.error("[Notificaciones] Error resolviendo avisos de mesas libres:", err.message);

        obtenerEstadoMesas((err, mesas) => {
            if (err) return console.error("[Notificaciones] Error calculando estado de mesas:", err.message);

            NotificacionModel.findDeSesionActual((err, existentes) => {
                if (err) return console.error("[Notificaciones] Error leyendo avisos existentes:", err.message);

                const vigentes = new Set(
                    mesas.filter(m => m.Alerta).map(m => clave(m.id_Mesas, m.Alerta))
                );

                // 2) Avisos activos cuya alerta cambió (p. ej. el cliente pagó): se cierran.
                const obsoletas = existentes
                    .filter(e => e.Estado === "activa" && !vigentes.has(clave(e.id_Mesas, e.Tipo)))
                    .map(e => e.id_Notificaciones);

                if (obsoletas.length > 0) {
                    NotificacionModel.resolver(obsoletas, (e) => {
                        if (e) console.error("[Notificaciones] Error cerrando avisos obsoletos:", e.message);
                    });
                }

                // 3) Alertas nuevas: solo si no existe ya una igual en esta sesión de mesa.
                const yaCreadas = new Set(existentes.map(e => clave(e.id_Mesas, e.Tipo)));

                mesas
                    .filter(m => m.Alerta && !yaCreadas.has(clave(m.id_Mesas, m.Alerta)))
                    .forEach(m => {
                        const { titulo, mensaje } = PLANTILLAS[m.Alerta](m);
                        NotificacionModel.crear(
                            {
                                tipo: m.Alerta,
                                titulo,
                                mensaje,
                                idMesa: m.id_Mesas,
                                // Estas alertas las atiende el mesero; no corresponden
                                // al panel administrativo.
                                roles: String(ROL_MESERO)
                            },
                            (e) => {
                                if (e) console.error("[Notificaciones] Error creando aviso:", e.message);
                            }
                        );
                    });
            });
        });
    });
};

const iniciarRevisionMesas = () => {
    revisarMesas();
    setInterval(revisarMesas, INTERVALO_MS);
};

module.exports = { iniciarRevisionMesas };

const PedidoModel = require("../models/pedidoModel")

const ROL_MESERO = 1

const esMesero = req => !!req.usuario && req.usuario.rolId === ROL_MESERO

// El pedido debe tener mesero; y si quien actúa es mesero, debe ser el suyo.
const exigirPedidoTomado = (req, res, next) => {
    PedidoModel.findAsignacion(req.params.id, (err, rows) => {
        if (err) return res.status(500).json({ error: "Error interno del servidor" })
        if (rows.length === 0) return res.status(404).json({ message: "Pedido no encontrado" })

        const { idMesero, NombreMesero } = rows[0]

        if (!idMesero) {
            return res.status(409).json({
                codigo: "SIN_MESERO",
                message: "Debes tomar el pedido antes de continuar."
            })
        }

        if (esMesero(req) && Number(idMesero) !== Number(req.usuario.id)) {
            return res.status(403).json({
                codigo: "OTRO_MESERO",
                message: `Este pedido lo tiene ${NombreMesero}. Tómalo primero si vas a atenderlo tú.`
            })
        }

        next()
    })
}

// Solo al pasar a "preparando" (enviar a cocina). Cocina y entrega no se ven afectadas.
const soloAlEnviarACocina = (req, res, next) =>
    req.body?.estado === "preparando" ? exigirPedidoTomado(req, res, next) : next()

// Para rutas con authOpcional: el cliente anónimo pasa, el mesero debe tener el pedido tomado.
const soloSiEsMesero = (req, res, next) =>
    esMesero(req) ? exigirPedidoTomado(req, res, next) : next()

module.exports = { exigirPedidoTomado, soloAlEnviarACocina, soloSiEsMesero }
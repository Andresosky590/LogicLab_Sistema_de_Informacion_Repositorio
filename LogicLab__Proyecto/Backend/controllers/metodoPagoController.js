const MetodoPagoModel = require("../models/metodoPagoModel");

const MetodoPagoController = {

    // GET /api/metodo-pago/online
    getMetodosOnline: (req, res) => {
        MetodoPagoModel.findOnline((err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            res.status(200).json(results);
        });
    },

    // GET /api/metodo-pago/listar
    // Todos los métodos (para personal: pedido asistido, cierre de cuenta).
    getMetodos: (req, res) => {
        MetodoPagoModel.findAll((err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            res.status(200).json(results);
        });
    },

};

module.exports = MetodoPagoController;
const MesaModel = require("../models/mesaModel");

const MesaController = {

    getMesas: (req, res) => {
        MesaModel.findAll((err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            res.status(200).json(results);
        });
    },

    updateEstado: (req, res) => {
        const { id } = req.params;
        const { estado } = req.body;

        if (!estado) return res.status(400).json({ message: "El campo estado es obligatorio" });

        MesaModel.updateEstado(id, estado, (err) => {
            if (err) return res.status(500).json({ error: "Error al actualizar la mesa" });
            res.status(200).json({ message: "Estado de mesa actualizado" });
        });
    }
};

module.exports = MesaController;
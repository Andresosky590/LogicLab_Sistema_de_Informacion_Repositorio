const PqrsfModel = require("../models/PqrsfModel");

const PqrsfController = {

    // Público: el cliente lo consulta desde la mesa para llenar el <select>.
    getTipos: (req, res) => {
        PqrsfModel.getTipos((err, rows) => {
            if (err) { console.error("Error getTipos:", err); return res.status(500).json({ error: "Error interno" }); }
            res.status(200).json(rows);
        });
    },

    // Público: el cliente envía su PQRSF desde VistaCliente.
    crear: (req, res) => {
        const { id_TipoPQRSF, nombre, mensaje } = req.body;
        if (!id_TipoPQRSF) return res.status(400).json({ message: "El tipo de PQRSF es obligatorio" });
        if (!mensaje || !mensaje.trim()) return res.status(400).json({ message: "El mensaje es obligatorio" });

        PqrsfModel.crear({ id_TipoPQRSF, nombre: nombre?.trim() || "Anónimo", mensaje: mensaje.trim() }, (err) => {
            if (err) { console.error("Error crear PQRSF:", err); return res.status(500).json({ error: "Error al guardar" }); }
            res.status(201).json({ message: "PQRSF enviada correctamente" });
        });
    },

    // Protegido: el administrador lista todos los registros en el Home.
    listar: (req, res) => {
        PqrsfModel.listar((err, rows) => {
            if (err) { console.error("Error listar PQRSF:", err); return res.status(500).json({ error: "Error interno" }); }
            res.status(200).json(rows);
        });
    }
};

module.exports = PqrsfController;
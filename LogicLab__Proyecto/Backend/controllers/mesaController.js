const MesaModel = require("../models/mesaModel");

const MesaController = {

    // Público — pantalla "Elige tu mesa" (sin login). No expone QR_Token.
    getMesas: (req, res) => {
        MesaModel.findAll((err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            res.status(200).json(results);
        });
    },

    // GET /api/mesas/admin/listar  (solo admin)
    getMesasConQr: (req, res) => {
        MesaModel.findAllConToken((err, results) => {
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
    },

    // GET /api/mesas/qr/:token
    getMesaPorToken: (req, res) => {
        const { token } = req.params;

        MesaModel.findByToken(token, (err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            if (results.length === 0) {
                return res.status(404).json({ message: "Código QR no válido" });
            }
            res.status(200).json(results[0]);
        });
    },

    // PUT /api/mesas/:id/regenerar-qr  (solo admin)
    regenerarQr: (req, res) => {
        const { id } = req.params;

        MesaModel.regenerarToken(id, (err, result) => {
            if (err) return res.status(500).json({ error: "Error al regenerar el código QR" });
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Mesa no encontrada" });
            }
            res.status(200).json({ message: "Código QR regenerado correctamente" });
        });
    },

    // DELETE /api/mesas/:id  (solo admin) — borrado lógico
    desactivarMesa: (req, res) => {
        const { id } = req.params;
        MesaModel.desactivar(id, (err) => {
            if (err) return res.status(500).json({ error: "Error al desactivar la mesa" });
            res.status(200).json({ message: "Mesa desactivada correctamente" });
        });
    },

    // PUT /api/mesas/:id/reactivar  (solo admin)
    reactivarMesa: (req, res) => {
        const { id } = req.params;
        MesaModel.reactivar(id, (err) => {
            if (err) return res.status(500).json({ error: "Error al reactivar la mesa" });
            res.status(200).json({ message: "Mesa reactivada correctamente" });
        });
    }
};

module.exports = MesaController;
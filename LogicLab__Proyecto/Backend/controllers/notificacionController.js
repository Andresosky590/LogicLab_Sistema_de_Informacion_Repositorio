const NotificacionModel = require("../models/notificacionModel");

const NotificacionController = {

    // GET /api/notificaciones — las activas que le corresponden al rol del token
    listar: (req, res) => {
        if (Number(req.usuario.rolId) !== 1) {
            return res.status(403).json({
                message: "Estas alertas son exclusivas para meseros."
            });
        }

        NotificacionModel.findActivasPorRol(req.usuario.rolId, (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Error interno del servidor" });
            }
            res.status(200).json(rows);
        });
    },

    // PUT /api/notificaciones/:id/atender
    atender: (req, res) => {
        const { id } = req.params;

        if (Number(req.usuario.rolId) !== 1) {
            return res.status(403).json({
                message: "Estas alertas son exclusivas para meseros."
            });
        }

        NotificacionModel.atender(id, req.usuario.id, req.usuario.rolId, (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: "Error al marcar la notificación" });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: "La notificación no existe, ya fue atendida o no te corresponde."
                });
            }
            res.status(200).json({ message: "Notificación atendida" });
        });
    }
};

module.exports = NotificacionController;

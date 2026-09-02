const db = require("../config/db");

const PqrsfModel = {

    // Trae los tipos disponibles (Petición, Queja, Reclamo, Felicitación, Sugerencia)
    // para llenar el <select> del formulario del cliente.
    getTipos: (callback) => {
        db.query(
            `SELECT id_TipoPQRSF, TipoPQRSF, DescripcionTipo FROM tipopqrsf ORDER BY id_TipoPQRSF`,
            callback
        );
    },

    // Inserta un nuevo registro enviado por el cliente desde la mesa.
    crear: (datos, callback) => {
        db.query(
            `INSERT INTO registropqrsf (id_TipoPQRSF, Nombre, Mensaje, Fecha)
             VALUES (?, ?, ?, NOW())`,
            [datos.id_TipoPQRSF, datos.nombre || "Anónimo", datos.mensaje],
            callback
        );
    },

    // Lista todos los registros para la tabla del Home del administrador,
    // trayendo el nombre del tipo mediante el JOIN con tipopqrsf.
    listar: (callback) => {
        db.query(
            `SELECT r.id_Registro_PQRSF, t.TipoPQRSF, r.Nombre, r.Mensaje,
                    DATE_FORMAT(r.Fecha, '%d/%m/%Y %H:%i') AS Fecha
             FROM registropqrsf r
             JOIN tipopqrsf t ON r.id_TipoPQRSF = t.id_TipoPQRSF
             ORDER BY r.Fecha DESC`,
            callback
        );
    }
};

module.exports = PqrsfModel;
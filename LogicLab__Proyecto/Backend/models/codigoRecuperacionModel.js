const db = require("../config/db");

// Códigos temporales de recuperación de contraseña.
// La tabla tiene UN solo registro por usuario (id_Usuarios_Restaurante es
// UNIQUE): al pedir un código nuevo se reemplaza el anterior, así que solo
// el último código solicitado es válido.
//
// Las fechas se calculan con NOW() de MySQL (no con Date de Node) para que
// la vigencia no dependa de la zona horaria del servidor Node.
const CodigoRecuperacionModel = {

    guardar: (idUsuario, codigoHash, minutosVigencia, callback) => {
        const query = `
            INSERT INTO codigos_recuperacion (id_Usuarios_Restaurante, Codigo_hash, Expiracion)
            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))
            ON DUPLICATE KEY UPDATE
                Codigo_hash = VALUES(Codigo_hash),
                Expiracion  = VALUES(Expiracion),
                Intentos    = 0,
                Creado_en   = NOW()
        `;
        db.query(query, [idUsuario, codigoHash, minutosVigencia], callback);
    },

    // Vigente: 1 si aún no expira. Segundos: tiempo desde que se generó.
    findByUsuario: (idUsuario, callback) => {
        const query = `
            SELECT id_Codigo, Codigo_hash, Intentos,
                   Expiracion > NOW() AS Vigente,
                   TIMESTAMPDIFF(SECOND, Creado_en, NOW()) AS Segundos
            FROM codigos_recuperacion
            WHERE id_Usuarios_Restaurante = ?
        `;
        db.query(query, [idUsuario], callback);
    },

    sumarIntento: (idCodigo, callback) => {
        const query = `
            UPDATE codigos_recuperacion
            SET Intentos = Intentos + 1
            WHERE id_Codigo = ?
        `;
        db.query(query, [idCodigo], callback);
    },

    eliminarPorUsuario: (idUsuario, callback) => {
        const query = `
            DELETE FROM codigos_recuperacion
            WHERE id_Usuarios_Restaurante = ?
        `;
        db.query(query, [idUsuario], callback);
    }
};

module.exports = CodigoRecuperacionModel;

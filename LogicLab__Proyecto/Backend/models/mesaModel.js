const db = require("../config/db");

const MesaModel = {

    // Listado público — lo usa la pantalla de "Elige tu mesa" sin login.
    // Solo mesas activas, y NUNCA incluye el QR_Token aquí.
    findAll: (callback) => {
        const query = `
            SELECT id_Mesas, Numero_mesa, Estado
            FROM Mesas
            WHERE Activo = 1
            ORDER BY Numero_mesa
        `;
        db.query(query, callback);
    },

    // Listado solo para admin — sí incluye el QR_Token, para generar las
    // imágenes de QR que se imprimen y se pegan en cada mesa física.
    // Solo mesas activas.
    findAllConToken: (callback) => {
        const query = `
            SELECT id_Mesas, Numero_mesa, Estado, QR_Token
            FROM Mesas
            WHERE Activo = 1
            ORDER BY Numero_mesa
        `;
        db.query(query, callback);
    },

    updateEstado: (id, estado, callback) => {
        const query = `
            UPDATE Mesas SET Estado = ?
            WHERE id_Mesas = ?
        `;
        db.query(query, [estado, id], callback);
    },

    // Resuelve el token que trae el QR escaneado a los datos reales de la mesa.
    // Solo mesas activas (una mesa desactivada no debe recibir pedidos).
    findByToken: (token, callback) => {
        const query = `
            SELECT id_Mesas, Numero_mesa, Estado
            FROM Mesas
            WHERE QR_Token = ? AND Activo = 1
        `;
        db.query(query, [token], callback);
    },

    // Por si algún QR se pierde/daña o se quiere invalidar el anterior
    regenerarToken: (id, callback) => {
        const query = `
            UPDATE Mesas SET QR_Token = UUID()
            WHERE id_Mesas = ?
        `;
        db.query(query, [id], callback);
    },

    // Borrado lógico — si se retira una mesa física del restaurante,
    // se desactiva en vez de borrarla (conserva el historial de pedidos).
    desactivar: (id, callback) => {
        const query = `UPDATE Mesas SET Activo = 0 WHERE id_Mesas = ?`;
        db.query(query, [id], callback);
    },

    reactivar: (id, callback) => {
        const query = `UPDATE Mesas SET Activo = 1 WHERE id_Mesas = ?`;
        db.query(query, [id], callback);
    }
}

module.exports = MesaModel;
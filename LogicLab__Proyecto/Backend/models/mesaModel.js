const db = require("../config/db");

const MesaModel = {

    findAll: (callback) => {
        const query = `
            SELECT id_Mesas, Numero_mesa, Estado
            FROM Mesas
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
    }
}

module.exports = MesaModel;
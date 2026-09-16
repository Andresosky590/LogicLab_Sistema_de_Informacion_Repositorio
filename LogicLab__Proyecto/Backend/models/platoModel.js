const db = require("../config/db");

const PlatoModel = {

    findAll: (callback) => {
        const query = `
            SELECT id_Platos, NombrePlato, Precio, Descripcion, id_Categoria, Disponible
            FROM Platos
            ORDER BY id_Platos
        `;
        db.query(query, callback);
    },

    // Solo categorías activas (para elegir al crear/editar un plato)
    findAllCategorias: (callback) => {
        const query = `
            SELECT id_Categoria, NombreCategoria
            FROM Categoria
            WHERE Activo = 1
        `;
        db.query(query, callback);
    },

    create: (datos, callback) => {
        const query = `
            INSERT INTO Platos (NombrePlato, Descripcion, Precio, id_Categoria, Disponible)
            VALUES (?, ?, ?, ?, ?)
        `;
        const disponible = datos.disponible === undefined ? 1 : (datos.disponible ? 1 : 0);
        db.query(query, [datos.nombre, datos.descripcion, datos.precio, datos.id_Categoria, disponible], callback);
    },

    remove: (id, callback) => {
        db.query(`DELETE FROM Platos WHERE id_Platos = ?`, [id], callback);
    },

    update: (id, datos, callback) => {
        const query = `
            UPDATE Platos
            SET Descripcion = ?, Precio = ?
            WHERE id_Platos = ?
        `;
        db.query(query, [datos.descripcion, datos.precio, id], callback);
    },

    updateDisponibilidad: (id, disponible, callback) => {
        const query = `
            UPDATE Platos
            SET Disponible = ?
            WHERE id_Platos = ?
        `;
        db.query(query, [disponible ? 1 : 0, id], callback);
    },

    // Borrado lógico de categoría (los platos que ya la usan no se ven afectados)
    desactivarCategoria: (id, callback) => {
        db.query(`UPDATE Categoria SET Activo = 0 WHERE id_Categoria = ?`, [id], callback);
    },

    reactivarCategoria: (id, callback) => {
        db.query(`UPDATE Categoria SET Activo = 1 WHERE id_Categoria = ?`, [id], callback);
    }
}
module.exports = PlatoModel;
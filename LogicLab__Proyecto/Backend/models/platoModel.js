const db = require("../config/db");

const PlatoModel = {

    findAll: (callback) => {
        const query = `
            SELECT id_Platos, NombrePlato, Precio, Descripcion, id_Categoria
            FROM Platos
            ORDER BY id_Platos
        `;
        db.query(query, callback);
    },

    findAllCategorias: (callback) => {
        const query = `SELECT id_Categoria, NombreCategoria FROM Categoria`;
        db.query(query, callback);
    },

    create: (datos, callback) => {
    const query = `
        INSERT INTO Platos (NombrePlato, Descripcion, Precio, id_Categoria)
        VALUES (?, ?, ?, ?)
    `;
    db.query(query, [datos.nombre, datos.descripcion, datos.precio, datos.id_Categoria], callback);
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
    }
}
module.exports = PlatoModel;
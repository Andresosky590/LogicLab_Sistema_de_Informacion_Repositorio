const db = require("../config/db");

const UserModel = {

    // Solo trae usuarios ACTIVOS (listado normal de personal)
    findAll: (callback) => {
        const query = `
            SELECT id_Usuarios_Restaurante, Nombre, Apellido, Email, id_Roles_Usuarios, Activo
            FROM usuarios_restaurante
            WHERE Activo = 1
        `;
        db.query(query, callback);
    },

    // Trae TODOS, activos e inactivos — para el admin, historial/auditoría
    findAllConInactivos: (callback) => {
        const query = `
            SELECT id_Usuarios_Restaurante, Nombre, Apellido, Email, id_Roles_Usuarios, Activo
            FROM usuarios_restaurante
        `;
        db.query(query, callback);
    },

    findById: (id, callback) => {
        const query = `
            SELECT id_Usuarios_Restaurante, Nombre, Apellido, Email, id_Roles_Usuarios, Activo
            FROM usuarios_restaurante
            WHERE id_Usuarios_Restaurante = ?
        `;
        db.query(query, [id], callback);
    },

    findByEmail: (email, callback) => {
        const query = `
            SELECT id_Usuarios_Restaurante, Nombre, Apellido, Email, Contraseña_hash, id_Roles_Usuarios, Activo
            FROM usuarios_restaurante
            WHERE Email = ?
        `;
        db.query(query, [email], callback);
    },

    create: (userData, callback) => {
        const query = `
            INSERT INTO usuarios_restaurante 
                (Nombre, Apellido, Email, Contraseña_hash, id_Tipo_Documento, id_Roles_Usuarios)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const valores = [
            userData.nombre,
            userData.apellido,
            userData.email,
            userData.hashedPassword,
            userData.tipoDocId,
            userData.rolId
        ];
        db.query(query, valores, callback);
    },

    // Actualiza sin tocar la contraseña
    update: (id, campos, callback) => {
        const query = `
            UPDATE usuarios_restaurante
            SET Nombre = ?, Apellido = ?, Email = ?, id_Roles_Usuarios = ?
            WHERE id_Usuarios_Restaurante = ?
        `;
        const valores = [campos.nombre, campos.apellido, campos.email, campos.rolId, id];
        db.query(query, valores, callback);
    },

    // FIX: actualiza incluyendo nueva contraseña hasheada
    updateConPassword: (id, campos, callback) => {
        const query = `
            UPDATE usuarios_restaurante
            SET Nombre = ?, Apellido = ?, Email = ?, id_Roles_Usuarios = ?, Contraseña_hash = ?
            WHERE id_Usuarios_Restaurante = ?
        `;
        const valores = [campos.nombre, campos.apellido, campos.email, campos.rolId, campos.hashedPassword, id];
        db.query(query, valores, callback);
    },

    // Antes hacía DELETE físico. Ahora es un borrado lógico: se conserva
    // el registro (y todo su historial de pedidos) pero queda inactivo
    // y ya no puede iniciar sesión.
    delete: (id, callback) => {
        const query = `
            UPDATE usuarios_restaurante
            SET Activo = 0
            WHERE id_Usuarios_Restaurante = ?
        `;
        db.query(query, [id], callback);
    },

    // Por si un empleado vuelve a trabajar en el restaurante
    reactivar: (id, callback) => {
        const query = `
            UPDATE usuarios_restaurante
            SET Activo = 1
            WHERE id_Usuarios_Restaurante = ?
        `;
        db.query(query, [id], callback);
    }
};

module.exports = UserModel;
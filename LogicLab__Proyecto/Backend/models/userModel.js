const db = require("../config/db");

// Columnas que se devuelven al frontend (nunca la contraseña)
const CAMPOS = `id_Usuarios_Restaurante, Nombre, Apellido, Email, id_Tipo_Documento,
                Numero_Documento, id_Roles_Usuarios, Estado, Fecha_Registro`;

const UserModel = {

    // Personal activo (listado normal del admin)
    findAll: (callback) => {
        db.query(`SELECT ${CAMPOS} FROM usuarios_restaurante WHERE Estado = 'activo'`, callback);
    },

    // Activos e inactivos (sin las solicitudes pendientes) — para reactivar
    findAllConInactivos: (callback) => {
        db.query(`SELECT ${CAMPOS} FROM usuarios_restaurante WHERE Estado <> 'pendiente'`, callback);
    },

    // Solicitudes de registro esperando aprobación, la más antigua primero
    findPendientes: (callback) => {
        db.query(
            `SELECT ${CAMPOS} FROM usuarios_restaurante
             WHERE Estado = 'pendiente'
             ORDER BY Fecha_Registro ASC`,
            callback
        );
    },

    findById: (id, callback) => {
        db.query(`SELECT ${CAMPOS} FROM usuarios_restaurante WHERE id_Usuarios_Restaurante = ?`, [id], callback);
    },

    // La única consulta que trae el hash (la usan el login y la recuperación)
    findByEmail: (email, callback) => {
        db.query(
            `SELECT ${CAMPOS}, Contraseña_hash FROM usuarios_restaurante WHERE Email = ?`,
            [email],
            callback
        );
    },

    // estado: 'activo' cuando lo crea el admin, 'pendiente' cuando es una solicitud
    create: (userData, estado, callback) => {
        const query = `
            INSERT INTO usuarios_restaurante
                (Nombre, Apellido, Email, Contraseña_hash, id_Tipo_Documento,
                 Numero_Documento, id_Roles_Usuarios, Estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const valores = [
            userData.nombre,
            userData.apellido,
            userData.email,
            userData.hashedPassword,
            userData.tipoDocId,
            userData.numeroDocumento || null,
            userData.rolId,
            estado
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
        db.query(query, [campos.nombre, campos.apellido, campos.email, campos.rolId, id], callback);
    },

    // Actualiza incluyendo la nueva contraseña hasheada
    updateConPassword: (id, campos, callback) => {
        const query = `
            UPDATE usuarios_restaurante
            SET Nombre = ?, Apellido = ?, Email = ?, id_Roles_Usuarios = ?, Contraseña_hash = ?
            WHERE id_Usuarios_Restaurante = ?
        `;
        const valores = [campos.nombre, campos.apellido, campos.email, campos.rolId, campos.hashedPassword, id];
        db.query(query, valores, callback);
    },

    // Borrado lógico: se conserva el registro y su historial de pedidos,
    // pero ya no puede iniciar sesión.
    delete: (id, callback) => {
        db.query(
            `UPDATE usuarios_restaurante SET Estado = 'inactivo'
             WHERE id_Usuarios_Restaurante = ? AND Estado = 'activo'`,
            [id],
            callback
        );
    },

    // Por si un empleado vuelve a trabajar en el restaurante
    reactivar: (id, callback) => {
        db.query(
            `UPDATE usuarios_restaurante SET Estado = 'activo'
             WHERE id_Usuarios_Restaurante = ? AND Estado = 'inactivo'`,
            [id],
            callback
        );
    },

    // Aprueba una solicitud: pasa a activo con el rol que confirme el admin
    aprobar: (id, rolId, callback) => {
        db.query(
            `UPDATE usuarios_restaurante SET Estado = 'activo', id_Roles_Usuarios = ?
             WHERE id_Usuarios_Restaurante = ? AND Estado = 'pendiente'`,
            [rolId, id],
            callback
        );
    },

    // Descarta una solicitud: se borra de verdad. Solo aplica a pendientes,
    // que nunca han iniciado sesión ni tienen pedidos asociados.
    descartar: (id, callback) => {
        db.query(
            `DELETE FROM usuarios_restaurante
             WHERE id_Usuarios_Restaurante = ? AND Estado = 'pendiente'`,
            [id],
            callback
        );
    },

    // Solo cambia la contraseña (la usa la recuperación de contraseña)
    updatePassword: (id, hashedPassword, callback) => {
        db.query(
            `UPDATE usuarios_restaurante SET Contraseña_hash = ? WHERE id_Usuarios_Restaurante = ?`,
            [hashedPassword, id],
            callback
        );
    },

    // Tipos de documento que se pueden elegir en el formulario de registro
    tiposDocumentoActivos: (callback) => {
        db.query(
            `SELECT id_Tipo_Documento, Descripcion_Documento
             FROM tipo_documento WHERE Activo = 1
             ORDER BY id_Tipo_Documento`,
            callback
        );
    }
};

module.exports = UserModel;
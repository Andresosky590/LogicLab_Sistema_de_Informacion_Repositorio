const db = require("../config/db");

const NotificacionModel = {

    crear: ({ tipo, titulo, mensaje, idMesa, roles }, callback) => {
        const query = `
            INSERT    INTO notificaciones (Tipo, Titulo, Mensaje, id_Mesas, Roles)
            VALUES (?, ?, ?, ?, ?)
        `;
        db.query(query, [tipo, titulo, mensaje, idMesa || null, roles], callback);
    },

    // Activas que le corresponden a un rol (el rol sale del token).
    findActivasPorRol: (rolId, callback) => {
        const query = `
            SELECT
                n.id_Notificaciones,
                n.Tipo,
                n.Titulo,
                n.Mensaje,
                n.id_Mesas,
                m.Numero_mesa,
                n.FechaCreacion,
                TIMESTAMPDIFF(MINUTE, n.FechaCreacion, NOW()) AS MinutosDesde
               FROM notificaciones n
            LEFT    JOIN mesas m ON m.id_Mesas = n.id_Mesas
            WHERE n.Estado = 'activa'
              AND FIND_IN_SET(?, n.Roles)
            ORDER BY n.FechaCreacion DESC
            LIMIT 50
        `;
        db.query(query, [rolId], callback);
    },

    // Notificaciones (de cualquier estado) creadas durante la sesión
    // actual de cada mesa ocupada — sirve para no repetir una alerta
    // que ya se creó o que el personal ya marcó como atendida.
    findDeSesionActual: (callback) => {
        const query = `
            SELECT n.id_Notificaciones, n.id_Mesas, n.Tipo, n.Estado
               FROM notificaciones n
               JOIN mesas m ON m.id_Mesas = n.id_Mesas
            WHERE m.Estado = 'ocupada'
              AND n.FechaCreacion >= COALESCE(m.OcupadaDesde, '1970-01-01 00:00:00')
        `;
        db.query(query, callback);
    },

    // El sistema las cierra cuando la situación ya no aplica.
    resolver: (ids, callback) => {
        const query = `
               UPDATE notificaciones
            SET Estado = 'resuelta', FechaCierre = NOW()
            WHERE Estado = 'activa' AND id_Notificaciones IN (?)
        `;
        db.query(query, [ids], callback);
    },

    // Si la mesa ya no está ocupada (la liberaron), sus avisos activos sobran.
    resolverDeMesasLibres: (callback) => {
        const query = `
               UPDATE notificaciones n
               JOIN mesas m ON m.id_Mesas = n.id_Mesas
            SET n.Estado = 'resuelta', n.FechaCierre = NOW()
            WHERE n.Estado = 'activa' AND m.Estado <> 'ocupada'
        `;
        db.query(query, callback);
    },

    // El personal la marca como atendida (solo si le corresponde a su rol).
    atender: (id, idUsuario, rolId, callback) => {
        const query = `
               UPDATE notificaciones
            SET Estado = 'atendida',
                FechaCierre = NOW(),
                id_Usuarios_Restaurante = ?
            WHERE id_Notificaciones = ?
              AND Estado = 'activa'
              AND FIND_IN_SET(?, Roles)
        `;
        db.query(query, [idUsuario, id, rolId], callback);
    }
};

module.exports = NotificacionModel;
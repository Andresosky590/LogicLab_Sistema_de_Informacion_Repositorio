const db = require("../config/db");

const MesaModel = {

    // Listado público — lo usa la pantalla de "Elige tu mesa" sin login.
    // Solo mesas activas, y NUNCA incluye el QR_Token aquí.
    findAll: (callback) => {
        const query = `
            SELECT id_Mesas, Numero_mesa, Estado
               FROM mesas
            WHERE Activo = 1
            ORDER BY Numero_mesa
        `;
        db.query(query, callback);
    },

    // Listado solo para admin — sí incluye el QR_Token.
    findAllConToken: (callback) => {
        const query = `
            SELECT id_Mesas, Numero_mesa, Estado, QR_Token
               FROM mesas
            WHERE Activo = 1
            ORDER BY Numero_mesa
        `;
        db.query(query, callback);
    },

    // Al ocupar guarda desde cuándo (sin pisarlo si ya estaba ocupada);
    // al liberar limpia desde cuándo y cuántas personas.
    updateEstado: (id, estado, callback) => {
        const query = `
               UPDATE mesas
            SET
                Estado = ?,
                OcupadaDesde = CASE
                    WHEN ? = 'ocupada' THEN COALESCE(OcupadaDesde, NOW())
                    ELSE NULL
                END,
                Personas = CASE
                    WHEN ? = 'ocupada' THEN Personas
                    ELSE NULL
                END
            WHERE id_Mesas = ?
        `;
        db.query(query, [estado, estado, estado, id], callback);
    },

    setPersonas: (id, personas, callback) => {
        const query = `   UPDATE mesas SET Personas = ? WHERE id_Mesas = ?`;
        db.query(query, [personas, id], callback);
    },

    // Mesas ocupadas con lo que pasó en la SESIÓN ACTUAL (pedidos creados
    // desde que se ocupó; el margen de 1 minuto cubre el pedido asistido,
    // que crea el pedido justo antes de marcar la mesa como ocupada).
    findOcupadasConActividad: (callback) => {
        const query = `
            SELECT
                m.id_Mesas,
                m.Numero_mesa,
                m.Personas,
                m.OcupadaDesde,
                TIMESTAMPDIFF(MINUTE, m.OcupadaDesde, NOW()) AS MinutosOcupada,
                TIMESTAMPDIFF(MINUTE, MAX(p.FechaEntrega), NOW()) AS MinutosDesdeEntrega,
                SUM(CASE WHEN ep.NombreEstado <> 'cancelado' THEN 1 ELSE 0 END)
                    AS PedidosValidos,
                SUM(CASE WHEN ep.NombreEstado IN ('pendiente', 'preparando', 'listo')
                         THEN 1 ELSE 0 END) AS PedidosEnCurso,
                SUM(CASE WHEN ep.NombreEstado = 'entregado' AND p.EstadoPago <> 'aprobado'
                         THEN 1 ELSE 0 END) AS EntregadosSinPagar
               FROM mesas m
            LEFT    JOIN mesas_pedidos mp
                ON mp.id_Mesas = m.id_Mesas
            LEFT    JOIN pedidos p
                ON p.id_Pedidos = mp.id_Pedidos
               AND p.Fecha_Pedido >= DATE_SUB(
                       COALESCE(m.OcupadaDesde, '1970-01-01 00:00:00'),
                       INTERVAL 1 MINUTE)
            LEFT JOIN estados_pedido ep
                ON ep.id_Estado = p.id_Estado
            WHERE m.Activo = 1
              AND m.Estado = 'ocupada'
            GROUP BY m.id_Mesas
            ORDER BY m.Numero_mesa
        `;
        db.query(query, callback);
    },

    // Resuelve el token que trae el QR escaneado a los datos reales de la mesa.
    findByToken: (token, callback) => {
        const query = `
            SELECT id_Mesas, Numero_mesa, Estado
               FROM mesas
            WHERE QR_Token = ? AND Activo = 1
        `;
        db.query(query, [token], callback);
    },

    regenerarToken: (id, callback) => {
        const query = `
               UPDATE mesas SET QR_Token = UUID()
            WHERE id_Mesas = ?
        `;
        db.query(query, [id], callback);
    },

    desactivar: (id, callback) => {
        const query = `   UPDATE mesas SET Activo = 0 WHERE id_Mesas = ?`;
        db.query(query, [id], callback);
    },

    reactivar: (id, callback) => {
        const query = `   UPDATE mesas SET Activo = 1 WHERE id_Mesas = ?`;
        db.query(query, [id], callback);
    }
}

module.exports = MesaModel;
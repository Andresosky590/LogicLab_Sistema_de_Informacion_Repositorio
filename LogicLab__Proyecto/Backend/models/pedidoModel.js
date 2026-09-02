const db = require("../config/db");

const PedidoModel = {

    create: (datos, callback) => {
        const query = `
            INSERT INTO Pedidos 
                (Fecha_Pedido, EstadoPedido, TotalPagar, id_Usuarios_Restaurante)
            VALUES (NOW(), 'pendiente', ?, ?)
        `;
        db.query(query, [datos.totalPagar, datos.idUsuario], callback);
    },

    findAll: (callback) => {
        const query = `
            SELECT p.id_Pedidos, p.Fecha_Pedido, p.EstadoPedido, p.TotalPagar,
                   p.MetodoPago, p.MotivoCancelacion,
                   m.Numero_mesa,
                   u.Nombre AS NombreMesero
            FROM Pedidos p
            LEFT JOIN Mesas_Pedidos mp ON mp.id_Pedidos = p.id_Pedidos
            LEFT JOIN Mesas m ON m.id_Mesas = mp.id_Mesas
            LEFT JOIN Usuarios_Restaurante u ON u.id_Usuarios_Restaurante = p.id_Usuarios_Restaurante
            ORDER BY p.Fecha_Pedido DESC
        `;
        db.query(query, callback);
    },

    findByEstado: (estado, callback) => {
        const query = `
            SELECT p.id_Pedidos, p.Fecha_Pedido, p.EstadoPedido, p.TotalPagar,
                   p.MetodoPago, m.Numero_mesa,
                   u.Nombre AS NombreMesero
            FROM Pedidos p
            LEFT JOIN Mesas_Pedidos mp ON mp.id_Pedidos = p.id_Pedidos
            LEFT JOIN Mesas m ON m.id_Mesas = mp.id_Mesas
            LEFT JOIN Usuarios_Restaurante u ON u.id_Usuarios_Restaurante = p.id_Usuarios_Restaurante
            WHERE p.EstadoPedido = ?
            ORDER BY p.Fecha_Pedido ASC
        `;
        db.query(query, [estado], callback);
    },

    findByMesa: (numeroMesa, callback) => {
        const query = `
            SELECT p.id_Pedidos, p.Fecha_Pedido, p.EstadoPedido, p.TotalPagar,
                   p.MetodoPago, m.Numero_mesa
            FROM Pedidos p
            INNER JOIN Mesas_Pedidos mp ON mp.id_Pedidos = p.id_Pedidos
            INNER JOIN Mesas m ON m.id_Mesas = mp.id_Mesas
            WHERE m.Numero_mesa = ?
            AND p.EstadoPedido NOT IN ('cancelado')
            ORDER BY p.Fecha_Pedido ASC
        `;
        db.query(query, [numeroMesa], callback);
    },

    findByMesero: (idUsuario, callback) => {
    const query = `
        SELECT p.id_Pedidos, p.Fecha_Pedido, p.EstadoPedido,
               p.TotalPagar, p.MetodoPago,
               m.Numero_mesa
        FROM Pedidos p
        LEFT JOIN Mesas_Pedidos mp ON mp.id_Pedidos = p.id_Pedidos
        LEFT JOIN Mesas m          ON m.id_Mesas    = mp.id_Mesas
        WHERE p.id_Usuarios_Restaurante = ?
        ORDER BY p.Fecha_Pedido DESC
        LIMIT 100
    `;
    db.query(query, [idUsuario], callback);
    },

    findById: (id, callback) => {
        const query = `
            SELECT p.id_Pedidos, p.Fecha_Pedido, p.EstadoPedido, p.TotalPagar,
                   p.MetodoPago, p.MotivoCancelacion, m.Numero_mesa
            FROM Pedidos p
            LEFT JOIN Mesas_Pedidos mp ON mp.id_Pedidos = p.id_Pedidos
            LEFT JOIN Mesas m ON m.id_Mesas = mp.id_Mesas
            WHERE p.id_Pedidos = ?
        `;
        db.query(query, [id], callback);
    },

    updateEstado: (id, estado, callback) => {
        const query = `
            UPDATE Pedidos SET EstadoPedido = ?
            WHERE id_Pedidos = ?
        `;
        db.query(query, [estado, id], callback);
    },

    // Asigna el "dominio" del pedido a un mesero. Cualquier mesero puede
    // tomarlo o transferírselo a sí mismo en cualquier momento (reemplaza
    // al mesero anterior si ya había uno asignado).
    asignarMesero: (idPedido, idUsuario, callback) => {
        const query = `
            UPDATE Pedidos SET id_Usuarios_Restaurante = ?
            WHERE id_Pedidos = ?
        `;
        db.query(query, [idUsuario, idPedido], callback);
    },

    updateTotal: (id, total, callback) => {
    const query = `
        UPDATE Pedidos SET TotalPagar = ?
        WHERE id_Pedidos = ?
    `;
    db.query(query, [total, id], callback);
},

cancelar: (id, motivo, callback) => {
        const query = `
            UPDATE Pedidos 
            SET EstadoPedido = 'cancelado', MotivoCancelacion = ?
            WHERE id_Pedidos = ? AND EstadoPedido IN ('pendiente', 'preparando')
        `; 
        db.query(query, [motivo, id], callback);
    },

    cerrarCuenta: (id, metodoPago, callback) => {
        const query = `
            UPDATE Pedidos
            SET EstadoPedido = 'entregado', MetodoPago = ?
            WHERE id_Pedidos = ?
        `;
        db.query(query, [metodoPago, id], callback);
    },

    vincularMesa: (idPedido, idMesa, callback) => {
        const query = `
            INSERT INTO Mesas_Pedidos (id_Mesas, id_Pedidos)
            VALUES (?, ?)
        `;
        db.query(query, [idMesa, idPedido], callback);
    }
};



module.exports = PedidoModel;
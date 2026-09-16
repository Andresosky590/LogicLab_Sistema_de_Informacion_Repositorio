const db = require("../config/db");

const PedidoModel = {

    create: (datos, callback) => {
        const query = `
            INSERT INTO Pedidos
                (Fecha_Pedido, id_Estado, TotalPagar, id_Usuarios_Restaurante)
            VALUES (NOW(), (SELECT id_Estado FROM estados_pedido WHERE NombreEstado = 'pendiente'), ?, ?)
        `;
        db.query(query, [datos.totalPagar, datos.idUsuario], callback);
    },

    findAll: (callback) => {
        const query = `
            SELECT p.id_Pedidos, p.Fecha_Pedido, ep.NombreEstado AS EstadoPedido, p.TotalPagar,
                   mp.NombreMetodo AS MetodoPago, p.MotivoCancelacion,
                   m.Numero_mesa,
                   u.Nombre AS NombreMesero
            FROM Pedidos p
            JOIN estados_pedido ep ON ep.id_Estado = p.id_Estado
            LEFT JOIN metodo_pago mp ON mp.id_MetodoPago = p.id_MetodoPago
            LEFT JOIN Mesas_Pedidos mpx ON mpx.id_Pedidos = p.id_Pedidos
            LEFT JOIN Mesas m ON m.id_Mesas = mpx.id_Mesas
            LEFT JOIN Usuarios_Restaurante u ON u.id_Usuarios_Restaurante = p.id_Usuarios_Restaurante
            ORDER BY p.Fecha_Pedido DESC
        `;
        db.query(query, callback);
    },

    findByEstado: (estado, callback) => {
        const query = `
            SELECT p.id_Pedidos, p.Fecha_Pedido, ep.NombreEstado AS EstadoPedido, p.TotalPagar,
                   mp.NombreMetodo AS MetodoPago, m.Numero_mesa,
                   u.Nombre AS NombreMesero
            FROM Pedidos p
            JOIN estados_pedido ep ON ep.id_Estado = p.id_Estado
            LEFT JOIN metodo_pago mp ON mp.id_MetodoPago = p.id_MetodoPago
            LEFT JOIN Mesas_Pedidos mpx ON mpx.id_Pedidos = p.id_Pedidos
            LEFT JOIN Mesas m ON m.id_Mesas = mpx.id_Mesas
            LEFT JOIN Usuarios_Restaurante u ON u.id_Usuarios_Restaurante = p.id_Usuarios_Restaurante
            WHERE ep.NombreEstado = ?
            ORDER BY p.Fecha_Pedido ASC
        `;
        db.query(query, [estado], callback);
    },

    findByMesa: (numeroMesa, callback) => {
        const query = `
            SELECT p.id_Pedidos, p.Fecha_Pedido, ep.NombreEstado AS EstadoPedido, p.TotalPagar,
                   mp.NombreMetodo AS MetodoPago, m.Numero_mesa
            FROM Pedidos p
            JOIN estados_pedido ep ON ep.id_Estado = p.id_Estado
            LEFT JOIN metodo_pago mp ON mp.id_MetodoPago = p.id_MetodoPago
            INNER JOIN Mesas_Pedidos mpx ON mpx.id_Pedidos = p.id_Pedidos
            INNER JOIN Mesas m ON m.id_Mesas = mpx.id_Mesas
            WHERE m.Numero_mesa = ?
            AND ep.NombreEstado NOT IN ('cancelado')
            ORDER BY p.Fecha_Pedido ASC
        `;
        db.query(query, [numeroMesa], callback);
    },

    findByMesero: (idUsuario, callback) => {
        const query = `
            SELECT p.id_Pedidos, p.Fecha_Pedido, ep.NombreEstado AS EstadoPedido,
                   p.TotalPagar, mp.NombreMetodo AS MetodoPago,
                   m.Numero_mesa
            FROM Pedidos p
            JOIN estados_pedido ep ON ep.id_Estado = p.id_Estado
            LEFT JOIN metodo_pago mp ON mp.id_MetodoPago = p.id_MetodoPago
            LEFT JOIN Mesas_Pedidos mpx ON mpx.id_Pedidos = p.id_Pedidos
            LEFT JOIN Mesas m           ON m.id_Mesas    = mpx.id_Mesas
            WHERE p.id_Usuarios_Restaurante = ?
            ORDER BY p.Fecha_Pedido DESC
            LIMIT 100
        `;
        db.query(query, [idUsuario], callback);
    },

    findById: (id, callback) => {
        const query = `
            SELECT p.id_Pedidos, p.Fecha_Pedido, ep.NombreEstado AS EstadoPedido, p.TotalPagar,
                   mp.NombreMetodo AS MetodoPago, p.MotivoCancelacion, m.Numero_mesa
            FROM Pedidos p
            JOIN estados_pedido ep ON ep.id_Estado = p.id_Estado
            LEFT JOIN metodo_pago mp ON mp.id_MetodoPago = p.id_MetodoPago
            LEFT JOIN Mesas_Pedidos mpx ON mpx.id_Pedidos = p.id_Pedidos
            LEFT JOIN Mesas m ON m.id_Mesas = mpx.id_Mesas
            WHERE p.id_Pedidos = ?
        `;
        db.query(query, [id], callback);
    },

    updateEstado: (id, estado, callback) => {
        const query = `
            UPDATE Pedidos
            SET id_Estado = (SELECT id_Estado FROM estados_pedido WHERE NombreEstado = ?)
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
            SET id_Estado = (SELECT id_Estado FROM estados_pedido WHERE NombreEstado = 'cancelado'),
                MotivoCancelacion = ?
            WHERE id_Pedidos = ?
            AND id_Estado IN (
                SELECT id_Estado FROM estados_pedido WHERE NombreEstado IN ('pendiente', 'preparando')
            )
        `;
        db.query(query, [motivo, id], callback);
    },

    cerrarCuenta: (id, metodoPago, callback) => {
        const query = `
            UPDATE Pedidos
            SET id_Estado = (SELECT id_Estado FROM estados_pedido WHERE NombreEstado = 'entregado'),
                id_MetodoPago = (SELECT id_MetodoPago FROM metodo_pago WHERE NombreMetodo = ?)
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
const db = require("../config/db");

const DetalleModel = {

    // Crear un detalle (un ítem del pedido)
    create: (datos, callback) => {
        const query = `
            INSERT INTO Detalle_Pedidos 
                (CantidadPedido, NombrePlato, NotasEspeciales, PrecioFinal, id_Pedidos, id_Platos, id_Categoria)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const valores = [
            datos.cantidadPedido,
            datos.nombrePlato,
            datos.notasEspeciales || null,
            datos.precioFinal,
            datos.idPedido,
            datos.idPlato,
            datos.idCategoria
        ];
        db.query(query, valores, callback);
    },

    // Obtener todos los detalles de un pedido
    findByPedido: (idPedido, callback) => {
        const query = `
            SELECT dp.id_Detalle_Pedidos, dp.CantidadPedido, dp.NombrePlato,
                   dp.NotasEspeciales, dp.PrecioFinal, dp.id_Platos,
                   dp.id_Categoria, c.NombreCategoria
            FROM Detalle_Pedidos dp
            LEFT JOIN Categoria c ON c.id_Categoria = dp.id_Categoria
            WHERE dp.id_Pedidos = ?
        `;
        db.query(query, [idPedido], callback);
    },

    // Obtener detalles de varios pedidos (para vista mesero/cocinero)
    findByPedidos: (idsPedidos, callback) => {
        const query = `
            SELECT dp.id_Detalle_Pedidos, dp.CantidadPedido, dp.NombrePlato,
                   dp.NotasEspeciales, dp.PrecioFinal, dp.id_Pedidos,
                   dp.id_Categoria, dp.id_Platos, c.NombreCategoria
            FROM Detalle_Pedidos dp
            LEFT JOIN Categoria c ON c.id_Categoria = dp.id_Categoria
            WHERE dp.id_Pedidos IN (?)
        `;
        db.query(query, [idsPedidos], callback);
    },

    // Eliminar todos los detalles de un pedido (para modificar pedido RF-08)
    deleteByPedido: (idPedido, callback) => {
        const query = `
            DELETE FROM Detalle_Pedidos WHERE id_Pedidos = ?
        `;
        db.query(query, [idPedido], callback);
    },

    // Eliminar UNA línea puntual — se filtra también por id_Pedidos
    // para no poder borrar por accidente un detalle de otro pedido.
    deleteById: (idDetalle, idPedido, callback) => {
        const query = `
            DELETE FROM Detalle_Pedidos
            WHERE id_Detalle_Pedidos = ? AND id_Pedidos = ?
        `;
        db.query(query, [idDetalle, idPedido], callback);
    },

    // Cambiar solo la cantidad (y el precio ya recalculado) de UNA
    // línea existente — para el +/- de "seguir agregando" sin tener
    // que borrar e insertar de nuevo.
    actualizarCantidad: (idDetalle, idPedido, cantidadPedido, precioFinal, callback) => {
        const query = `
            UPDATE Detalle_Pedidos
            SET CantidadPedido = ?, PrecioFinal = ?
            WHERE id_Detalle_Pedidos = ? AND id_Pedidos = ?
        `;
        db.query(query, [cantidadPedido, precioFinal, idDetalle, idPedido], callback);
    }
};

module.exports = DetalleModel;
const PedidoModel = require("../models/pedidoModel");
const DetalleModel = require("../models/detalleModel");

const PedidoController = {

    // GET /api/pedidos/listar
    getPedidos: (req, res) => {
        PedidoModel.findAll((err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            res.status(200).json(results);
        });
    },

    // GET /api/pedidos/estado/:estado
    getPedidosPorEstado: (req, res) => {
        const { estado } = req.params;
        const estadosValidos = ['pendiente', 'preparando', 'listo', 'entregado', 'cancelado'];

        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ message: "Estado no válido" });
        }

        PedidoModel.findByEstado(estado, (err, pedidos) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            if (pedidos.length === 0) return res.status(200).json([]);

            const idsPedidos = pedidos.map(p => p.id_Pedidos);

            DetalleModel.findByPedidos(idsPedidos, (err, detalles) => {
                if (err) return res.status(500).json({ error: "Error al obtener detalles" });

                const resultado = pedidos.map(pedido => ({
                    ...pedido,
                    detalles: detalles.filter(d => d.id_Pedidos === pedido.id_Pedidos)
                }));

                res.status(200).json(resultado);
            });
        });
    },

    // GET /api/pedidos/mesa/:numero
    getPedidosPorMesa: (req, res) => {
        const { numero } = req.params;

        PedidoModel.findByMesa(numero, (err, pedidos) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            if (pedidos.length === 0) return res.status(200).json([]);

            const idsPedidos = pedidos.map(p => p.id_Pedidos);

            DetalleModel.findByPedidos(idsPedidos, (err, detalles) => {
                if (err) return res.status(500).json({ error: "Error al obtener detalles" });

                const resultado = pedidos.map(pedido => ({
                    ...pedido,
                    detalles: detalles.filter(d => d.id_Pedidos === pedido.id_Pedidos)
                }));

                res.status(200).json(resultado);
            });
        });
    },

    getPedidosPorMesero: (req, res) => {
    const { idUsuario } = req.params;
    PedidoModel.findByMesero(idUsuario, (err, results) => {
        if (err) return res.status(500).json({ error: "Error interno del servidor" });
        res.status(200).json(results);
    });
    },

    // POST /api/pedidos/crear
    // Body: { idMesa, idUsuario, totalPagar, items: [{idPlato, nombrePlato, cantidadPedido, notasEspeciales, precioFinal, idCategoria}] }
    crearPedido: (req, res) => {
        const { idMesa, idUsuario, totalPagar, items } = req.body;

        if (!idMesa || !totalPagar || !items || items.length === 0) {
            return res.status(400).json({ message: "Faltan datos obligatorios" });
        }

        // 1. Crear el pedido
        PedidoModel.create({ totalPagar, idUsuario: idUsuario || null }, (err, result) => {
            if (err) return res.status(500).json({ error: "Error al crear el pedido" });

            const idPedido = result.insertId;

            // 2. Vincular con la mesa en Mesas_Pedidos
            PedidoModel.vincularMesa(idPedido, idMesa, (err) => {
                if (err) return res.status(500).json({ error: "Error al vincular mesa" });

                // 3. Insertar cada ítem en Detalle_Pedidos
                let insertados = 0;
                for (const item of items) {
                    const detalle = {
                        cantidadPedido: item.cantidadPedido,
                        nombrePlato: item.nombrePlato,
                        notasEspeciales: item.notasEspeciales || null,
                        precioFinal: item.precioFinal,
                        idPedido: idPedido,
                        idPlato: item.idPlato,
                        idCategoria: item.idCategoria
                    };

                    DetalleModel.create(detalle, (err) => {
                        if (err) return res.status(500).json({ error: "Error al guardar detalle" });
                        insertados++;
                        if (insertados === items.length) {
                            res.status(201).json({
                                message: "Pedido creado correctamente",
                                idPedido
                            });
                        }
                    });
                }
            });
        });
    },

    // PUT /api/pedidos/estado/:id
    // Body: { estado }
    actualizarEstado: (req, res) => {
        const { id } = req.params;
        const { estado } = req.body;
        const estadosValidos = ['pendiente', 'preparando', 'listo', 'entregado'];

        if (!estado || !estadosValidos.includes(estado)) {
            return res.status(400).json({ message: "Estado no válido" });
        }

        PedidoModel.updateEstado(id, estado, (err) => {
            if (err) return res.status(500).json({ error: "Error al actualizar estado" });
            res.status(200).json({ message: "Estado actualizado correctamente" });
        });
    },

    // PUT /api/pedidos/cancelar/:id  (RF-07)
    // Body: { motivo }
asignarPedido: (req, res) => {
        const { id } = req.params;
        const { idUsuario } = req.body;

        if (!idUsuario) {
            return res.status(400).json({ message: "idUsuario es obligatorio" });
        }

        // Cualquier mesero puede tomar o transferirse el pedido en cualquier momento
        PedidoModel.asignarMesero(id, idUsuario, (err, result) => {
            if (err) return res.status(500).json({ error: "Error al asignar el pedido" });

            if (result.affectedRows === 0) {
                return res.status(404).json({ message: "Pedido no encontrado" });
            }

            res.status(200).json({ message: "Pedido asignado correctamente" });
        });
    },

    cancelarPedido: (req, res) => {
        const { id } = req.params;
        const { motivo, esMesero } = req.body; // <--- Recibimos si es mesero desde el frente

        if (!motivo) {
            return res.status(400).json({ message: "El motivo de cancelación es obligatorio" });
        }

        // Primero verificamos el estado real del pedido
        PedidoModel.findById(id, (err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            if (results.length === 0) return res.status(404).json({ message: "Pedido no encontrado" });

            const pedido = results[0];

            // REGLA RF07: Validar cancelación según quién la solicita
            if (esMesero) {
                if (!['pendiente', 'preparando'].includes(pedido.EstadoPedido)) {
                    return res.status(400).json({ message: "No se puede cancelar. El pedido ya está Listo o Entregado." });
                }
            } else {
                // Si es cliente, estrictamente solo si está 'pendiente'
                if (pedido.EstadoPedido !== 'pendiente') {
                    return res.status(400).json({ message: "No puedes cancelar el pedido porque ya entró a cocina." });
                }
            }

            // Si pasa las validaciones, se ejecuta la cancelación
            PedidoModel.cancelar(id, motivo, (err, result) => {
                if (err) return res.status(500).json({ error: "Error al ejecutar la cancelación" });
                res.status(200).json({ message: "Pedido cancelado correctamente" });
            });
        });
    },

    // PUT /api/pedidos/modificar/:id  (RF-08)
    // Body: { items: [{idPlato, nombrePlato, cantidadPedido, notasEspeciales, precioFinal, idCategoria}], totalPagar }
 modificarPedido: (req, res) => {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: "Faltan datos obligatorios" });
    }

    // El total se recalcula en el backend a partir de los items — no se confía
    // en un totalPagar enviado desde el frontend, que podría no llegar o venir mal.
    const totalPagar = items.reduce(
        (acc, item) => acc + Number(item.precioFinal || 0), 0
    );

    // 1. Verificar que el pedido esté en estado permitido
    PedidoModel.findById(id, (err, results) => {
        if (err) return res.status(500).json({ error: "Error interno" });
        if (results.length === 0) return res.status(404).json({ message: "Pedido no encontrado" });

        const pedido = results[0];
        // Solo se puede modificar mientras el pedido esté "pendiente" — una vez
        // que pasa a "preparando" ya está en cocina y no debe editarse.
        if (pedido.EstadoPedido !== 'pendiente') {
            return res.status(400).json({ message: "Solo se puede modificar un pedido mientras está Pendiente" });
        }

        // 2. Borrar detalles anteriores
        DetalleModel.deleteByPedido(id, (err) => {
            if (err) return res.status(500).json({ error: "Error al limpiar detalles anteriores" });

            // 3. ¡CORREGIDO AQUÍ! Actualizar el precio total en la base de datos
            PedidoModel.updateTotal(id, totalPagar, (err) => { 
                if (err) return res.status(500).json({ error: "Error al actualizar el total del pedido" });

                // 4. Insertar nuevos ítems
                let insertados = 0;
                for (const item of items) {
                    const detalle = {
                        cantidadPedido: item.cantidadPedido,
                        nombrePlato: item.nombrePlato,
                        notasEspeciales: item.notasEspeciales || null,
                        precioFinal: item.precioFinal,
                        idPedido: id,
                        idPlato: item.idPlato,
                        idCategoria: item.idCategoria
                    };
                    DetalleModel.create(detalle, (err) => {
                        if (err) return res.status(500).json({ error: "Error al guardar nuevo detalle" });
                        insertados++;
                        if (insertados === items.length) {
                            res.status(200).json({ message: "Pedido modificado correctamente" });
                        }
                    });
                }
            });
        });
    });
},

    // PUT /api/pedidos/cuenta/:id  (RF-21)
    // Body: { metodoPago }
    cerrarCuenta: (req, res) => {
        const { id } = req.params;
        const { metodoPago } = req.body;

        const metodosValidos = ['Efectivo', 'Tarjeta', 'Transferencia'];
        if (!metodoPago || !metodosValidos.includes(metodoPago)) {
            return res.status(400).json({ message: "Método de pago no válido. Use: Efectivo, Tarjeta o Transferencia" });
        }

        PedidoModel.cerrarCuenta(id, metodoPago, (err) => {
            if (err) return res.status(500).json({ error: "Error al cerrar la cuenta" });
            res.status(200).json({ message: "Cuenta cerrada correctamente" });
        });
    },

    // GET /api/pedidos/:id/detalles
    getDetallesPedido: (req, res) => {
        const { id } = req.params;
        DetalleModel.findByPedido(id, (err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            res.status(200).json(results);
        });
    }
};

module.exports = PedidoController;
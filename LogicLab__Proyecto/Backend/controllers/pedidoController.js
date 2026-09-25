const crypto = require("crypto");

const PedidoModel = require("../models/pedidoModel");
const DetalleModel = require("../models/detalleModel");
const MesaModel = require("../models/mesaModel");

const generarReferencia = () => {
    const parte = crypto.randomBytes(3).toString("hex").toUpperCase();

    return `MNG-${new Date()
        .toISOString()
        .slice(2, 10)
        .replace(/-/g, "")}-${parte}`;
};

const limpiarNumero = valor =>
    String(valor || "").replace(/\D/g, "");

const validarLuhn = numero => {

    let suma = 0;
    let doble = false;

    for (let i = numero.length - 1; i >= 0; i--) {

        let digito = Number(numero[i]);

        if (doble) {
            digito *= 2;

            if (digito > 9) {
                digito -= 9;
            }
        }

        suma += digito;
        doble = !doble;
    }

    return suma % 10 === 0;
};

const PedidoController = {

    getPedidos: (req, res) => {

        PedidoModel.findAll((err, results) => {

            if (err) {
                console.error(err);
                return res.status(500).json({
                    error: "Error interno del servidor"
                });
            }

            res.status(200).json(results);
        });
    },

    getPedidosPorEstado: (req, res) => {

        const { estado } = req.params;

        const estadosValidos = [
            "pendiente",
            "preparando",
            "listo",
            "entregado",
            "cancelado"
        ];

        if (!estadosValidos.includes(estado)) {

            return res.status(400).json({
                message: "Estado no válido"
            });
        }

        PedidoModel.findByEstado(
            estado,
            (err, pedidos) => {

                if (err) {
                    return res.status(500).json({
                        error: "Error interno del servidor"
                    });
                }

                if (pedidos.length === 0) {
                    return res.status(200).json([]);
                }

                const idsPedidos =
                    pedidos.map(p => p.id_Pedidos);

                DetalleModel.findByPedidos(
                    idsPedidos,
                    (err, detalles) => {

                        if (err) {
                            return res.status(500).json({
                                error: "Error al obtener detalles"
                            });
                        }

                        const resultado =
                            pedidos.map(pedido => ({
                                ...pedido,

                                detalles:
                                    detalles.filter(
                                        d =>
                                            d.id_Pedidos ===
                                            pedido.id_Pedidos
                                    )
                            }));

                        res.status(200).json(resultado);
                    }
                );
            }
        );
    },

    getPedidosPorMesa: (req, res) => {

        const { numero } = req.params;

        PedidoModel.findByMesa(
            numero,
            (err, pedidos) => {

                if (err) {
                    return res.status(500).json({
                        error: "Error interno del servidor"
                    });
                }

                if (pedidos.length === 0) {
                    return res.status(200).json([]);
                }

                const idsPedidos =
                    pedidos.map(p => p.id_Pedidos);

                DetalleModel.findByPedidos(
                    idsPedidos,
                    (err, detalles) => {

                        if (err) {
                            return res.status(500).json({
                                error: "Error al obtener detalles"
                            });
                        }

                        const resultado =
                            pedidos.map(pedido => ({
                                ...pedido,

                                detalles:
                                    detalles.filter(
                                        d =>
                                            d.id_Pedidos ===
                                            pedido.id_Pedidos
                                    )
                            }));

                        res.status(200).json(resultado);
                    }
                );
            }
        );
    },

    getPedidosPorMesero: (req, res) => {

        const { idUsuario } = req.params;

        PedidoModel.findByMesero(
            idUsuario,
            (err, results) => {

                if (err) {
                    return res.status(500).json({
                        error: "Error interno del servidor"
                    });
                }

                res.status(200).json(results);
            }
        );
    },

    crearPedido: (req, res) => {

        const {
            idMesa,
            totalPagar,
            items,
            idMetodoPago
        } = req.body;

        const esMeseroAutenticado =
            !!(
                req.usuario &&
                req.usuario.rolId === 1
            );

        const idUsuario =
            esMeseroAutenticado
                ? req.usuario.id
                : null;

        const estadoPago =
            esMeseroAutenticado
                ? "aprobado"
                : "pendiente";

        if (
            !idMesa ||
            !totalPagar ||
            !items ||
            items.length === 0
        ) {

            return res.status(400).json({
                message: "Faltan datos obligatorios"
            });
        }

        /*
         * Pedido asistido (mesero armando el pedido por el
         * cliente): como el pedido nace "aprobado" sin pasar
         * por la pasarela ni por cerrarCuenta, el mesero debe
         * indicar con qué método cobró.
         */
        if (
            esMeseroAutenticado &&
            !idMetodoPago
        ) {

            return res.status(400).json({
                message:
                    "Selecciona el método de pago con el que el cliente pagó."
            });
        }

        const continuarCreacion =
            (idMetodoPagoValidado) => {

                PedidoModel.create(
                    {
                        totalPagar,
                        idUsuario,
                        estadoPago,
                        idMetodoPago:
                            idMetodoPagoValidado
                    },
                    (err, result) => {

                        if (err) {
                            console.error(err);

                            return res.status(500).json({
                                error: "Error al crear el pedido"
                            });
                        }

                        const idPedido =
                            result.insertId;

                        PedidoModel.vincularMesa(
                            idPedido,
                            idMesa,
                            err => {

                                if (err) {
                                    return res.status(500).json({
                                        error: "Error al vincular mesa"
                                    });
                                }

                                const continuar =
                                    () => {

                                        let insertados = 0;
                                        let huboError = false;

                                        for (
                                            const item of items
                                        ) {

                                            /*
                                             * "Corriente del Día" es un plato
                                             * sintético armado en el panel de
                                             * administrador (id_Platos: 9999)
                                             * que NO existe en la tabla `platos`.
                                             *
                                             * Como id_Platos tiene una foreign
                                             * key hacia `platos`, insertar 9999
                                             * revienta el INSERT. Se guarda como
                                             * NULL: el nombre, precio y categoría
                                             * igual quedan registrados.
                                             */
                                            const idPlatoValido =
                                                item.idPlato ===
                                                9999
                                                    ? null
                                                    : item.idPlato;

                                            const detalle = {

                                                cantidadPedido:
                                                    item.cantidadPedido,

                                                nombrePlato:
                                                    item.nombrePlato,

                                                notasEspeciales:
                                                    item.notasEspeciales ||
                                                    null,

                                                precioFinal:
                                                    item.precioFinal,

                                                idPedido,

                                                idPlato:
                                                    idPlatoValido,

                                                idCategoria:
                                                    item.idCategoria
                                            };

                                            DetalleModel.create(
                                                detalle,
                                                err => {

                                                    /*
                                                     * Si un ítem ya falló,
                                                     * ya se respondió 500:
                                                     * no volver a responder
                                                     * por cada ítem restante
                                                     * que también falle o
                                                     * termine después.
                                                     */
                                                    if (
                                                        huboError
                                                    ) {
                                                        return;
                                                    }

                                                    if (err) {
                                                        huboError = true;

                                                        console.error(
                                                            err
                                                        );

                                                        return res.status(500).json({
                                                            error:
                                                                "Error al guardar detalle"
                                                        });
                                                    }

                                                    insertados++;

                                                    if (
                                                        insertados ===
                                                        items.length
                                                    ) {

                                                        res.status(201).json({
                                                            message:
                                                                "Pedido creado correctamente",
                                                            idPedido
                                                        });
                                                    }
                                                }
                                            );
                                        }
                                    };

                                if (esMeseroAutenticado) {

                                    MesaModel.updateEstado(
                                        idMesa,
                                        "ocupada",
                                        err => {

                                            if (err) {
                                                return res.status(500).json({
                                                    error:
                                                        "Error al ocupar la mesa"
                                                });
                                            }

                                            continuar();
                                        }
                                    );

                                } else {

                                    continuar();
                                }
                            }
                        );
                    }
                );
            };

        /*
         * Si es un mesero, validamos que el método de pago
         * elegido exista de verdad antes de crear el pedido.
         * El cliente (flujo normal) no manda idMetodoPago
         * aquí — su pago se confirma después, en la pasarela.
         */
        if (esMeseroAutenticado) {

            const db = require("../config/db");

            db.query(
                `SELECT id_MetodoPago
                 FROM metodo_pago
                 WHERE id_MetodoPago = ?`,
                [idMetodoPago],
                (err, metodos) => {

                    if (err) {
                        return res.status(500).json({
                            error:
                                "Error consultando método de pago"
                        });
                    }

                    if (metodos.length === 0) {
                        return res.status(400).json({
                            message:
                                "Método de pago no válido."
                        });
                    }

                    continuarCreacion(idMetodoPago);
                }
            );

        } else {

            continuarCreacion(null);
        }
    },

    actualizarEstado: (req, res) => {

        const { id } = req.params;
        const { estado } = req.body;

        const estadosValidos = [
            "pendiente",
            "preparando",
            "listo",
            "entregado"
        ];

        if (
            !estado ||
            !estadosValidos.includes(estado)
        ) {

            return res.status(400).json({
                message: "Estado no válido"
            });
        }

        PedidoModel.updateEstado(
            id,
            estado,
            (err, result) => {

                if (err) {
                    return res.status(500).json({
                        error:
                            "Error al actualizar estado"
                    });
                }

                if (result.affectedRows === 0) {

                    return res.status(400).json({
                        message:
                            "El pedido no existe."
                    });
                }

                res.status(200).json({
                    message:
                        "Estado actualizado correctamente"
                });
            }
        );
    },

    asignarPedido: (req, res) => {

        const { id } = req.params;
        const { idUsuario } = req.body;

        if (!idUsuario) {

            return res.status(400).json({
                message:
                    "idUsuario es obligatorio"
            });
        }

        PedidoModel.asignarMesero(
            id,
            idUsuario,
            (err, result) => {

                if (err) {
                    return res.status(500).json({
                        error:
                            "Error al asignar el pedido"
                    });
                }

                if (result.affectedRows === 0) {

                    return res.status(404).json({
                        message:
                            "Pedido no encontrado"
                    });
                }

                res.status(200).json({
                    message:
                        "Pedido asignado correctamente"
                });
            }
        );
    },

    cancelarPedido: (req, res) => {

        const { id } = req.params;
        const { motivo } = req.body;

        const esMesero =
            !!(
                req.usuario &&
                req.usuario.rolId === 1
            );

        if (!motivo) {

            return res.status(400).json({
                message:
                    "El motivo de cancelación es obligatorio"
            });
        }

        PedidoModel.findById(
            id,
            (err, results) => {

                if (err) {
                    return res.status(500).json({
                        error:
                            "Error interno del servidor"
                    });
                }

                if (results.length === 0) {

                    return res.status(404).json({
                        message:
                            "Pedido no encontrado"
                    });
                }

                const pedido = results[0];

                if (esMesero) {

                    if (
                        ![
                            "pendiente",
                            "preparando"
                        ].includes(
                            pedido.EstadoPedido
                        )
                    ) {

                        return res.status(400).json({
                            message:
                                "No se puede cancelar. El pedido ya está listo o entregado."
                        });
                    }

                } else {

                    if (
                        pedido.EstadoPedido !==
                        "pendiente"
                    ) {

                        return res.status(400).json({
                            message:
                                "No puedes cancelar el pedido porque ya entró a cocina."
                        });
                    }

                    /*
                     * Si el cliente ya pagó (EstadoPago
                     * = 'aprobado'), no puede cancelar
                     * por su cuenta: implicaría un
                     * reembolso, y eso lo debe gestionar
                     * el mesero/administrador, no un
                     * botón de autoservicio.
                     */
                    if (
                        pedido.EstadoPago ===
                        "aprobado"
                    ) {

                        return res.status(400).json({
                            message:
                                "Este pedido ya fue pagado. Para cancelarlo, comunícate con un mesero."
                        });
                    }
                }

                /*
                 * Si un mesero cancela un pedido que ya
                 * estaba pagado, el dinero sigue capturado
                 * como "aprobado" (es un hecho histórico:
                 * el pago sí ocurrió). Lo que se marca es
                 * que ese pago quedó pendiente de reembolso,
                 * usando MotivoPago para que quede visible
                 * en el pedido.
                 */
                const requiereReembolso =
                    pedido.EstadoPago ===
                    "aprobado";

                PedidoModel.cancelar(
                    id,
                    motivo,
                    requiereReembolso,
                    (err, result) => {

                        if (err) {
                            return res.status(500).json({
                                error:
                                    "Error al ejecutar la cancelación"
                            });
                        }

                        if (
                            result.affectedRows === 0
                        ) {

                            return res.status(400).json({
                                message:
                                    "El pedido ya no puede cancelarse porque su estado cambió."
                            });
                        }

                        res.status(200).json({
                            message:
                                requiereReembolso
                                    ? "Pedido cancelado. Este pedido ya estaba pagado: queda marcado como pendiente de reembolso."
                                    : "Pedido cancelado correctamente"
                        });
                    }
                );
            }
        );
    },

    /*
     * Marca como resuelto un reembolso que había quedado
     * pendiente (pedido pagado y luego cancelado). La usa
     * el mesero/administrador cuando ya le devolvió el
     * dinero al cliente.
     */
    marcarReembolso: (req, res) => {

        const { id } = req.params;

        PedidoModel.marcarReembolsado(
            id,
            (err, result) => {

                if (err) {

                    console.error(err);

                    return res.status(500).json({
                        error:
                            "Error al registrar el reembolso"
                    });
                }

                if (
                    result.affectedRows === 0
                ) {

                    return res.status(400).json({
                        message:
                            "Este pedido no tiene un reembolso pendiente."
                    });
                }

                res.status(200).json({
                    message:
                        "Reembolso marcado como realizado."
                });
            }
        );
    },

    modificarPedido: (req, res) => {

        const { id } = req.params;
        const { items } = req.body;

        if (!items || items.length === 0) {

            return res.status(400).json({
                message:
                    "Faltan datos obligatorios"
            });
        }

        const totalPagar =
            items.reduce(
                (acc, item) =>
                    acc +
                    Number(
                        item.precioFinal || 0
                    ),
                0
            );

        PedidoModel.findById(
            id,
            (err, results) => {

                if (err) {
                    return res.status(500).json({
                        error:
                            "Error interno"
                    });
                }

                if (results.length === 0) {

                    return res.status(404).json({
                        message:
                            "Pedido no encontrado"
                    });
                }

                const pedido = results[0];

                if (
                    pedido.EstadoPago ===
                    "aprobado"
                ) {

                    return res.status(400).json({
                        message:
                            "Este pedido ya está pagado — no se puede modificar. Cualquier cosa nueva es un pedido aparte."
                    });
                }

                if (
                    pedido.EstadoPedido !==
                    "pendiente"
                ) {

                    return res.status(400).json({
                        message:
                            "Solo se puede modificar un pedido mientras está Pendiente"
                    });
                }

                DetalleModel.deleteByPedido(
                    id,
                    err => {

                        if (err) {
                            return res.status(500).json({
                                error:
                                    "Error al limpiar detalles anteriores"
                            });
                        }

                        PedidoModel.updateTotal(
                            id,
                            totalPagar,
                            err => {

                                if (err) {
                                    return res.status(500).json({
                                        error:
                                            "Error al actualizar el total"
                                    });
                                }

                                let insertados = 0;

                                for (
                                    const item of items
                                ) {

                                    /*
                                     * Mismo criterio que crearPedido: "Corriente
                                     * del Día" (id_Platos: 9999) no es un plato
                                     * real, no existe en la tabla `platos` — la
                                     * foreign key revienta el INSERT si se manda
                                     * tal cual. Se guarda como NULL.
                                     */
                                    const idPlatoValido =
                                        item.idPlato ===
                                        9999
                                            ? null
                                            : item.idPlato;

                                    const detalle = {

                                        cantidadPedido:
                                            item.cantidadPedido,

                                        nombrePlato:
                                            item.nombrePlato,

                                        notasEspeciales:
                                            item.notasEspeciales ||
                                            null,

                                        precioFinal:
                                            item.precioFinal,

                                        idPedido:
                                            id,

                                        idPlato:
                                            idPlatoValido,

                                        idCategoria:
                                            item.idCategoria
                                    };

                                    DetalleModel.create(
                                        detalle,
                                        err => {

                                            if (err) {
                                                return res.status(500).json({
                                                    error:
                                                        "Error al guardar nuevo detalle"
                                                });
                                            }

                                            insertados++;

                                            if (
                                                insertados ===
                                                items.length
                                            ) {

                                                res.status(200).json({
                                                    message:
                                                        "Pedido modificado correctamente"
                                                });
                                            }
                                        }
                                    );
                                }
                            }
                        );
                    }
                );
            }
        );
    },

    // Registra un pago presencial de un pedido creado por el cliente.
    // A diferencia de cerrarCuenta, NO cambia el estado del pedido a
    // "entregado": el mesero puede cobrar primero y luego enviarlo a cocina.
    pagoPresencial: (req, res) => {

        const { id } = req.params;
        const { metodoPago } = req.body;

        if (!metodoPago) {
            return res.status(400).json({
                message: "Selecciona un método de pago."
            });
        }

        PedidoModel.findById(id, (err, results) => {

            if (err) {
                return res.status(500).json({
                    error: "Error interno del servidor"
                });
            }

            if (results.length === 0) {
                return res.status(404).json({
                    message: "Pedido no encontrado"
                });
            }

            const pedido = results[0];

            if (pedido.EstadoPago === "aprobado") {
                return res.status(400).json({
                    message: "Este pedido ya aparece como pagado."
                });
            }

            const db = require("../config/db");

            db.query(
                `SELECT id_MetodoPago
                 FROM metodo_pago
                 WHERE NombreMetodo = ?`,
                [metodoPago],
                (err, metodos) => {

                    if (err) {
                        return res.status(500).json({
                            error: "Error consultando método de pago"
                        });
                    }

                    if (metodos.length === 0) {
                        return res.status(400).json({
                            message: "Método de pago no válido."
                        });
                    }

                    const referencia = generarReferencia();

                    PedidoModel.actualizarPago(
                        id,
                        metodos[0].id_MetodoPago,
                        "aprobado",
                        referencia,
                        null,
                        "Pago registrado por mesero",
                        (err, result) => {

                            if (err) {
                                console.error(err);
                                return res.status(500).json({
                                    error: "Error al registrar el pago"
                                });
                            }

                            if (result.affectedRows === 0) {
                                return res.status(400).json({
                                    message: "El pago no pudo registrarse porque el pedido ya fue procesado."
                                });
                            }

                            res.status(200).json({
                                message: "Pago registrado correctamente",
                                metodoPago,
                                estadoPago: "aprobado"
                            });
                        }
                    );
                }
            );
        });
    },

    cerrarCuenta: (req, res) => {

        const { id } = req.params;
        const { metodoPago } = req.body;

        const metodosValidos = [
            "Efectivo",
            "Tarjeta",
            "Transferencia",
            "Nequi",
            "Daviplata",
            "PSE",
            "Tarjeta crédito",
            "Tarjeta débito"
        ];

        if (
            !metodoPago ||
            !metodosValidos.includes(metodoPago)
        ) {

            return res.status(400).json({
                message:
                    "Método de pago no válido"
            });
        }

        PedidoModel.cerrarCuenta(
            id,
            metodoPago,
            (err, result) => {

                if (err) {
                    console.error(err);

                    return res.status(500).json({
                        error:
                            "Error al cerrar la cuenta"
                    });
                }

                if (
                    result.affectedRows === 0
                ) {

                    return res.status(400).json({
                        message:
                            "La cuenta ya estaba cerrada o el pedido no existe."
                    });
                }

                res.status(200).json({
                    message:
                        "Cuenta cerrada correctamente",
                    metodoPago
                });
            }
        );
    },

    getDetallesPedido: (req, res) => {

        const { id } = req.params;

        DetalleModel.findByPedido(
            id,
            (err, results) => {

                if (err) {
                    return res.status(500).json({
                        error:
                            "Error interno del servidor"
                    });
                }

                res.status(200).json(results);
            }
        );
    },

    /*
     * =========================================================
     * OPERACIONES ATÓMICAS SOBRE UN PEDIDO (agregar/quitar/cambiar
     * cantidad de UN ítem a la vez, en vez de reemplazar toda la
     * lista como hace modificarPedido).
     *
     * Se usan tanto por el cliente (seguir agregando desde el QR)
     * como por el mesero (editor detallado de HU16) — al tocar solo
     * la línea que cambia, dos personas pueden estar agregando o
     * quitando cosas del MISMO pedido casi al mismo tiempo sin que
     * una le borre el cambio a la otra (que es justo lo que podía
     * pasar con el "reemplazar todo" de modificarPedido).
     * =========================================================
     */

    // Trae el pedido y valida que todavía se pueda tocar (existe,
    // sigue "pendiente", y no está pagado). Devuelve el pedido por
    // callback(null, pedido) o corta la petición con el error/status
    // que corresponda.
    _validarPedidoModificable: (id, res, callback) => {

        PedidoModel.findById(
            id,
            (err, results) => {

                if (err) {
                    res.status(500).json({ error: "Error interno" });
                    return;
                }

                if (results.length === 0) {
                    res.status(404).json({ message: "Pedido no encontrado" });
                    return;
                }

                const pedido = results[0];

                if (pedido.EstadoPago === "aprobado") {
                    res.status(400).json({
                        message:
                            "Este pedido ya está pagado — no se puede modificar. Cualquier cosa nueva es un pedido aparte."
                    });
                    return;
                }

                if (pedido.EstadoPedido !== "pendiente") {
                    res.status(400).json({
                        message:
                            "Solo se puede modificar un pedido mientras está Pendiente"
                    });
                    return;
                }

                callback(pedido);
            }
        );
    },

    // POST /api/pedidos/:id/items — agregar UN ítem nuevo.
    agregarItem: (req, res) => {

        const { id } = req.params;
        const { idPlato, nombrePlato, cantidadPedido, notasEspeciales, precioFinal, idCategoria } = req.body;

        if (!nombrePlato || !cantidadPedido || !precioFinal || !idCategoria) {
            return res.status(400).json({ message: "Faltan datos obligatorios" });
        }

        PedidoController._validarPedidoModificable(id, res, () => {

            // Mismo criterio que crearPedido/modificarPedido: "Corriente
            // del Día" (id_Platos: 9999) no es un plato real, no existe
            // en la tabla `platos` — se guarda como NULL.
            const idPlatoValido = idPlato === 9999 ? null : idPlato;

            DetalleModel.create(
                {
                    cantidadPedido,
                    nombrePlato,
                    notasEspeciales: notasEspeciales || null,
                    precioFinal,
                    idPedido: id,
                    idPlato: idPlatoValido,
                    idCategoria
                },
                (err) => {

                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: "Error al guardar el nuevo ítem" });
                    }

                    PedidoModel.recalcularTotal(id, (err) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ error: "Error al actualizar el total" });
                        }
                        res.status(201).json({ message: "Ítem agregado" });
                    });
                }
            );
        });
    },

    // DELETE /api/pedidos/:id/items/:idDetalle — quitar UNA línea.
    quitarItem: (req, res) => {

        const { id, idDetalle } = req.params;

        PedidoController._validarPedidoModificable(id, res, () => {

            DetalleModel.deleteById(idDetalle, id, (err, result) => {

                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: "Error al quitar el ítem" });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: "Ese ítem no existe en este pedido" });
                }

                PedidoModel.recalcularTotal(id, (err) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: "Error al actualizar el total" });
                    }
                    res.status(200).json({ message: "Ítem eliminado" });
                });
            });
        });
    },

    // PUT /api/pedidos/:id/items/:idDetalle — cambiar la cantidad de
    // una línea existente (0 o menos = usar quitarItem en su lugar).
    actualizarCantidadItem: (req, res) => {

        const { id, idDetalle } = req.params;
        const { cantidadPedido, precioFinal } = req.body;

        if (!cantidadPedido || cantidadPedido < 1 || !precioFinal) {
            return res.status(400).json({ message: "Cantidad inválida" });
        }

        PedidoController._validarPedidoModificable(id, res, () => {

            DetalleModel.actualizarCantidad(
                idDetalle,
                id,
                cantidadPedido,
                precioFinal,
                (err, result) => {

                    if (err) {
                        console.error(err);
                        return res.status(500).json({ error: "Error al actualizar la cantidad" });
                    }

                    if (result.affectedRows === 0) {
                        return res.status(404).json({ message: "Ese ítem no existe en este pedido" });
                    }

                    PedidoModel.recalcularTotal(id, (err) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ error: "Error al actualizar el total" });
                        }
                        res.status(200).json({ message: "Cantidad actualizada" });
                    });
                }
            );
        });
    },

    /*
     * Procesamiento de pago de demostración.
     *
     * El sistema NO realiza un cobro real.
     *
     * El resultado se determina a partir de los datos
     * introducidos por el usuario.
     */
    simularPago: (req, res) => {

        const { id } = req.params;

        const {
            idMetodoPago,
            datos
        } = req.body;

        if (!idMetodoPago || !datos) {

            return res.status(400).json({
                message:
                    "Selecciona un método e ingresa los datos requeridos."
            });
        }

        PedidoModel.findById(
            id,
            (err, results) => {

                if (err) {
                    return res.status(500).json({
                        error:
                            "Error interno del servidor"
                    });
                }

                if (results.length === 0) {

                    return res.status(404).json({
                        message:
                            "Pedido no encontrado"
                    });
                }

                const pedido = results[0];

                if (
                    ![
                        "pendiente",
                        "rechazado"
                    ].includes(
                        pedido.EstadoPago
                    )
                ) {

                    return res.status(400).json({
                        message:
                            "Este pedido ya fue procesado."
                    });
                }

                /*
                 * Obtener el nombre real del método
                 * desde la BD.
                 */
                const db = require("../config/db");

                db.query(
                    `
                    SELECT
                        id_MetodoPago,
                        NombreMetodo
                    FROM metodo_pago
                    WHERE id_MetodoPago = ?
                      AND Disponible_Online = 1
                    `,
                    [idMetodoPago],
                    (err, metodos) => {

                        if (err) {
                            return res.status(500).json({
                                error:
                                    "Error consultando método de pago"
                            });
                        }

                        if (
                            metodos.length === 0
                        ) {

                            return res.status(400).json({
                                message:
                                    "Método de pago no disponible para pagos en línea."
                            });
                        }

                        const metodo =
                            metodos[0].NombreMetodo;

                        let valido = true;
                        let mensaje = "";
                        let ultimos4 = null;

                        /*
                         * NEQUI / DAVIPLATA
                         */
                        if (
                            metodo === "Nequi" ||
                            metodo === "Daviplata"
                        ) {

                            const celular =
                                limpiarNumero(
                                    datos.celular
                                );

                            const codigo =
                                limpiarNumero(
                                    datos.codigo
                                );

                            if (
                                !/^3\d{9}$/.test(
                                    celular
                                )
                            ) {

                                valido = false;

                                mensaje =
                                    "El número de celular debe tener 10 dígitos y comenzar por 3.";

                            } else if (
                                !/^\d{6}$/.test(
                                    codigo
                                )
                            ) {

                                valido = false;

                                mensaje =
                                    "El código de confirmación debe tener 6 dígitos.";
                            }
                        }

                        /*
                         * PSE
                         */
                        else if (
                            metodo === "PSE"
                        ) {

                            const correo =
                                String(
                                    datos.correo ||
                                    ""
                                ).trim();

                            const documento =
                                limpiarNumero(
                                    datos.documento
                                );

                            const banco =
                                String(
                                    datos.banco ||
                                    ""
                                ).trim();

                            if (
                                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                                    correo
                                )
                            ) {

                                valido = false;

                                mensaje =
                                    "Ingresa un correo electrónico válido.";

                            } else if (
                                documento.length <
                                6
                            ) {

                                valido = false;

                                mensaje =
                                    "Ingresa un número de documento válido.";

                            } else if (
                                !banco
                            ) {

                                valido = false;

                                mensaje =
                                    "Selecciona tu banco.";
                            }
                        }

                        /*
                         * TARJETAS
                         */
                        else if (
                            metodo ===
                                "Tarjeta crédito" ||
                            metodo ===
                                "Tarjeta débito"
                        ) {

                            const numero =
                                limpiarNumero(
                                    datos.numero
                                );

                            const nombre =
                                String(
                                    datos.nombre ||
                                    ""
                                ).trim();

                            const vencimiento =
                                String(
                                    datos.vencimiento ||
                                    ""
                                ).trim();

                            const cvv =
                                limpiarNumero(
                                    datos.cvv
                                );

                            if (
                                numero.length !==
                                16
                            ) {

                                valido = false;

                                mensaje =
                                    "El número de tarjeta debe tener 16 dígitos.";

                            } else if (
                                !validarLuhn(
                                    numero
                                )
                            ) {

                                valido = false;

                                mensaje =
                                    "El número de tarjeta no es válido.";

                            } else if (
                                nombre.length <
                                3
                            ) {

                                valido = false;

                                mensaje =
                                    "Ingresa el nombre del titular.";

                            } else if (
                                !/^(0[1-9]|1[0-2])\/\d{2}$/.test(
                                    vencimiento
                                )
                            ) {

                                valido = false;

                                mensaje =
                                    "La fecha debe tener el formato MM/AA.";

                            } else if (
                                !/^\d{3,4}$/.test(
                                    cvv
                                )
                            ) {

                                valido = false;

                                mensaje =
                                    "El CVV no es válido.";
                            } else {

                                const [
                                    mes,
                                    anio
                                ] =
                                    vencimiento.split(
                                        "/"
                                    );

                                const fechaActual =
                                    new Date();

                                const anioActual =
                                    fechaActual
                                        .getFullYear() %
                                    100;

                                const mesActual =
                                    fechaActual
                                        .getMonth() + 1;

                                const anioNumero =
                                    Number(anio);

                                const vencida =
                                    anioNumero <
                                        anioActual ||
                                    (
                                        anioNumero ===
                                            anioActual &&
                                        Number(mes) <
                                            mesActual
                                    );

                                if (vencida) {

                                    valido = false;

                                    mensaje =
                                        "La tarjeta está vencida.";
                                }
                            }

                            ultimos4 =
                                numero.slice(-4);
                        }

                        if (!valido) {

                            PedidoModel.actualizarPago(
                                id,
                                idMetodoPago,
                                "rechazado",
                                null,
                                null,
                                mensaje,
                                (err, result) => {

                                    if (err) {
                                        return res.status(500).json({
                                            error:
                                                "Error registrando el rechazo"
                                        });
                                    }

                                    res.status(400).json({
                                        estadoPago:
                                            "rechazado",
                                        message:
                                            mensaje
                                    });
                                }
                            );

                            return;
                        }

                        const referencia =
                            generarReferencia();

                        PedidoModel.actualizarPago(
                            id,
                            idMetodoPago,
                            "aprobado",
                            referencia,
                            ultimos4,
                            null,
                            (err, result) => {

                                if (err) {
                                    console.error(err);

                                    return res.status(500).json({
                                        error:
                                            "Error al registrar el pago"
                                    });
                                }

                                if (
                                    result.affectedRows ===
                                    0
                                ) {

                                    return res.status(400).json({
                                        message:
                                            "El pago no pudo registrarse porque el pedido cambió de estado."
                                    });
                                }

                                res.status(200).json({

                                    message:
                                        "Pago aprobado correctamente",

                                    estadoPago:
                                        "aprobado",

                                    referencia,

                                    metodoPago:
                                        metodo,

                                    ultimos4
                                });
                            }
                        );
                    }
                );
            }
        );
    }
};

module.exports = PedidoController;
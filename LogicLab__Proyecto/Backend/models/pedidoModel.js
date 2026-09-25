const db = require("../config/db");

/*
 * Genera una referencia de pago con el mismo formato que usa
 * cerrarCuenta (MES-YYMMDD-XXXXXX), para pagos que el personal
 * del restaurante registra en persona.
 */
const generarReferenciaMesero = () => {
    const fecha = new Date();

    const yy = String(fecha.getFullYear()).slice(2);
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    const dd = String(fecha.getDate()).padStart(2, "0");

    const random =
        String(Math.floor(Math.random() * 999999))
            .padStart(6, "0");

    return `MES-${yy}${mm}${dd}-${random}`;
};

const PedidoModel = {

    create: (datos, callback) => {
        const estadoPago = datos.estadoPago || "pendiente";
        const idMetodoPago = datos.idMetodoPago || null;

        /*
         * Si el pedido nace ya "aprobado" y con método de
         * pago (pedido asistido: el mesero cobró ahí mismo),
         * dejamos el registro de pago completo desde ya —
         * igual que hace cerrarCuenta — en vez de dejar
         * FechaPago/ReferenciaPago/MotivoPago vacíos como
         * pasaba antes.
         */
        const pagoConfirmadoAlCrear =
            estadoPago === "aprobado" &&
            !!idMetodoPago;

        const fechaPago =
            pagoConfirmadoAlCrear
                ? new Date()
                : null;

        const referenciaPago =
            pagoConfirmadoAlCrear
                ? generarReferenciaMesero()
                : null;

        const motivoPago =
            pagoConfirmadoAlCrear
                ? "Pago registrado por mesero (pedido asistido)"
                : null;

        const query = `
            INSERT INTO Pedidos
                (
                    Fecha_Pedido,
                    id_Estado,
                    EstadoPago,
                    TotalPagar,
                    id_Usuarios_Restaurante,
                    id_MetodoPago,
                    FechaPago,
                    ReferenciaPago,
                    MotivoPago
                )
            VALUES (
                NOW(),
                (
                    SELECT id_Estado
                    FROM estados_pedido
                    WHERE NombreEstado = 'pendiente'
                ),
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            )
        `;

        db.query(
            query,
            [
                estadoPago,
                datos.totalPagar,
                datos.idUsuario || null,
                idMetodoPago,
                fechaPago,
                referenciaPago,
                motivoPago
            ],
            callback
        );
    },

    findAll: (callback) => {

        const query = `
            SELECT
                p.id_Pedidos,
                p.Fecha_Pedido,
                p.EstadoPago,
                p.EstadoReembolso,
                p.FechaPago,
                p.ReferenciaPago,
                p.Ultimos4,
                p.MotivoPago,
                ep.NombreEstado AS EstadoPedido,
                p.TotalPagar,
                mp.NombreMetodo AS MetodoPago,
                p.MotivoCancelacion,
                m.Numero_mesa,
                u.Nombre AS NombreMesero
            FROM Pedidos p

            JOIN estados_pedido ep
                ON ep.id_Estado = p.id_Estado

            LEFT JOIN metodo_pago mp
                ON mp.id_MetodoPago = p.id_MetodoPago

            LEFT JOIN Mesas_Pedidos mpx
                ON mpx.id_Pedidos = p.id_Pedidos

            LEFT JOIN Mesas m
                ON m.id_Mesas = mpx.id_Mesas

            LEFT JOIN Usuarios_Restaurante u
                ON u.id_Usuarios_Restaurante =
                   p.id_Usuarios_Restaurante

            ORDER BY p.Fecha_Pedido DESC
        `;

        db.query(query, callback);
    },

    findByEstado: (estado, callback) => {

        const query = `
            SELECT
                p.id_Pedidos,
                p.Fecha_Pedido,
                p.EstadoPago,
                p.FechaPago,
                p.ReferenciaPago,
                p.Ultimos4,
                p.MotivoPago,
                ep.NombreEstado AS EstadoPedido,
                p.TotalPagar,
                mp.NombreMetodo AS MetodoPago,
                m.Numero_mesa,
                u.Nombre AS NombreMesero
            FROM Pedidos p

            JOIN estados_pedido ep
                ON ep.id_Estado = p.id_Estado

            LEFT JOIN metodo_pago mp
                ON mp.id_MetodoPago = p.id_MetodoPago

            LEFT JOIN Mesas_Pedidos mpx
                ON mpx.id_Pedidos = p.id_Pedidos

            LEFT JOIN Mesas m
                ON m.id_Mesas = mpx.id_Mesas

            LEFT JOIN Usuarios_Restaurante u
                ON u.id_Usuarios_Restaurante =
                   p.id_Usuarios_Restaurante

            WHERE ep.NombreEstado = ?

            ORDER BY p.Fecha_Pedido ASC
        `;

        db.query(query, [estado], callback);
    },

    findByMesa: (numeroMesa, callback) => {

        const query = `
            SELECT
                p.id_Pedidos,
                p.Fecha_Pedido,
                p.EstadoPago,
                p.FechaPago,
                p.ReferenciaPago,
                p.Ultimos4,
                ep.NombreEstado AS EstadoPedido,
                p.TotalPagar,
                mp.NombreMetodo AS MetodoPago
            FROM Pedidos p

            JOIN estados_pedido ep
                ON ep.id_Estado = p.id_Estado

            LEFT JOIN metodo_pago mp
                ON mp.id_MetodoPago = p.id_MetodoPago

            INNER JOIN Mesas_Pedidos mpx
                ON mpx.id_Pedidos = p.id_Pedidos

            INNER JOIN Mesas m
                ON m.id_Mesas = mpx.id_Mesas

            WHERE m.Numero_mesa = ?
              AND ep.NombreEstado NOT IN ('cancelado')

            ORDER BY p.Fecha_Pedido ASC
        `;

        db.query(query, [numeroMesa], callback);
    },

    findByMesero: (idUsuario, callback) => {

        const query = `
            SELECT
                p.id_Pedidos,
                p.Fecha_Pedido,
                p.EstadoPago,
                p.EstadoReembolso,
                p.FechaPago,
                p.ReferenciaPago,
                p.Ultimos4,
                ep.NombreEstado AS EstadoPedido,
                p.TotalPagar,
                mp.NombreMetodo AS MetodoPago,
                m.Numero_mesa
            FROM Pedidos p

            JOIN estados_pedido ep
                ON ep.id_Estado = p.id_Estado

            LEFT JOIN metodo_pago mp
                ON mp.id_MetodoPago = p.id_MetodoPago

            LEFT JOIN Mesas_Pedidos mpx
                ON mpx.id_Pedidos = p.id_Pedidos

            LEFT JOIN Mesas m
                ON m.id_Mesas = mpx.id_Mesas

            WHERE p.id_Usuarios_Restaurante = ?

            ORDER BY p.Fecha_Pedido DESC

            LIMIT 100
        `;

        db.query(query, [idUsuario], callback);
    },

    findById: (id, callback) => {

        const query = `
            SELECT
                p.id_Pedidos,
                p.Fecha_Pedido,
                p.EstadoPago,
                p.EstadoReembolso,
                p.FechaPago,
                p.ReferenciaPago,
                p.Ultimos4,
                p.MotivoPago,
                ep.NombreEstado AS EstadoPedido,
                p.TotalPagar,
                mp.NombreMetodo AS MetodoPago,
                p.MotivoCancelacion,
                m.Numero_mesa
            FROM Pedidos p

            JOIN estados_pedido ep
                ON ep.id_Estado = p.id_Estado

            LEFT JOIN metodo_pago mp
                ON mp.id_MetodoPago = p.id_MetodoPago

            LEFT JOIN Mesas_Pedidos mpx
                ON mpx.id_Pedidos = p.id_Pedidos

            LEFT JOIN Mesas m
                ON m.id_Mesas = mpx.id_Mesas

            WHERE p.id_Pedidos = ?
        `;

        db.query(query, [id], callback);
    },

    // BUGFIX (cambio de flujo): antes exigía EstadoPago='aprobado' para
    // dejar avanzar el pedido — eso obligaba a pagar ANTES de que
    // cocina lo viera. Ahora el pago pasa mientras el pedido ya está
    // en preparación (o después), así que este candado ya no aplica:
    // el mesero manda a cocina sin que nadie haya pagado todavía.
    updateEstado: (id, estado, callback) => {

        const query = `
            UPDATE Pedidos

            SET id_Estado = (
                SELECT id_Estado
                FROM estados_pedido
                WHERE NombreEstado = ?
            )

            WHERE id_Pedidos = ?
        `;

        db.query(query, [estado, id], callback);
    },

    actualizarPago: (
        id,
        idMetodoPago,
        estadoPago,
        referencia,
        ultimos4,
        motivo,
        callback
    ) => {

        const query = `
            UPDATE Pedidos

            SET
                id_MetodoPago = ?,
                EstadoPago = ?,

                FechaPago =
                    CASE
                        WHEN ? = 'aprobado'
                        THEN NOW()
                        ELSE FechaPago
                    END,

                ReferenciaPago =
                    CASE
                        WHEN ? = 'aprobado'
                        THEN ?
                        ELSE NULL
                    END,

                Ultimos4 =
                    CASE
                        WHEN ? = 'aprobado'
                        THEN ?
                        ELSE NULL
                    END,

                MotivoPago = ?

            WHERE id_Pedidos = ?
              AND EstadoPago IN ('pendiente', 'rechazado')
        `;

        db.query(
            query,
            [
                idMetodoPago,
                estadoPago,
                estadoPago,
                estadoPago,
                referencia,
                estadoPago,
                ultimos4,
                motivo || null,
                id
            ],
            callback
        );
    },

    asignarMesero: (idPedido, idUsuario, callback) => {

        const query = `
            UPDATE Pedidos
            SET id_Usuarios_Restaurante = ?
            WHERE id_Pedidos = ?
        `;

        db.query(query, [idUsuario, idPedido], callback);
    },

    updateTotal: (id, total, callback) => {

        const query = `
            UPDATE Pedidos
            SET TotalPagar = ?
            WHERE id_Pedidos = ?
        `;

        db.query(query, [total, id], callback);
    },

    // Recalcula TotalPagar sumando los detalles ACTUALES del pedido,
    // directo en SQL (sin traer y volver a mandar el total desde
    // Node) — se usa después de cada operación atómica sobre un
    // ítem individual (agregar/quitar/cambiar cantidad), para que el
    // total nunca se desincronice de lo que de verdad hay guardado.
    recalcularTotal: (idPedido, callback) => {

        const query = `
            UPDATE Pedidos
            SET TotalPagar = (
                SELECT COALESCE(SUM(PrecioFinal), 0)
                FROM Detalle_Pedidos
                WHERE id_Pedidos = ?
            )
            WHERE id_Pedidos = ?
        `;

        db.query(query, [idPedido, idPedido], callback);
    },

    cancelar: (id, motivo, requiereReembolso, callback) => {

        const query = `
            UPDATE Pedidos

            SET
                id_Estado = (
                    SELECT id_Estado
                    FROM estados_pedido
                    WHERE NombreEstado = 'cancelado'
                ),
                MotivoCancelacion = ?,

                EstadoReembolso = CASE
                    WHEN ? THEN 'pendiente'
                    ELSE EstadoReembolso
                END

            WHERE id_Pedidos = ?

            AND id_Estado IN (
                SELECT id_Estado
                FROM estados_pedido
                WHERE NombreEstado IN
                    ('pendiente', 'preparando')
            )
        `;

        db.query(
            query,
            [
                motivo,
                !!requiereReembolso,
                id
            ],
            callback
        );
    },

    // Cancela cualquier pedido sin pagar que haya quedado "pendiente"
    // en una mesa — se usa cuando el mesero la libera (cliente
    // anterior se fue sin terminar de pagar), para que un cliente
    // nuevo que escanee el mismo QR no herede ese carrito a medias.
    // Nunca toca pedidos ya pagados o en preparación/listos.
    cancelarPendientesSinPagarDeLaMesa: (idMesa, callback) => {

        const query = `
            UPDATE Pedidos

            SET
                id_Estado = (
                    SELECT id_Estado
                    FROM estados_pedido
                    WHERE NombreEstado = 'cancelado'
                ),
                MotivoCancelacion = 'Mesa liberada sin completar el pago'

            WHERE id_Pedidos IN (
                  SELECT id_Pedidos
                  FROM Mesas_Pedidos
                  WHERE id_Mesas = ?
              )
              AND EstadoPago != 'aprobado'
              AND id_Estado IN (
                  SELECT id_Estado
                  FROM estados_pedido
                  WHERE NombreEstado = 'pendiente'
              )
        `;

        db.query(query, [idMesa], callback);
    },

    /*
     * Marca un reembolso pendiente como ya devuelto al
     * cliente. Solo tiene efecto si el pedido en verdad
     * tenía un reembolso pendiente (evita marcar como
     * reembolsado algo que nunca lo estuvo).
     */
    marcarReembolsado: (id, callback) => {

        const query = `
            UPDATE Pedidos

            SET EstadoReembolso = 'reembolsado'

            WHERE id_Pedidos = ?
              AND EstadoReembolso = 'pendiente'
        `;

        db.query(query, [id], callback);
    },

    cerrarCuenta: (id, metodoPago, callback) => {

        const query = `
            UPDATE Pedidos

            SET
                id_Estado = (
                    SELECT id_Estado
                    FROM estados_pedido
                    WHERE NombreEstado = 'entregado'
                ),

                id_MetodoPago = (
                    SELECT id_MetodoPago
                    FROM metodo_pago
                    WHERE NombreMetodo = ?
                ),

                EstadoPago = 'aprobado',
                FechaPago = NOW(),

                ReferenciaPago =
                    CONCAT(
                        'MES-',
                        DATE_FORMAT(NOW(), '%y%m%d'),
                        '-',
                        LPAD(FLOOR(RAND() * 999999), 6, '0')
                    ),

                MotivoPago = 'Pago registrado por mesero'

            WHERE id_Pedidos = ?
              AND EstadoPago <> 'aprobado'
        `;

        db.query(query, [metodoPago, id], callback);
    },

    vincularMesa: (idPedido, idMesa, callback) => {

        const query = `
            INSERT INTO Mesas_Pedidos
                (id_Mesas, id_Pedidos)

            VALUES (?, ?)
        `;

        db.query(query, [idMesa, idPedido], callback);
    }
};

module.exports = PedidoModel;
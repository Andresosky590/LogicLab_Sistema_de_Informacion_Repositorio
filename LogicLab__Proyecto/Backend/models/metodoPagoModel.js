const db = require("../config/db");

const MetodoPagoModel = {

    // Solo los métodos habilitados para el checkout en línea del cliente
    // (Disponible_Online = 1) — Efectivo/Tarjeta/Transferencia genéricos
    // quedan fuera, esos son para cuando el mesero cierra la cuenta
    // manualmente (HU09), no para el pago simulado del cliente.
    findOnline: (callback) => {
        const query = `
            SELECT id_MetodoPago, NombreMetodo
            FROM metodo_pago
            WHERE Disponible_Online = 1
            ORDER BY id_MetodoPago ASC
        `;
        db.query(query, callback);
    },

    // Todos los métodos, incluidos Efectivo/Tarjeta/Transferencia.
    // Para pantallas de personal (mesero) que cobra en persona,
    // donde tiene sentido aceptar cualquier método del restaurante.
    findAll: (callback) => {
        const query = `
            SELECT id_MetodoPago, NombreMetodo, Disponible_Online
            FROM metodo_pago
            ORDER BY id_MetodoPago ASC
        `;
        db.query(query, callback);
    },

};

module.exports = MetodoPagoModel;
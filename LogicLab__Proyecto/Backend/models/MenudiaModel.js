const db = require("../config/db");

const MenuDiaModel = {

    // Trae el menú activo de hoy junto con sus ítems (sopas, proteínas, etc.)
    findHoy: (callback) => {
        const queryMenu = `
            SELECT id_Menu, Fecha, Precio, activo
            FROM menu_dia
            WHERE Fecha = CURDATE() AND activo = 1
            LIMIT 1
        `;
        db.query(queryMenu, (err, menus) => {
            if (err) return callback(err);
            if (menus.length === 0) return callback(null, null);

            const menu = menus[0];
            // Traemos los items del menú, uniendo con la tabla real de platos
            // cuando id_Platos no es el sentinel 9999 (Corriente del Día).
            const queryItems = `
                SELECT mdi.id_Item, mdi.id_Platos, mdi.Categoria, mdi.NombreItem,
                       p.NombrePlato, p.Descripcion, p.Precio, p.id_Categoria, p.ImagenUrl
                FROM menu_dia_items mdi
                LEFT JOIN platos p
                    ON p.id_Platos = mdi.id_Platos AND mdi.id_Platos != 9999
                WHERE mdi.id_Menu = ?
            `;
            db.query(queryItems, [menu.id_Menu], (err, rows) => {
                if (err) return callback(err);

                const items = rows.map(row => {
                    if (row.id_Platos === 9999) {
                        // Corriente del Día: no es un plato real, se arma con
                        // el precio fijo del menú y la descripción guardada.
                        // No tiene ImagenUrl propia — el frontend cae a la
                        // imagen genérica de categoría cuando viene null.
                        return {
                            id_Platos: 9999,
                            NombrePlato: "Corriente del Día",
                            Descripcion: row.NombreItem,
                            Precio: menu.Precio,
                            id_Categoria: 1,
                            ImagenUrl: null
                        };
                    }
                    return {
                        id_Platos: row.id_Platos,
                        NombrePlato: row.NombrePlato,
                        Descripcion: row.Descripcion,
                        Precio: row.Precio,
                        id_Categoria: row.id_Categoria,
                        ImagenUrl: row.ImagenUrl
                    };
                });

                callback(null, { ...menu, items });
            });
        });
    },

    // Publica (crea o reemplaza) el menú de hoy con su precio y sus ítems.
    // datos: { precio, items: [{ id_Platos, categoria, nombreItem }] }
    // id_Platos: id real del plato, o el sentinel 9999 para la Corriente del Día
    // (en ese caso nombreItem trae la descripción armada: "Sopa: X • Proteína: Y...").
    publicar: (datos, callback) => {
        const queryUpsert = `
            INSERT INTO menu_dia (Fecha, Precio, activo)
            VALUES (CURDATE(), ?, 1)
            ON DUPLICATE KEY UPDATE Precio = VALUES(Precio), activo = 1
        `;
        db.query(queryUpsert, [datos.precio], (err) => {
            if (err) return callback(err);

            db.query(`SELECT id_Menu FROM menu_dia WHERE Fecha = CURDATE()`, (err, rows) => {
                if (err) return callback(err);
                const idMenu = rows[0].id_Menu;

                // Se reemplazan los ítems del día (simple: borrar e insertar de nuevo)
                db.query(`DELETE FROM menu_dia_items WHERE id_Menu = ?`, [idMenu], (err) => {
                    if (err) return callback(err);

                    const items = datos.items || [];
                    if (items.length === 0) return callback(null, { idMenu });

                    const valores = items.map(it => [idMenu, it.id_Platos, it.categoria, it.nombreItem]);
                    db.query(
                        `INSERT INTO menu_dia_items (id_Menu, id_Platos, Categoria, NombreItem) VALUES ?`,
                        [valores],
                        (err) => {
                            if (err) return callback(err);
                            callback(null, { idMenu });
                        }
                    );
                });
            });
        });
    },

    // Desactiva el menú de hoy (equivalente al "Limpiar" de la web)
    desactivarHoy: (callback) => {
        db.query(`UPDATE menu_dia SET activo = 0 WHERE Fecha = CURDATE()`, callback);
    }
};

module.exports = MenuDiaModel;
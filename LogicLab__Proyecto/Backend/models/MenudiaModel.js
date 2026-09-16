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
            const queryItems = `
                SELECT id_Item, Categoria, NombreItem
                FROM menu_dia_items
                WHERE id_Menu = ?
            `;
            db.query(queryItems, [menu.id_Menu], (err, items) => {
                if (err) return callback(err);
                callback(null, { ...menu, items });
            });
        });
    },

    // Publica (crea o reemplaza) el menú de hoy con su precio y sus ítems.
    // datos: { precio, items: [{ categoria, nombreItem }] }
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

                    const valores = items.map(it => [idMenu, it.categoria, it.nombreItem]);
                    db.query(
                        `INSERT INTO menu_dia_items (id_Menu, Categoria, NombreItem) VALUES ?`,
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
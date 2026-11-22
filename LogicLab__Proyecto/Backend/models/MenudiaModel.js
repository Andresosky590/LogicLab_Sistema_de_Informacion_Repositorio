const db = require("../config/db");

// Ejecuta `trabajo` dentro de una transacción. Sirve tanto con un pool
// (producción) como con una conexión única (desarrollo local).
const conTransaccion = (trabajo, callback) => {
    const ejecutar = (con, liberar) => {
        con.beginTransaction((err) => {
            if (err) { liberar(); return callback(err); }
            trabajo(con, (err, resultado) => {
                if (err) return con.rollback(() => { liberar(); callback(err); });
                con.commit((err) => {
                    if (err) return con.rollback(() => { liberar(); callback(err); });
                    liberar();
                    callback(null, resultado);
                });
            });
        });
    };

    if (typeof db.getConnection === "function") {
        db.getConnection((err, con) => (err ? callback(err) : ejecutar(con, () => con.release())));
    } else {
        ejecutar(db, () => {});
    }
};

const MenuDiaModel = {

    // Menú activo de hoy, organizado por secciones.
    // `items` es la lista plana de todos sus platos, para las pantallas
    // que no necesitan las secciones (mesero, cocina, pedido asistido).
    findHoy: (callback) => {
        db.query(
            `SELECT id_Menu, Fecha, activo FROM menu_dia
             WHERE Fecha = CURDATE() AND activo = 1 LIMIT 1`,
            (err, menus) => {
                if (err) return callback(err);
                if (menus.length === 0) return callback(null, null);
                const menu = menus[0];

                const query = `
                    SELECT s.id_Seccion, s.Nombre, s.Orden,
                           p.id_Platos, p.NombrePlato, p.Descripcion, p.Precio,
                           p.id_Categoria, p.ImagenUrl, p.Disponible
                    FROM menu_dia_secciones s
                    LEFT JOIN menu_seccion_items i ON i.id_Seccion = s.id_Seccion
                    LEFT JOIN platos p ON p.id_Platos = i.id_Platos
                    WHERE s.id_Menu = ?
                    ORDER BY s.Orden, i.Orden
                `;
                db.query(query, [menu.id_Menu], (err, filas) => {
                    if (err) return callback(err);

                    const secciones = [];
                    const porId = {};
                    filas.forEach(f => {
                        if (!porId[f.id_Seccion]) {
                            porId[f.id_Seccion] = { id_Seccion: f.id_Seccion, Nombre: f.Nombre, Orden: f.Orden, platos: [] };
                            secciones.push(porId[f.id_Seccion]);
                        }
                        if (f.id_Platos) {
                            porId[f.id_Seccion].platos.push({
                                id_Platos: f.id_Platos,
                                NombrePlato: f.NombrePlato,
                                Descripcion: f.Descripcion,
                                Precio: f.Precio,
                                id_Categoria: f.id_Categoria,
                                ImagenUrl: f.ImagenUrl,
                                Disponible: f.Disponible
                            });
                        }
                    });

                    callback(null, {
                        ...menu,
                        secciones,
                        items: secciones.flatMap(s => s.platos)
                    });
                });
            }
        );
    },

    // Para validar antes de publicar: ¿existen y están activos?
    contarPlatosActivos: (ids, callback) => {
        db.query(
            `SELECT COUNT(*) AS total FROM platos WHERE Activo = 1 AND id_Platos IN (?)`,
            [ids],
            (err, filas) => (err ? callback(err) : callback(null, filas[0].total))
        );
    },

    // Publica (crea o reemplaza) el menú de hoy, todo en una transacción:
    // si algo falla, el menú anterior queda intacto.
    // secciones: [{ nombre, platos: [id_Platos, ...] }] (el orden es el de pantalla)
    publicar: (secciones, callback) => {
        conTransaccion((con, terminar) => {
            con.query(
                `INSERT INTO menu_dia (Fecha, activo) VALUES (CURDATE(), 1)
                 ON DUPLICATE KEY UPDATE activo = 1`,
                (err) => {
                    if (err) return terminar(err);
                    con.query(`SELECT id_Menu FROM menu_dia WHERE Fecha = CURDATE()`, (err, filas) => {
                        if (err) return terminar(err);
                        const idMenu = filas[0].id_Menu;

                        // Borrar las secciones borra también sus ítems (ON DELETE CASCADE)
                        con.query(`DELETE FROM menu_dia_secciones WHERE id_Menu = ?`, [idMenu], (err) => {
                            if (err) return terminar(err);

                            const insertarSeccion = (indice) => {
                                if (indice === secciones.length) return terminar(null, { idMenu });
                                const s = secciones[indice];
                                con.query(
                                    `INSERT INTO menu_dia_secciones (id_Menu, Nombre, Orden) VALUES (?, ?, ?)`,
                                    [idMenu, s.nombre, indice],
                                    (err, resultado) => {
                                        if (err) return terminar(err);
                                        const valores = s.platos.map((idPlato, orden) => [resultado.insertId, idPlato, orden]);
                                        con.query(
                                            `INSERT INTO menu_seccion_items (id_Seccion, id_Platos, Orden) VALUES ?`,
                                            [valores],
                                            (err) => (err ? terminar(err) : insertarSeccion(indice + 1))
                                        );
                                    }
                                );
                            };
                            insertarSeccion(0);
                        });
                    });
                }
            );
        }, callback);
    },

    // Desactiva el menú de hoy (botón "Limpiar")
    desactivarHoy: (callback) => {
        db.query(`UPDATE menu_dia SET activo = 0 WHERE Fecha = CURDATE()`, callback);
    }
};

module.exports = MenuDiaModel;
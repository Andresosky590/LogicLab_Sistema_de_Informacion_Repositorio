const MenuDiaModel = require("../models/MenudiaModel");

const MenuDiaController = {

    // GET /api/menu-dia/hoy
    getMenuHoy: (req, res) => {
        MenuDiaModel.findHoy((err, menu) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            if (!menu) return res.status(200).json(null); // no hay menú publicado hoy
            res.status(200).json(menu);
        });
    },

    // POST /api/menu-dia/publicar
    // Body: { precio, items: [{ categoria, nombreItem }] }
    publicarMenu: (req, res) => {
        const { precio, items } = req.body;

        if (!precio) {
            return res.status(400).json({ message: "El precio del menú es obligatorio" });
        }

        MenuDiaModel.publicar({ precio, items }, (err, result) => {
            if (err) return res.status(500).json({ error: "Error al publicar el menú del día" });
            res.status(201).json({ message: "Menú del día publicado correctamente", idMenu: result.idMenu });
        });
    },

    // PUT /api/menu-dia/desactivar
    desactivarMenu: (req, res) => {
        MenuDiaModel.desactivarHoy((err) => {
            if (err) return res.status(500).json({ error: "Error al desactivar el menú del día" });
            res.status(200).json({ message: "Menú del día desactivado correctamente" });
        });
    }
};

module.exports = MenuDiaController;
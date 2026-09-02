const PlatoModel = require("../models/platoModel");

const PlatoController = {

    getPlatos: (req, res) => {
        PlatoModel.findAll((err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            res.status(200).json(results);
        });
    },

    getCategorias: (req, res) => {
        PlatoModel.findAllCategorias((err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            res.status(200).json(results);
        });
    },

    createPlato: (req, res) => {
        const { nombre, descripcion, precio, id_Categoria } = req.body;

        if (!nombre || !precio || !id_Categoria)
            return res.status(400).json({ message: "Nombre, precio y categoría son obligatorios" });

        PlatoModel.create({ nombre, descripcion, precio, id_Categoria }, (err, result) => {
            if (err) return res.status(500).json({ error: "Error al crear el plato" });
            // ── Devolvemos el id del plato recién insertado ──
            res.status(201).json({
                message: "Plato creado correctamente",
                id: result.insertId          // MySQL devuelve insertId en el resultado
            });
        });
    },

    deletePlato: (req, res) => {
        const { id } = req.params;
        PlatoModel.remove(id, (err) => {
            if (err) return res.status(500).json({ error: "Error al eliminar el plato" });
            res.status(200).json({ message: "Plato eliminado correctamente" });
        });
    },

    updatePlato: (req, res) => {
        const { id } = req.params;
        const { descripcion, precio } = req.body;

        if (!precio) return res.status(400).json({ message: "El precio es obligatorio" });

        PlatoModel.update(id, { descripcion, precio }, (err) => {
            if (err) return res.status(500).json({ error: "Error al actualizar el plato" });
            res.status(200).json({ message: "Plato actualizado correctamente" });
        });
    }
};

module.exports = PlatoController;
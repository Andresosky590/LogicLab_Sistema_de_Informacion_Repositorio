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
        const { nombre, descripcion, precio, id_Categoria, disponible } = req.body;

        if (!nombre || !precio || !id_Categoria)
            return res.status(400).json({ message: "Nombre, precio y categoría son obligatorios" });

        PlatoModel.create({ nombre, descripcion, precio, id_Categoria, disponible }, (err, result) => {
            if (err) return res.status(500).json({ error: "Error al crear el plato" });
            res.status(201).json({
                message: "Plato creado correctamente",
                id: result.insertId
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
    },

    toggleDisponibilidad: (req, res) => {
        const { id } = req.params;
        const { disponible } = req.body;

        if (disponible === undefined) {
            return res.status(400).json({ message: "El campo 'disponible' es obligatorio" });
        }

        PlatoModel.updateDisponibilidad(id, disponible, (err) => {
            if (err) return res.status(500).json({ error: "Error al actualizar la disponibilidad" });
            res.status(200).json({ message: "Disponibilidad actualizada correctamente" });
        });
    },

    // PUT /api/categorias/desactivar/:id (admin)
    desactivarCategoria: (req, res) => {
        const { id } = req.params;
        PlatoModel.desactivarCategoria(id, (err) => {
            if (err) return res.status(500).json({ error: "Error al desactivar la categoría" });
            res.status(200).json({ message: "Categoría desactivada correctamente" });
        });
    },

    // PUT /api/categorias/reactivar/:id (admin)
    reactivarCategoria: (req, res) => {
        const { id } = req.params;
        PlatoModel.reactivarCategoria(id, (err) => {
            if (err) return res.status(500).json({ error: "Error al reactivar la categoría" });
            res.status(200).json({ message: "Categoría reactivada correctamente" });
        });
    }
};

module.exports = PlatoController;
const fs = require("fs");
const path = require("path");
const PlatoModel = require("../models/platoModel");

/*
 * Borra un archivo de imagen del disco de forma segura: si no existe,
 * o si la URL no apunta a un archivo local nuestro (por ejemplo, quedó
 * vacía), simplemente no hace nada. Nunca lanza error hacia arriba —
 * es "mejor esfuerzo", no queremos que falle una operación de BD por
 * no poder borrar un archivo viejo.
 */
const borrarImagenSiExiste = (imagenUrl) => {
    if (!imagenUrl || !imagenUrl.startsWith("/uploads/platos/")) return;

    const rutaArchivo = path.join(
        __dirname, "..", imagenUrl.replace("/uploads/", "uploads/")
    );

    fs.unlink(rutaArchivo, () => {
        // Silencioso a propósito: si el archivo ya no estaba, no importa.
    });
};

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

        // Primero consultamos la imagen para poder borrar el archivo
        // del disco después — si esto falla, igual seguimos con el
        // borrado del plato (el archivo huérfano no es tan grave
        // como bloquear la eliminación por un problema aparte).
        PlatoModel.findById(id, (errBusqueda, filas) => {
            const imagenUrl = (!errBusqueda && filas && filas[0])
                ? filas[0].ImagenUrl
                : null;

            PlatoModel.remove(id, (err) => {
                if (err) return res.status(500).json({ error: "Error al eliminar el plato" });
                borrarImagenSiExiste(imagenUrl);
                res.status(200).json({ message: "Plato eliminado correctamente" });
            });
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

    // POST /api/platos/:id/imagen (multipart, campo "imagen")
    // El middleware uploadImagen.single("imagen") ya guardó el archivo
    // en disco antes de que esta función se ejecute; acá solo falta
    // registrar la URL en la BD y limpiar la imagen anterior si había.
    subirImagen: (req, res) => {
        const { id } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: "No se recibió ninguna imagen." });
        }

        const imagenUrl = `/uploads/platos/${req.file.filename}`;

        PlatoModel.findById(id, (errBusqueda, filas) => {
            const imagenAnterior = (!errBusqueda && filas && filas[0])
                ? filas[0].ImagenUrl
                : null;

            PlatoModel.updateImagen(id, imagenUrl, (err) => {
                if (err) {
                    // La subida a disco sí funcionó pero la BD falló:
                    // no dejamos el archivo huérfano.
                    borrarImagenSiExiste(imagenUrl);
                    return res.status(500).json({ error: "Error al guardar la imagen del plato" });
                }

                borrarImagenSiExiste(imagenAnterior);

                res.status(200).json({
                    message: "Imagen actualizada correctamente",
                    imagenUrl
                });
            });
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
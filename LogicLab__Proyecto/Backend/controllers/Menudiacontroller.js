const MenuDiaModel = require("../models/MenudiaModel");

const MAX_SECCIONES = 12;
const MAX_PLATOS_SECCION = 40;

// Revisa la forma del menú. Devuelve el mensaje del primer error, o null.
const validarSecciones = (secciones) => {
    if (!Array.isArray(secciones) || secciones.length === 0)
        return "El menú debe tener al menos una sección";
    if (secciones.length > MAX_SECCIONES)
        return `El menú no puede tener más de ${MAX_SECCIONES} secciones`;

    for (const s of secciones) {
        const nombre = typeof s?.nombre === "string" ? s.nombre.trim() : "";
        if (!nombre || nombre.length > 60) return "Cada sección necesita un nombre de máximo 60 caracteres";
        if (!Array.isArray(s.platos) || s.platos.length === 0) return `La sección "${nombre}" está vacía`;
        if (s.platos.length > MAX_PLATOS_SECCION) return `La sección "${nombre}" tiene demasiados platos`;
        if (s.platos.some(id => !Number.isInteger(id))) return `La sección "${nombre}" tiene un plato no válido`;
        if (new Set(s.platos).size !== s.platos.length) return `La sección "${nombre}" tiene platos repetidos`;
    }
    return null;
};

const MenuDiaController = {

    // GET /api/menu-dia/hoy (pública)
    getMenuHoy: (req, res) => {
        MenuDiaModel.findHoy((err, menu) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            res.status(200).json(menu); // null si no hay menú publicado hoy
        });
    },

    // POST /api/menu-dia/publicar (admin)
    // Body: { secciones: [{ nombre, platos: [id_Platos, ...] }] }
    publicarMenu: (req, res) => {
        const { secciones } = req.body || {};
        const error = validarSecciones(secciones);
        if (error) return res.status(400).json({ message: error });

        const limpias = secciones.map(s => ({ nombre: s.nombre.trim(), platos: s.platos }));
        const ids = [...new Set(limpias.flatMap(s => s.platos))];

        // Confirmar que todos los platos existan y sigan activos
        MenuDiaModel.contarPlatosActivos(ids, (err, total) => {
            if (err) return res.status(500).json({ error: "Error al publicar el menú del día" });
            if (total !== ids.length) return res.status(400).json({ message: "Algún plato del menú ya no existe" });

            MenuDiaModel.publicar(limpias, (err, resultado) => {
                if (err) {
                    console.error("Error al publicar el menú del día:", err);
                    return res.status(500).json({ error: "Error al publicar el menú del día" });
                }
                res.status(201).json({ message: "Menú del día publicado correctamente", idMenu: resultado.idMenu });
            });
        });
    },

    // PUT /api/menu-dia/desactivar (admin)
    desactivarMenu: (req, res) => {
        MenuDiaModel.desactivarHoy((err) => {
            if (err) return res.status(500).json({ error: "Error al desactivar el menú del día" });
            res.status(200).json({ message: "Menú del día desactivado correctamente" });
        });
    }
};

module.exports = MenuDiaController;
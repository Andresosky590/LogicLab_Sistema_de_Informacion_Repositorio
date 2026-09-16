const UserService = require("../services/userService");

const UserController = {

    getUsers: (req, res) => {
        UserService.getAllUsers((err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            if (results.length === 0) return res.status(200).json({ message: "No hay registros" });
            res.status(200).json(results);
        });
    },

    // GET /api/usuarios/listar-todos (admin) — incluye usuarios inactivos
    getUsersConInactivos: (req, res) => {
        UserService.getAllUsersConInactivos((err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            res.status(200).json(results);
        });
    },

    getUserById: (req, res) => {
        const { id } = req.params;
        UserService.getUserById(id, (err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            if (results.length === 0) return res.status(404).json({ message: "No hay registros con ese ID" });
            res.status(200).json(results[0]);
        });
    },

    register: (req, res) => {
        const { nombre, apellido, email, password, tipoDocId, rolId } = req.body;
        if (!nombre || !apellido || !email || !password || !tipoDocId || !rolId)
            return res.status(400).json({ message: "Todos los campos son obligatorios" });

        UserService.registerUser({ nombre, apellido, email, password, tipoDocId, rolId }, (err) => {
            if (err) {
                if (err.status) return res.status(err.status).json({ message: err.message });
                return res.status(500).json({ error: "Error al registrar el usuario" });
            }
            res.status(201).json({ message: "Usuario registrado correctamente" });
        });
    },

    login: (req, res) => {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: "Email y contraseña son requeridos" });

        UserService.loginUser(email, password, (err, usuarioValido) => {
            if (err) {
                if (err.status) return res.status(err.status).json({ message: err.message });
                return res.status(500).json({ error: "Error en el proceso de autenticación" });
            }
            res.status(200).json({ 
                mensaje: "Autenticación exitosa", 
                usuario: usuarioValido.usuario,
                token: usuarioValido.token
            });
        });
    },

    // ── Actualizar — password es opcional ────────────────────────────────────
    updateUser: (req, res) => {
        const { id } = req.params;
        const { nombre, apellido, email, password, rolId } = req.body;

        if (!nombre || !apellido || !email || !rolId)
            return res.status(400).json({ message: "Nombre, apellido, email y rol son obligatorios" });

        UserService.updateUser(id, { nombre, apellido, email, password: password || null, rolId }, (err) => {
            if (err) {
                if (err.status) return res.status(err.status).json({ message: err.message });
                return res.status(500).json({ error: "Error al actualizar el usuario" });
            }
            res.status(200).json({ message: "Usuario actualizado correctamente" });
        });
    },

    // Ya no borra físicamente — desactiva al usuario (borrado lógico)
    deleteUser: (req, res) => {
        const { id } = req.params;
        UserService.deleteUser(id, (err) => {
            if (err) return res.status(500).json({ error: "Error al desactivar el usuario" });
            res.status(200).json({ message: "Usuario desactivado correctamente" });
        });
    },

    // PUT /api/usuarios/reactivar/:id (admin)
    reactivarUsuario: (req, res) => {
        const { id } = req.params;
        UserService.reactivarUsuario(id, (err) => {
            if (err) return res.status(500).json({ error: "Error al reactivar el usuario" });
            res.status(200).json({ message: "Usuario reactivado correctamente" });
        });
    }
};

module.exports = UserController;
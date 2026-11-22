const UserService = require("../services/userService");

const ROLES_SOLICITUD = [1, 2];    // Mesero, Cocinero (lo que puede pedir un empleado nuevo)
const ROLES_ADMIN     = [1, 2, 3]; // el admin puede crear cualquier rol
const EMAIL_VALIDO    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOC_VALIDO      = /^[A-Za-z0-9]{5,20}$/; // cabe en Numero_Documento varchar(20)

// Devuelve el mensaje del primer error, o null si todo está bien
const validarDatos = ({ email, password, rolId, numeroDocumento }, rolesPermitidos) => {
    if (!EMAIL_VALIDO.test(String(email).trim())) return "El correo no tiene un formato válido";
    if (typeof password !== "string" || password.length < 6) return "La contraseña debe tener al menos 6 caracteres";
    if (!rolesPermitidos.includes(Number(rolId))) return "Rol no permitido";
    if (numeroDocumento !== undefined && !DOC_VALIDO.test(String(numeroDocumento).trim()))
        return "El número de documento debe tener entre 5 y 20 letras o números, sin espacios ni puntos";
    return null;
};

// Traduce los errores del servicio o de MySQL a una respuesta HTTP
const responderError = (res, err, mensaje500) => {
    if (err.status) return res.status(err.status).json({ message: err.message });
    if (err.code === "ER_DUP_ENTRY") {
        const campo = String(err.sqlMessage).includes("Numero_Documento") ? "número de documento" : "correo";
        return res.status(409).json({ message: `Ese ${campo} ya está registrado.` });
    }
    console.error(mensaje500 + ":", err);
    return res.status(500).json({ error: mensaje500 });
};

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

    // POST /api/usuarios/registro (admin) — crea un empleado ya ACTIVO (HU13)
    register: (req, res) => {
        const { nombre, apellido, email, password, tipoDocId, rolId } = req.body || {};
        if (!nombre || !apellido || !email || !password || !tipoDocId || !rolId)
            return res.status(400).json({ message: "Todos los campos son obligatorios" });

        const error = validarDatos({ email, password, rolId }, ROLES_ADMIN);
        if (error) return res.status(400).json({ message: error });

        UserService.registerUser(
            { nombre: nombre.trim(), apellido: apellido.trim(), email: email.trim(), password, tipoDocId, rolId: Number(rolId) },
            "activo",
            (err) => {
                if (err) return responderError(res, err, "Error al registrar el usuario");
                res.status(201).json({ message: "Usuario registrado correctamente" });
            }
        );
    },

    // POST /api/usuarios/solicitud-registro (pública) — queda PENDIENTE
    solicitarRegistro: (req, res) => {
        const { nombre, apellido, email, password, tipoDocId, numeroDocumento, rolId } = req.body || {};
        if (!nombre || !apellido || !email || !password || !tipoDocId || !numeroDocumento || !rolId)
            return res.status(400).json({ message: "Todos los campos son obligatorios" });

        const error = validarDatos({ email, password, rolId, numeroDocumento }, ROLES_SOLICITUD);
        if (error) return res.status(400).json({ message: error });

        UserService.solicitarRegistro({
            nombre:          nombre.trim(),
            apellido:        apellido.trim(),
            email:           email.trim(),
            password,
            tipoDocId:       Number(tipoDocId),
            numeroDocumento: String(numeroDocumento).trim(),
            rolId:           Number(rolId)
        }, (err) => {
            if (err) return responderError(res, err, "Error al enviar la solicitud");
            res.status(201).json({ message: "Solicitud enviada. El administrador debe aprobarla antes de que puedas ingresar." });
        });
    },

    // GET /api/usuarios/solicitudes (admin)
    getSolicitudes: (req, res) => {
        UserService.getSolicitudes((err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            res.status(200).json(results);
        });
    },

    // PUT /api/usuarios/solicitudes/:id/aprobar (admin)  { rolId }
    aprobarSolicitud: (req, res) => {
        const rolId = Number((req.body || {}).rolId);
        if (!ROLES_SOLICITUD.includes(rolId))
            return res.status(400).json({ message: "El rol debe ser Mesero o Cocinero" });

        UserService.aprobarSolicitud(req.params.id, rolId, (err) => {
            if (err) return responderError(res, err, "Error al aprobar la solicitud");
            res.status(200).json({ message: "Solicitud aprobada. El empleado ya puede iniciar sesión." });
        });
    },

    // DELETE /api/usuarios/solicitudes/:id (admin)
    descartarSolicitud: (req, res) => {
        UserService.descartarSolicitud(req.params.id, (err) => {
            if (err) return responderError(res, err, "Error al descartar la solicitud");
            res.status(200).json({ message: "Solicitud descartada" });
        });
    },

    // GET /api/tipos-documento (pública) — solo los activos
    getTiposDocumento: (req, res) => {
        UserService.getTiposDocumento((err, results) => {
            if (err) return res.status(500).json({ error: "Error interno del servidor" });
            res.status(200).json(results);
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
            if (err) return responderError(res, err, "Error al actualizar el usuario");
            res.status(200).json({ message: "Usuario actualizado correctamente" });
        });
    },

    // Ya no borra físicamente — desactiva al usuario (borrado lógico)
    deleteUser: (req, res) => {
        const { id } = req.params;
        UserService.deleteUser(id, (err, result) => {
            if (err) return res.status(500).json({ error: "Error al desactivar el usuario" });
            if (result.affectedRows === 0) return res.status(404).json({ message: "El usuario no existe o ya está inactivo" });
            res.status(200).json({ message: "Usuario desactivado correctamente" });
        });
    },

    // PUT /api/usuarios/reactivar/:id (admin)
    reactivarUsuario: (req, res) => {
        const { id } = req.params;
        UserService.reactivarUsuario(id, (err, result) => {
            if (err) return res.status(500).json({ error: "Error al reactivar el usuario" });
            if (result.affectedRows === 0) return res.status(404).json({ message: "El usuario no existe o no está inactivo" });
            res.status(200).json({ message: "Usuario reactivado correctamente" });
        });
    },

    // POST /api/usuarios/solicitar-codigo  { email }
    // Público. Siempre responde 200 (exista o no el correo) salvo que falle el envío.
    solicitarCodigo: (req, res) => {
        const { email } = req.body || {};
        if (!email || typeof email !== "string" || !email.trim())
            return res.status(400).json({ message: "El correo es obligatorio" });

        UserService.solicitarCodigo(email.trim(), (err) => {
            if (err) {
                console.error("Error al enviar el código de recuperación:", err);
                return res.status(500).json({ message: "No se pudo enviar el código. Intenta de nuevo más tarde." });
            }
            res.status(200).json({ message: "Si el correo está registrado, te enviamos un código de verificación." });
        });
    },

    // POST /api/usuarios/restablecer-password  { email, codigo, nuevaPassword }
    // Público. Valida el código de 6 dígitos y cambia la contraseña.
    restablecerPassword: (req, res) => {
        const { email, codigo, nuevaPassword } = req.body || {};

        if (!email || !codigo || !nuevaPassword)
            return res.status(400).json({ message: "Correo, código y nueva contraseña son obligatorios" });
        if (!/^\d{6}$/.test(String(codigo).trim()))
            return res.status(400).json({ message: "El código debe tener 6 dígitos" });
        if (typeof nuevaPassword !== "string" || nuevaPassword.length < 6)
            return res.status(400).json({ message: "La contraseña debe tener al menos 6 caracteres" });

        UserService.restablecerPassword(String(email).trim(), String(codigo).trim(), nuevaPassword, (err) => {
            if (err) {
                if (err.status) return res.status(err.status).json({ message: err.message });
                console.error("Error al restablecer la contraseña:", err);
                return res.status(500).json({ message: "Error al restablecer la contraseña" });
            }
            res.status(200).json({ message: "Contraseña actualizada correctamente" });
        });
    }
};

module.exports = UserController;
const crypto = require("crypto");
const UserModel = require("../models/userModel");
const CodigoModel = require("../models/codigoRecuperacionModel");
const EmailService = require("./emailService");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")

const { JWT_SECRET: SECRET } = require("../config/auth")

// ── Recuperación de contraseña ───────────────────────────────────────────
const MINUTOS_VIGENCIA      = 15; // el código vence a los 15 minutos
const SEGUNDOS_ENTRE_ENVIOS = 60; // anti-spam: mínimo 1 min entre códigos
const MAX_INTENTOS          = 5;  // equivocaciones permitidas por código

// En la BD solo se guarda el hash del código, nunca el código en claro.
const hashCodigo = (codigo) =>
    crypto.createHash("sha256").update(String(codigo)).digest("hex");

const codigoCoincide = (codigo, hashGuardado) => {
    const a = Buffer.from(hashCodigo(codigo));
    const b = Buffer.from(hashGuardado);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const UserService = {

    getAllUsers: (callback) => {
        UserModel.findAll(callback);
    },

    // Para el admin: activos e inactivos (para poder reactivar)
    getAllUsersConInactivos: (callback) => {
        UserModel.findAllConInactivos(callback);
    },

    getUserById: (id, callback) => {
        UserModel.findById(id, callback);
    },

    // ── Crear usuario ─────────────────────────────────────────────────────────
    // estado = "activo"   → lo crea el administrador (HU13)
    // estado = "pendiente" → solicitud pública de un empleado nuevo
    registerUser: (userData, estado, callback) => {
        UserModel.findByEmail(userData.email, (err, results) => {
            if (err) return callback(err);
            if (results.length > 0)
                return callback({ status: 409, message: "Ese correo ya está registrado." });

            bcrypt.hash(userData.password, 10, (err, hashedPassword) => {
                if (err) return callback(err);
                UserModel.create({ ...userData, hashedPassword }, estado, callback);
            });
        });
    },

    // ── Solicitud de registro (pública) ──────────────────────────────────────
    // Antes de guardar confirma que el tipo de documento esté activo.
    solicitarRegistro: (userData, callback) => {
        UserModel.tiposDocumentoActivos((err, tipos) => {
            if (err) return callback(err);
            const valido = tipos.some(t => t.id_Tipo_Documento === Number(userData.tipoDocId));
            if (!valido)
                return callback({ status: 400, message: "Tipo de documento no válido." });

            UserService.registerUser(userData, "pendiente", callback);
        });
    },

    getSolicitudes: (callback) => {
        UserModel.findPendientes(callback);
    },

    // ── Aprobar solicitud ─────────────────────────────────────────────────────
    // El correo de aviso es opcional: si falla, la aprobación igual queda hecha.
    aprobarSolicitud: (id, rolId, callback) => {
        UserModel.findById(id, (err, results) => {
            if (err) return callback(err);
            const usuario = results[0];
            if (!usuario || usuario.Estado !== "pendiente")
                return callback({ status: 404, message: "La solicitud no existe o ya fue atendida." });

            UserModel.aprobar(id, rolId, (err) => {
                if (err) return callback(err);

                EmailService.enviarAprobacionCuenta(usuario.Email, usuario.Nombre)
                    .catch(errCorreo => console.error("No se envió el correo de aprobación:", errCorreo.message));

                callback(null);
            });
        });
    },

    // ── Descartar solicitud (se elimina) ─────────────────────────────────────
    descartarSolicitud: (id, callback) => {
        UserModel.descartar(id, (err, result) => {
            if (err) return callback(err);
            if (result.affectedRows === 0)
                return callback({ status: 404, message: "La solicitud no existe o ya fue atendida." });
            callback(null);
        });
    },

    getTiposDocumento: (callback) => {
        UserModel.tiposDocumentoActivos(callback);
    },

    // ── Login ─────────────────────────────────────────────────────────────────
    // Primero se valida la contraseña y DESPUÉS el estado: así, sin la clave
    // correcta nadie puede averiguar si un correo está pendiente o inactivo.
    loginUser: (email, password, callback) => {
        UserModel.findByEmail(email, (err, results) => {
            if (err) return callback(err);
            if (results.length === 0)
                return callback({ status: 401, message: "Credenciales inválidas" });

            const usuario = results[0];

            bcrypt.compare(password, usuario.Contraseña_hash, (err, passwordCorrecto) => {
                if (err) return callback(err);
                if (!passwordCorrecto)
                    return callback({ status: 401, message: "Credenciales inválidas" });

                if (usuario.Estado === "pendiente")
                    return callback({ status: 403, message: "Tu solicitud está pendiente de aprobación." });
                if (usuario.Estado !== "activo")
                    return callback({ status: 403, message: "Este usuario está inactivo." });

                const token = jwt.sign(
                    { id: usuario.id_Usuarios_Restaurante, rolId: usuario.id_Roles_Usuarios },
                    SECRET,
                    { expiresIn: "8h" }
                );

                return callback(null, {
                    usuario: {
                        id:       usuario.id_Usuarios_Restaurante,
                        nombre:   usuario.Nombre,
                        apellido: usuario.Apellido,
                        email:    usuario.Email,
                        rolId:    usuario.id_Roles_Usuarios
                    },
                    token
                });
            });
        });
    },

    // ── Actualizar usuario ────────────────────────────────────────────────────
    // Si viene password la reencripta; si no, la deja intacta.
    updateUser: (id, userData, callback) => {
        const campos = {
            nombre:   userData.nombre,
            apellido: userData.apellido,
            email:    userData.email,
            rolId:    userData.rolId
        };
        if (!userData.password) return UserModel.update(id, campos, callback);

        bcrypt.hash(userData.password, 10, (err, hashedPassword) => {
            if (err) return callback(err);
            UserModel.updateConPassword(id, { ...campos, hashedPassword }, callback);
        });
    },

    // ── Desactivar (borrado lógico) ──────────────────────────────────────────
    deleteUser: (id, callback) => {
        UserModel.delete(id, callback);
    },

    reactivarUsuario: (id, callback) => {
        UserModel.reactivar(id, callback);
    },

    // ── Recuperar contraseña · paso 1: enviar el código por correo ──────────
    // Si el correo no existe (o el usuario está inactivo) responde igual que
    // si existiera y no envía nada: así no se puede averiguar qué correos
    // están registrados.
    solicitarCodigo: (email, callback) => {
        UserModel.findByEmail(email, (err, results) => {
            if (err) return callback(err);

            const usuario = results[0];
            if (!usuario || usuario.Estado !== "activo") return callback(null);

            const idUsuario = usuario.id_Usuarios_Restaurante;

            CodigoModel.findByUsuario(idUsuario, (err, codigos) => {
                if (err) return callback(err);

                // Si acaba de pedir uno, no se genera otro todavía.
                if (codigos.length > 0 && Number(codigos[0].Segundos) < SEGUNDOS_ENTRE_ENVIOS)
                    return callback(null);

                const codigo = crypto.randomInt(100000, 1000000).toString();

                CodigoModel.guardar(idUsuario, hashCodigo(codigo), MINUTOS_VIGENCIA, (err) => {
                    if (err) return callback(err);

                    EmailService
                        .enviarCodigoRecuperacion(usuario.Email, usuario.Nombre, codigo, MINUTOS_VIGENCIA)
                        .then(
                            () => callback(null),
                            // Si el correo no salió, se borra el código para
                            // poder reintentar sin esperar el minuto.
                            (errCorreo) => CodigoModel.eliminarPorUsuario(idUsuario, () => callback(errCorreo))
                        );
                });
            });
        });
    },

    // ── Recuperar contraseña · paso 2: validar código y cambiar clave ───────
    restablecerPassword: (email, codigo, nuevaPassword, callback) => {
        const codigoInvalido = { status: 400, message: "El código es incorrecto o ha expirado" };

        UserModel.findByEmail(email, (err, results) => {
            if (err) return callback(err);

            const usuario = results[0];
            if (!usuario || usuario.Estado !== "activo") return callback(codigoInvalido);

            const idUsuario = usuario.id_Usuarios_Restaurante;

            CodigoModel.findByUsuario(idUsuario, (err, codigos) => {
                if (err) return callback(err);

                const registro = codigos[0];
                if (!registro || !registro.Vigente) return callback(codigoInvalido);

                // Demasiadas equivocaciones: el código se invalida.
                if (registro.Intentos >= MAX_INTENTOS) {
                    return CodigoModel.eliminarPorUsuario(idUsuario, () =>
                        callback({ status: 429, message: "Demasiados intentos. Solicita un código nuevo." })
                    );
                }

                if (!codigoCoincide(codigo, registro.Codigo_hash)) {
                    return CodigoModel.sumarIntento(registro.id_Codigo, () => callback(codigoInvalido));
                }

                bcrypt.hash(nuevaPassword, 10, (err, hashedPassword) => {
                    if (err) return callback(err);

                    UserModel.updatePassword(idUsuario, hashedPassword, (err) => {
                        if (err) return callback(err);
                        // El código ya se usó: se elimina para que no sirva dos veces.
                        CodigoModel.eliminarPorUsuario(idUsuario, (err) => callback(err));
                    });
                });
            });
        });
    },
};

module.exports = UserService;
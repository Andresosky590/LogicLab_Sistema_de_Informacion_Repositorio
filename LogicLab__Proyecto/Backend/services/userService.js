const crypto = require("crypto");
const UserModel = require("../models/userModel");
const CodigoModel = require("../models/codigoRecuperacionModel");
const EmailService = require("./emailService");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")

const SECRET = "mangata_secret_password"

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

    // Para el admin: ver también los usuarios inactivos (historial)
    getAllUsersConInactivos: (callback) => {
        UserModel.findAllConInactivos(callback);
    },

    getUserById: (id, callback) => {
        UserModel.findById(id, callback);
    },

    registerUser: (userData, callback) => {
        UserModel.findByEmail(userData.email, (err, results) => {
            if (err) return callback(err);
            if (results.length > 0)
                return callback({ status: 409, message: "El correo ya existe en la base de datos" });

            bcrypt.hash(userData.password, 10, (err, hashedPassword) => {
                if (err) return callback(err);
                UserModel.create({
                    nombre:         userData.nombre,
                    apellido:       userData.apellido,
                    email:          userData.email,
                    hashedPassword: hashedPassword,
                    tipoDocId:      userData.tipoDocId,
                    rolId:          userData.rolId
                }, callback);
            });
        });
    },

    loginUser: (email, password, callback) => {
        UserModel.findByEmail(email, (err, results) => {
            if (err) return callback(err);
            if (results.length === 0)
                return callback({ status: 401, message: "Credenciales inválidas" });

            const usuario = results[0];

            // Un usuario desactivado (ej. empleado que ya no trabaja aquí)
            // no puede volver a iniciar sesión, aunque su registro siga existiendo.
            if (usuario.Activo === 0) {
                return callback({ status: 403, message: "Este usuario está inactivo" });
            }

            bcrypt.compare(password, usuario.Contraseña_hash, (err, passwordCorrecto) => {
                if (err) return callback(err);
                if (!passwordCorrecto)
                    return callback({ status: 401, message: "Credenciales inválidas" });

                const token = jwt.sign(
                    { id: usuario.id_Usuarios_Restaurante, rolId: usuario.id_Roles_Usuarios },
                        SECRET,
                    { expiresIn: "8h" }
                )

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
    // Si viene password la reencripta y usa updateConPassword,
    // si no viene la deja intacta y usa update normal
    updateUser: (id, userData, callback) => {
        if (userData.password) {
            bcrypt.hash(userData.password, 10, (err, hash) => {
                if (err) return callback(err);
                UserModel.updateConPassword(id, {
                    nombre:         userData.nombre,
                    apellido:       userData.apellido,
                    email:          userData.email,
                    rolId:          userData.rolId,
                    hashedPassword: hash
                }, callback);
            });
        } else {
            UserModel.update(id, {
                nombre:   userData.nombre,
                apellido: userData.apellido,
                email:    userData.email,
                rolId:    userData.rolId
            }, callback);
        }
    },

    // ── "Eliminar" usuario (borrado lógico) ─────────────────────────────────
    deleteUser: (id, callback) => {
        UserModel.delete(id, callback);
    },

    // ── Reactivar usuario ────────────────────────────────────────────────────
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
            if (!usuario || usuario.Activo === 0) return callback(null);

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
            if (!usuario || usuario.Activo === 0) return callback(codigoInvalido);

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
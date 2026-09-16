const UserModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")

const SECRET = "mangata_secret_password"

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
};

module.exports = UserService;
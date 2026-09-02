const UserModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")

const SECRET = "mangata_secret_password"

const UserService = {

    getAllUsers: (callback) => {
        UserModel.findAll(callback);
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

    // ── Eliminar usuario ──────────────────────────────────────────────────────
    deleteUser: (id, callback) => {
        UserModel.delete(id, callback);
    },
};

module.exports = UserService;
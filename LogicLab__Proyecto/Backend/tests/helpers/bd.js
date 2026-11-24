// Utilidades para las pruebas de integración: conexión directa a la BD de pruebas
// y creación de usuarios de prueba con distintos estados.
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");

const PASSWORD = "Prueba123";
const USUARIOS = {
    admin:     { email: "admin.prueba@logiclab.test",     rol: 3, estado: "activo" },
    mesero:    { email: "mesero.prueba@logiclab.test",    rol: 1, estado: "activo" },
    pendiente: { email: "pendiente.prueba@logiclab.test", rol: 1, estado: "pendiente" },
    inactivo:  { email: "inactivo.prueba@logiclab.test",  rol: 2, estado: "inactivo" }
};

// Misma zona horaria que usa el backend, para que las fechas coincidan
const conectar = async () => {
    const cx = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        dateStrings: true
    });
    await cx.query("SET time_zone = '-05:00'");
    return cx;
};

// Borra solo las cuentas del dominio de pruebas (@logiclab.test)
const borrarUsuariosPrueba = async (cx) => {
    await cx.query("DELETE FROM usuarios_restaurante WHERE Email LIKE '%@logiclab.test'");
};

const crearUsuariosPrueba = async (cx) => {
    const hash = await bcrypt.hash(PASSWORD, 10);
    await borrarUsuariosPrueba(cx);
    for (const [clave, u] of Object.entries(USUARIOS)) {
        await cx.query(
            `INSERT INTO usuarios_restaurante
                (Nombre, Apellido, Email, Contraseña_hash, id_Tipo_Documento, id_Roles_Usuarios, Estado)
             VALUES (?, 'Prueba', ?, ?, 1, ?, ?)`,
            [clave, u.email, hash, u.rol, u.estado]
        );
    }
};

module.exports = { conectar, crearUsuariosPrueba, borrarUsuariosPrueba, USUARIOS, PASSWORD };
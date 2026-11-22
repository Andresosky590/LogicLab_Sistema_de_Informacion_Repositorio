const mysql = require("mysql2");

// Pool de conexiones: reutiliza varias conexiones y se recupera solo si
// MySQL cierra alguna por inactividad (con una sola conexión, el
// servidor quedaba dando errores hasta reiniciarlo).
// Todo se configura por variables de entorno (config/.env); si no están
// definidas se usan los valores de desarrollo local (XAMPP).
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME || "bd_logiclab",

    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,

    // Sin esto, las columnas DATETIME/DATE llegan como objetos Date de JS,
    // que al convertirse a texto (toISOString) se reinterpretan como si
    // fueran UTC y se corren varias horas — rompiendo comparaciones como
    // "¿este pedido es de hoy?" en el frontend. Con dateStrings, MySQL
    // entrega la fecha tal cual está guardada, como texto plano.
    dateStrings: true
});

// Hora de Colombia (UTC-5 todo el año). Los servidores de AWS vienen en
// UTC: sin esto, NOW() guardaría horas 5 horas adelantadas y se
// descuadrarían "pedidos de hoy" y las alertas de mesas.
pool.on("connection", (connection) => {
    connection.query("SET time_zone = ?", [process.env.DB_TIMEZONE || "-05:00"]);
});

pool.getConnection((error, connection) => {
    if (error) {
        console.error("Error de conexion a Mysql:", error.message);
        return;
    }
    console.log("Conexion a Base de datos MYSQL Correcta");
    connection.release();
});

module.exports = pool;
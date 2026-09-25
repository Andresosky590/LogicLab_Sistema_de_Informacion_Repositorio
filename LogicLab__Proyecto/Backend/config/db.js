const mysql = require("mysql2");

const conexion = mysql.createConnection({
host: "localhost",
database: "bd_logiclab",
user: "root",
password: "",
// Sin esto, las columnas DATETIME/DATE llegan como objetos Date de JS,
// que al convertirse a texto (toISOString) se reinterpretan como si
// fueran UTC y se corren varias horas — rompiendo comparaciones como
// "¿este pedido es de hoy?" en el frontend. Con dateStrings, MySQL
// entrega la fecha tal cual está guardada, como texto plano.
dateStrings: true

});

conexion.connect(error => {
    if(error) {
        console.error('Error de conexion a Mysql:',error.message);
    }else{
        console.log('Conexion a Base de datos MYSQL Correcta');
    }
})

module.exports=conexion;
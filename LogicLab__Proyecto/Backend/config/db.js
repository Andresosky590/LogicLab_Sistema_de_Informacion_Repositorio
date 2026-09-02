const mysql = require("mysql2");

const conexion = mysql.createConnection({
host: "localhost",
database: "bd_logiclab",
user: "root",
password: ""

});

conexion.connect(error => {
    if(error) {
        console.error('Error de conexion a Mysql:',error.message);
    }else{
        console.log('Conexion a Base de datos MYSQL Correcta');
    }
})

module.exports=conexion;
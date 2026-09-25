// Carga Backend/config/.env (EMAIL_USER, EMAIL_PASS) antes de arrancar
// la app. Se usa una ruta absoluta (no el default de dotenv, que solo
// busca ".env" en la carpeta desde donde se corre el comando) porque
// el archivo real vive en la subcarpeta config/, no en la raíz de
// Backend — sin esto, dotenv no lo encontraba nunca (0 variables
// cargadas) y el servicio de correo caía siempre al modo [DEV].
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "config", ".env") });

const app = require("./app");

const PUERTO = 5030;

app.listen(PUERTO, () => {
    console.log(`Servidor corriendo con éxito en http://localhost:${PUERTO}`);
});
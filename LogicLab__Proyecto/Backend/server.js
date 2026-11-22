const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "config", ".env") });

// Hora de Colombia en el servidor (en AWS vendría en UTC). Debe fijarse
// antes de cargar el resto de módulos, porque new Date() la usa.
process.env.TZ = process.env.TZ || "America/Bogota";

const app = require("./app");
const { iniciarRevisionMesas } = require("./services/notificacionService");

const PUERTO = Number(process.env.PORT) || 5030;

app.listen(PUERTO, () => {
    console.log(`Servidor corriendo con éxito en http://localhost:${PUERTO}`);
    iniciarRevisionMesas();
});
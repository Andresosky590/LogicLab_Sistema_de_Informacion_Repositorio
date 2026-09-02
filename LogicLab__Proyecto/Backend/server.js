const app = require("./app");

const PUERTO = 5030;

app.listen(PUERTO, () => {
    console.log(`Servidor corriendo con éxito en http://localhost:${PUERTO}`);
});
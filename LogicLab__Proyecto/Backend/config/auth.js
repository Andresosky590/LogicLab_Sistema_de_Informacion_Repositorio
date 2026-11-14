// Secreto con el que se firman y verifican las sesiones (JWT).
// Sale de la variable de entorno JWT_SECRET (archivo config/.env).
//
// En producción es OBLIGATORIO: si falta, el servidor no arranca, para
// que nunca se firme con un secreto conocido. En desarrollo, si no
// está definido, se usa uno de prueba y se avisa por consola.
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
    if (process.env.NODE_ENV === "production") {
        throw new Error("Falta la variable de entorno JWT_SECRET (config/.env).");
    }
    console.warn("[Auth] JWT_SECRET no está definido: se usa un secreto de DESARROLLO. No lo uses en producción.");
}

module.exports = {
    JWT_SECRET: SECRET || "mangata_secret_password"
};
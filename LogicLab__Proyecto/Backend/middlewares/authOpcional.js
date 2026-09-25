const jwt = require("jsonwebtoken")

const SECRET = "mangata_secret_password"

// A diferencia de verificarToken, este middleware NUNCA rechaza la
// petición. Si hay un token válido en el header, deja los datos del
// usuario disponibles en req.usuario; si no hay token (o es inválido),
// simplemente continúa sin él.
//
// Sirve para endpoints que deben funcionar TANTO para un cliente anónimo
// (sin login) COMO para un mesero autenticado que actúa en su nombre
// (pedido asistido, HU23) — sin tener que duplicar la ruta en dos.
const authOpcional = (req, res, next) => {
    const authHeader = req.headers["authorization"]
    if (!authHeader) return next()

    const token = authHeader.split(" ")[1]
    if (!token) return next()

    jwt.verify(token, SECRET, (err, decoded) => {
        if (!err) req.usuario = decoded
        next()
    })
}

module.exports = authOpcional
const jwt = require("jsonwebtoken")
const { JWT_SECRET } = require("../config/auth")

const verificarToken = (req, res, next) => {
    const authHeader = req.headers["authorization"]

    if(!authHeader)
        return res.status(401).json({message: "Token no proporcionado"})
    const token = authHeader.split(" ")[1]

    if(!token)
        return res.status(401).json({message: "Token mal formado"})

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            // Deja en la terminal el motivo exacto del rechazo
            // (firma inválida, token mal formado, expirado...).
            console.error(`[Auth] Token rechazado en ${req.method} ${req.originalUrl}: ${err.message} | token="${token.slice(0, 15)}..."`)
            return res.status(403).json({message: "Token invalido o expirado"})
        }
        req.usuario = decoded
        next()
    })
}

module.exports = verificarToken
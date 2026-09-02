const jwt = require("jsonwebtoken")

const SECRET = "mangata_secret_password"

const verificarToken = (req, res, next) => {
    const authHeader = req.headers["authorization"]

    if(!authHeader)
        return res.status(401).json({message: "Token no proporcionado"})
    const token = authHeader.split(" ")[1]

    if(!token)
        return res.status(401).json({message: "Token mal formado"})

    jwt.verify(token, SECRET, (err, decoded) => {
        if (err)
            return res.status(403).json({message: "Token invalido o expirado"})
        req.usuario = decoded
        next()
    })
}

module.exports = verificarToken
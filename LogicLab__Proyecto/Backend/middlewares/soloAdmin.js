// Va DESPUÉS de verificarToken: deja pasar solo al Administrador (rolId 3).
const ROL_ADMINISTRADOR = 3

const soloAdmin = (req, res, next) => {
    if (!req.usuario || req.usuario.rolId !== ROL_ADMINISTRADOR) {
        return res.status(403).json({ message: "Solo el administrador puede hacer esta acción" })
    }
    next()
}

module.exports = soloAdmin
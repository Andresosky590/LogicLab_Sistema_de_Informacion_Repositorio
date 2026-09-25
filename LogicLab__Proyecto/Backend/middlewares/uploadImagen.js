const fs = require("fs");
const path = require("path");
const multer = require("multer");

/*
 * Las imágenes se guardan en disco, en Backend/uploads/platos/ —
 * NO en la base de datos (guardar blobs de imagen en MySQL infla la
 * BD y hace los backups/consultas mucho más lentos) y en una carpeta
 * separada del código fuente versionado (ver Backend/uploads/.gitignore):
 * es contenido que sube el usuario en tiempo de ejecución, no parte
 * del proyecto en sí.
 *
 * En la BD solo se guarda la URL/ruta (Platos.ImagenUrl), que es lo
 * liviano y lo que de verdad hace falta para mostrarla.
 */
const carpetaDestino = path.join(__dirname, "..", "uploads", "platos");

if (!fs.existsSync(carpetaDestino)) {
    fs.mkdirSync(carpetaDestino, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, carpetaDestino);
    },

    filename: (req, file, cb) => {
        const idPlato = req.params.id;
        const extension = path.extname(file.originalname).toLowerCase();
        const nombreUnico = `plato_${idPlato}_${Date.now()}${extension}`;
        cb(null, nombreUnico);
    }
});

const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];

const filtroArchivo = (req, file, cb) => {
    if (!tiposPermitidos.includes(file.mimetype)) {
        return cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP."));
    }
    cb(null, true);
};

const uploadImagen = multer({
    storage,
    fileFilter: filtroArchivo,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB
    }
});

module.exports = uploadImagen;
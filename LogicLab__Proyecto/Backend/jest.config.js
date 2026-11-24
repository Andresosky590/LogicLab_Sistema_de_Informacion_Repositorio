module.exports = {
    testEnvironment: "node",
    // Se ejecuta antes de cada archivo de prueba: define las variables de entorno de prueba
    setupFiles: ["<rootDir>/tests/helpers/entorno.js"],
    testMatch: ["**/tests/**/*.test.js"],
    verbose: true,

    // Archivos sobre los que se mide la cobertura (los módulos que cubren las pruebas)
    collectCoverageFrom: [
        "middlewares/authMiddleware.js",
        "middlewares/soloAdmin.js",
        "services/userService.js",
        "controllers/userController.js",
        "controllers/Menudiacontroller.js",
        "controllers/platoController.js",
        "models/userModel.js",
        "models/MenudiaModel.js",
        "models/platoModel.js"
    ],
    // text: tabla en la terminal; html: informe navegable en la carpeta coverage/
    coverageReporters: ["text", "text-summary", "html"]
};
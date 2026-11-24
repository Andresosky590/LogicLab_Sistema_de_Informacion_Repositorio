// Variables de entorno SOLO para las pruebas. Nunca se lee el config/.env real.
process.env.NODE_ENV = "test";
process.env.TZ = "America/Bogota";
process.env.JWT_SECRET = "secreto_solo_para_pruebas";

// Base de datos de PRUEBAS (nunca la de trabajo ni la de producción)
process.env.DB_HOST = "localhost";
process.env.DB_USER = "logiclab_test";
process.env.DB_PASSWORD = "test";
process.env.DB_NAME = "bd_logiclab_test";

// mysql2 dentro de Jest a veces falla con "Encoding not recognized: 'cesu8'".
// Cargar la codificación por adelantado evita ese error.
try { require("mysql2/node_modules/iconv-lite").encodingExists("cesu8"); }
catch { try { require("iconv-lite").encodingExists("cesu8"); } catch { /* sin efecto */ } }
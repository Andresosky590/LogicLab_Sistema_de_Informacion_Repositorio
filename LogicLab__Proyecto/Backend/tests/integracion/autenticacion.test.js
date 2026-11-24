// Pruebas de integración del inicio de sesión: API real + base de datos de pruebas.
// Solo se simula el correo, para no enviar correos reales.
jest.mock("../../services/emailService");

const request = require("supertest");
const app = require("../../app");
const pool = require("../../config/db");
const { conectar, crearUsuariosPrueba, borrarUsuariosPrueba, USUARIOS, PASSWORD } = require("../helpers/bd");

let cx;

// Antes de todas las pruebas: crea los 4 usuarios de prueba en bd_logiclab_test
beforeAll(async () => {
    cx = await conectar();
    await crearUsuariosPrueba(cx);
});

// Al final: los borra y cierra las conexiones (si no, Jest se queda esperando)
afterAll(async () => {
    await borrarUsuariosPrueba(cx);
    await cx.end();
    pool.end();
});

// Hace la petición POST real a la ruta de login
const login = (email, password) =>
    request(app).post("/api/usuarios/login").send({ email, password });

describe("POST /api/usuarios/login", () => {
    test("I-01 campos vacíos -> 400", async () => {
        const r = await login("", "");

        expect(r.status).toBe(400);
    });

    test("I-02 correo que no existe -> 401", async () => {
        const r = await login("nadie@logiclab.test", PASSWORD);

        expect(r.status).toBe(401);
        expect(r.body.message).toBe("Credenciales inválidas");
    });

    test("I-03 contraseña incorrecta -> 401", async () => {
        const r = await login(USUARIOS.mesero.email, "otraClave");

        expect(r.status).toBe(401);
    });

    test("I-04 cuenta pendiente con la contraseña correcta -> 403", async () => {
        const r = await login(USUARIOS.pendiente.email, PASSWORD);

        expect(r.status).toBe(403);
        expect(r.body.message).toMatch(/pendiente de aprobación/);
    });

    test("I-05 cuenta inactiva -> 403", async () => {
        const r = await login(USUARIOS.inactivo.email, PASSWORD);

        expect(r.status).toBe(403);
    });

    test("I-06 mesero activo -> 200 con token JWT y sin la contraseña en la respuesta", async () => {
        const r = await login(USUARIOS.mesero.email, PASSWORD);

        expect(r.status).toBe(200);
        // Un JWT tiene 3 partes separadas por puntos
        expect(r.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
        // La respuesta nunca debe incluir el hash de la contraseña
        expect(JSON.stringify(r.body)).not.toMatch(/Contraseña_hash|\$2b\$/);
    });
});
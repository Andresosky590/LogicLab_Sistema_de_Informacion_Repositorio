// Pruebas de caja gris del registro de empleados con aprobación.
// Además de la respuesta de la API, se revisa directamente la base de datos.
jest.mock("../../services/emailService");

const request = require("supertest");
const app = require("../../app");
const pool = require("../../config/db");
const EmailService = require("../../services/emailService");
const { conectar, crearUsuariosPrueba, borrarUsuariosPrueba, USUARIOS, PASSWORD } = require("../helpers/bd");

let cx, tokenAdmin, tokenMesero;

// Datos de una solicitud válida; "extra" reemplaza los campos que se quieran cambiar
const solicitud = (extra = {}) => ({
    nombre: "Sofía",
    apellido: "Ramírez",
    email: "sofia.solicitud@logiclab.test",
    password: "Clave123",
    tipoDocId: 1,
    numeroDocumento: "TEST100200",
    rolId: 2,
    ...extra
});

// Inicia sesión por la API y devuelve el token
const tokenDe = async (email) =>
    (await request(app).post("/api/usuarios/login").send({ email, password: PASSWORD })).body.token;

// Consulta directa a la BD: la fila del usuario con ese correo
const fila = async (email) =>
    (await cx.query("SELECT * FROM usuarios_restaurante WHERE Email = ?", [email]))[0][0];

beforeAll(async () => {
    cx = await conectar();
    await crearUsuariosPrueba(cx);
    EmailService.enviarAprobacionCuenta.mockResolvedValue();
    tokenAdmin = await tokenDe(USUARIOS.admin.email);
    tokenMesero = await tokenDe(USUARIOS.mesero.email);
});

afterAll(async () => {
    await borrarUsuariosPrueba(cx);
    await cx.end();
    pool.end();
});

describe("Solicitud de registro (pública)", () => {
    test("G-01 tipos de documento: solo devuelve los activos", async () => {
        const r = await request(app).get("/api/tipos-documento");

        expect(r.status).toBe(200);
        const [[{ activos }]] = await cx.query("SELECT COUNT(*) activos FROM tipo_documento WHERE Activo = 1");
        expect(r.body).toHaveLength(activos);
    });

    test("G-02 solicitud válida -> 201 y en la BD queda pendiente con la contraseña cifrada", async () => {
        const r = await request(app).post("/api/usuarios/solicitud-registro").send(solicitud());

        expect(r.status).toBe(201);
        const u = await fila("sofia.solicitud@logiclab.test");
        expect(u.Estado).toBe("pendiente");
        expect(u["Contraseña_hash"]).toMatch(/^\$2b\$10\$/);
        expect(u["Contraseña_hash"]).not.toBe("Clave123");
        expect(u.Numero_Documento).toBe("TEST100200");
    });

    test("G-03 correo repetido -> 409 y no se crea otra fila", async () => {
        const r = await request(app).post("/api/usuarios/solicitud-registro")
            .send(solicitud({ numeroDocumento: "TEST100201" }));

        expect(r.status).toBe(409);
        const [[{ n }]] = await cx.query(
            "SELECT COUNT(*) n FROM usuarios_restaurante WHERE Email = 'sofia.solicitud@logiclab.test'");
        expect(n).toBe(1);
    });

    test("G-04 número de documento repetido -> 409", async () => {
        const r = await request(app).post("/api/usuarios/solicitud-registro")
            .send(solicitud({ email: "otra.solicitud@logiclab.test" }));

        expect(r.status).toBe(409);
        expect(r.body.message).toMatch(/número de documento/);
    });

    test("G-05 tipo de documento inactivo (Tarjeta de Identidad) -> 400", async () => {
        const r = await request(app).post("/api/usuarios/solicitud-registro")
            .send(solicitud({ email: "ti@logiclab.test", numeroDocumento: "TEST100202", tipoDocId: 3 }));

        expect(r.status).toBe(400);
    });

    test("G-06 la solicitud pendiente no puede iniciar sesión", async () => {
        const r = await request(app).post("/api/usuarios/login")
            .send({ email: "sofia.solicitud@logiclab.test", password: "Clave123" });

        expect(r.status).toBe(403);
    });
});

describe("Aprobación por el administrador", () => {
    test("G-07 un mesero no puede ver las solicitudes -> 403", async () => {
        const r = await request(app).get("/api/usuarios/solicitudes")
            .set("Authorization", `Bearer ${tokenMesero}`);

        expect(r.status).toBe(403);
    });

    test("G-08 el administrador ve la solicitud en la lista de pendientes", async () => {
        const r = await request(app).get("/api/usuarios/solicitudes")
            .set("Authorization", `Bearer ${tokenAdmin}`);

        expect(r.status).toBe(200);
        expect(r.body.map(s => s.Email)).toContain("sofia.solicitud@logiclab.test");
    });

    test("G-09 aprobar como Cocinero -> 200, en la BD queda activo con rol 2 y se envía el correo", async () => {
        const u = await fila("sofia.solicitud@logiclab.test");

        const r = await request(app).put(`/api/usuarios/solicitudes/${u.id_Usuarios_Restaurante}/aprobar`)
            .set("Authorization", `Bearer ${tokenAdmin}`)
            .send({ rolId: 2 });

        expect(r.status).toBe(200);
        const despues = await fila("sofia.solicitud@logiclab.test");
        expect(despues.Estado).toBe("activo");
        expect(despues.id_Roles_Usuarios).toBe(2);
        expect(EmailService.enviarAprobacionCuenta).toHaveBeenCalledWith("sofia.solicitud@logiclab.test", "Sofía");
    });

    test("G-10 una vez aprobada, la cuenta inicia sesión con rol Cocinero", async () => {
        const r = await request(app).post("/api/usuarios/login")
            .send({ email: "sofia.solicitud@logiclab.test", password: "Clave123" });

        expect(r.status).toBe(200);
        expect(r.body.usuario.rolId).toBe(2);
    });

    test("G-11 aprobar de nuevo una cuenta ya activa -> 404", async () => {
        const u = await fila("sofia.solicitud@logiclab.test");

        const r = await request(app).put(`/api/usuarios/solicitudes/${u.id_Usuarios_Restaurante}/aprobar`)
            .set("Authorization", `Bearer ${tokenAdmin}`)
            .send({ rolId: 1 });

        expect(r.status).toBe(404);
    });

    test("G-12 descartar una solicitud la elimina de la BD", async () => {
        await request(app).post("/api/usuarios/solicitud-registro")
            .send(solicitud({ email: "descartar@logiclab.test", numeroDocumento: "TEST100300" }));
        const u = await fila("descartar@logiclab.test");

        const r = await request(app).delete(`/api/usuarios/solicitudes/${u.id_Usuarios_Restaurante}`)
            .set("Authorization", `Bearer ${tokenAdmin}`);

        expect(r.status).toBe(200);
        expect(await fila("descartar@logiclab.test")).toBeUndefined();
    });

    test("G-13 descartar no borra cuentas activas -> 404 y la cuenta sigue", async () => {
        const u = await fila(USUARIOS.mesero.email);

        const r = await request(app).delete(`/api/usuarios/solicitudes/${u.id_Usuarios_Restaurante}`)
            .set("Authorization", `Bearer ${tokenAdmin}`);

        expect(r.status).toBe(404);
        expect(await fila(USUARIOS.mesero.email)).toBeDefined();
    });
});
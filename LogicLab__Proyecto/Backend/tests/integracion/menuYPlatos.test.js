// Pruebas de caja gris del menú del día por secciones y del borrado lógico de platos
jest.mock("../../services/emailService");

const request = require("supertest");
const app = require("../../app");
const pool = require("../../config/db");
const { conectar, crearUsuariosPrueba, borrarUsuariosPrueba, USUARIOS, PASSWORD } = require("../helpers/bd");

let cx, tokenAdmin, tokenMesero;

const tokenDe = async (email) =>
    (await request(app).post("/api/usuarios/login").send({ email, password: PASSWORD })).body.token;

// Menú de prueba: 3 secciones con 7 platos en total
const MENU = {
    secciones: [
        { nombre: "Corriente del día", platos: [2, 3] },
        { nombre: "Comida Rápida", platos: [6, 7] },
        { nombre: "Bebidas", platos: [18, 19, 16] }
    ]
};

beforeAll(async () => {
    cx = await conectar();
    await crearUsuariosPrueba(cx);
    tokenAdmin = await tokenDe(USUARIOS.admin.email);
    tokenMesero = await tokenDe(USUARIOS.mesero.email);
});

afterAll(async () => {
    // Deja los platos usados como estaban (activos)
    await cx.query("UPDATE platos SET Activo = 1 WHERE id_Platos IN (14, 15)");
    await borrarUsuariosPrueba(cx);
    await cx.end();
    pool.end();
});

describe("Menú del día por secciones", () => {
    test("P-01 publicar sin iniciar sesión -> 401", async () => {
        const r = await request(app).post("/api/menu-dia/publicar").send(MENU);

        expect(r.status).toBe(401);
    });

    test("P-02 un mesero no puede publicar -> 403", async () => {
        const r = await request(app).post("/api/menu-dia/publicar")
            .set("Authorization", `Bearer ${tokenMesero}`)
            .send(MENU);

        expect(r.status).toBe(403);
    });

    test("P-03 el administrador publica -> 201 y la BD guarda 3 secciones y 7 platos en orden", async () => {
        const r = await request(app).post("/api/menu-dia/publicar")
            .set("Authorization", `Bearer ${tokenAdmin}`)
            .send(MENU);

        expect(r.status).toBe(201);

        const [secciones] = await cx.query(
            "SELECT Nombre FROM menu_dia_secciones WHERE id_Menu = ? ORDER BY Orden", [r.body.idMenu]);
        expect(secciones.map(s => s.Nombre)).toEqual(["Corriente del día", "Comida Rápida", "Bebidas"]);

        const [items] = await cx.query(
            `SELECT i.id_Platos
             FROM menu_seccion_items i
             JOIN menu_dia_secciones s ON s.id_Seccion = i.id_Seccion
             WHERE s.id_Menu = ?
             ORDER BY s.Orden, i.Orden`, [r.body.idMenu]);
        expect(items.map(i => i.id_Platos)).toEqual([2, 3, 6, 7, 18, 19, 16]);
    });

    test("P-04 la vista pública devuelve el menú por secciones con nombre, precio e imagen", async () => {
        const r = await request(app).get("/api/menu-dia/hoy");

        expect(r.status).toBe(200);
        expect(r.body.secciones).toHaveLength(3);
        expect(r.body.secciones[2].platos.map(p => p.NombrePlato))
            .toEqual(["Limonada", "Jugo de Maracuyá (Agua)", "Jugo de Mora (Leche)"]);
        expect(r.body.secciones[0].platos[0]).toHaveProperty("Precio");
        expect(r.body.secciones[0].platos[0]).toHaveProperty("ImagenUrl");
    });

    test("P-05 volver a publicar reemplaza el menú del día (no se duplica)", async () => {
        await request(app).post("/api/menu-dia/publicar")
            .set("Authorization", `Bearer ${tokenAdmin}`)
            .send({ secciones: [{ nombre: "Bebidas", platos: [18] }] });

        const [[{ n }]] = await cx.query("SELECT COUNT(*) n FROM menu_dia WHERE Fecha = CURDATE()");
        expect(n).toBe(1);

        const r = await request(app).get("/api/menu-dia/hoy");
        expect(r.body.secciones).toHaveLength(1);
    });
});

describe("Borrado lógico de platos", () => {
    test("P-06 eliminar un plato lo marca Activo = 0 sin borrar la fila", async () => {
        const r = await request(app).delete("/api/platos/eliminar/15")
            .set("Authorization", `Bearer ${tokenAdmin}`);

        expect(r.status).toBe(200);
        const [[plato]] = await cx.query("SELECT Activo FROM platos WHERE id_Platos = 15");
        expect(plato.Activo).toBe(0);
    });

    test("P-07 el plato eliminado ya no aparece en la lista de platos", async () => {
        const r = await request(app).get("/api/platos/listar")
            .set("Authorization", `Bearer ${tokenAdmin}`);

        expect(r.body.map(p => p.id_Platos)).not.toContain(15);
    });

    test("P-08 un plato inactivo no se puede publicar en el menú -> 400", async () => {
        const r = await request(app).post("/api/menu-dia/publicar")
            .set("Authorization", `Bearer ${tokenAdmin}`)
            .send({ secciones: [{ nombre: "Especial", platos: [15] }] });

        expect(r.status).toBe(400);
    });

    test("P-09 solo el administrador puede eliminar platos (un mesero recibe 403)", async () => {
        const r = await request(app).delete("/api/platos/eliminar/14")
            .set("Authorization", `Bearer ${tokenMesero}`);

        expect(r.status).toBe(403);
    });
});
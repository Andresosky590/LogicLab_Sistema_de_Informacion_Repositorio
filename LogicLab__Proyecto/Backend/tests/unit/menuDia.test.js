// El controlador consulta la BD a través de MenuDiaModel; lo simulamos
jest.mock("../../config/db", () => ({ query: jest.fn(), getConnection: jest.fn(), on: jest.fn() }));
jest.mock("../../models/MenudiaModel");

const MenuDiaModel = require("../../models/MenudiaModel");
const MenuDiaController = require("../../controllers/Menudiacontroller");

// Ejecuta el controlador con las secciones dadas y devuelve el "res" simulado
const publicar = (secciones) => {
    const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    MenuDiaController.publicarMenu({ body: { secciones } }, res);
    return res;
};

const seccion = (nombre, platos) => ({ nombre, platos });

describe("Publicar menú del día - reglas de las secciones", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        // Por defecto: todos los platos existen y están activos, y la publicación funciona
        MenuDiaModel.contarPlatosActivos.mockImplementation((ids, cb) => cb(null, ids.length));
        MenuDiaModel.publicar.mockImplementation((secciones, cb) => cb(null, { idMenu: 99 }));
    });

    test("M-01 sin secciones -> 400", () => {
        const res = publicar([]);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "El menú debe tener al menos una sección" });
    });

    test("M-02 más de 12 secciones -> 400", () => {
        const muchas = Array.from({ length: 13 }, (_, i) => seccion(`Sección ${i + 1}`, [i + 1]));

        const res = publicar(muchas);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "El menú no puede tener más de 12 secciones" });
    });

    test("M-03 sección sin nombre -> 400", () => {
        const res = publicar([seccion("   ", [1])]);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Cada sección necesita un nombre de máximo 60 caracteres" });
    });

    test("M-04 nombre de 61 caracteres (valor límite) -> 400", () => {
        const res = publicar([seccion("x".repeat(61), [1])]);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Cada sección necesita un nombre de máximo 60 caracteres" });
    });

    test("M-05 sección vacía -> 400", () => {
        const res = publicar([seccion("Bebidas", [])]);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'La sección "Bebidas" está vacía' });
    });

    test("M-06 plato que no es un número entero -> 400", () => {
        const res = publicar([seccion("Bebidas", ["18"])]);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'La sección "Bebidas" tiene un plato no válido' });
    });

    test("M-07 plato repetido en la sección -> 400", () => {
        const res = publicar([seccion("Bebidas", [18, 18])]);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'La sección "Bebidas" tiene platos repetidos' });
    });

    test("M-08 plato inexistente o inactivo -> 400", () => {
        // La BD dice que de 2 platos solo 1 está activo
        MenuDiaModel.contarPlatosActivos.mockImplementation((ids, cb) => cb(null, ids.length - 1));

        const res = publicar([seccion("Bebidas", [18, 999])]);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Algún plato del menú ya no existe" });
        expect(MenuDiaModel.publicar).not.toHaveBeenCalled();
    });

    test("M-09 menú válido -> 201 y se publica con los nombres limpios", () => {
        const res = publicar([seccion(" Corriente del día ", [1, 2]), seccion("Bebidas", [18])]);

        expect(res.status).toHaveBeenCalledWith(201);
        // mock.calls[0][0] = secciones que recibió el modelo; [0] = primera sección
        expect(MenuDiaModel.publicar.mock.calls[0][0][0].nombre).toBe("Corriente del día");
    });
});
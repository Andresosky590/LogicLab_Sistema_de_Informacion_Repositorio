// El controlador llama a UserService para guardar; lo simulamos para no tocar la BD
jest.mock("../../config/db", () => ({ query: jest.fn(), getConnection: jest.fn(), on: jest.fn() }));
jest.mock("../../services/userService");

const UserService = require("../../services/userService");
const UserController = require("../../controllers/userController");

// Datos válidos de base; cada prueba cambia solo el campo que quiere probar
const base = {
    nombre: "Laura",
    apellido: "Pérez",
    email: "laura@correo.com",
    password: "clave12",
    tipoDocId: 1,
    numeroDocumento: "1023456789",
    rolId: 1
};

// Ejecuta el controlador con un body y devuelve el "res" simulado
const ejecutar = (body) => {
    const res = { status: jest.fn(() => res), json: jest.fn(() => res) };
    UserController.solicitarRegistro({ body }, res);
    return res;
};

describe("Solicitud de registro - validación de entradas", () => {
    beforeEach(() => {
        jest.resetAllMocks();
        // Por defecto el servicio guarda sin errores
        UserService.solicitarRegistro.mockImplementation((datos, cb) => cb(null));
    });

    test.each([
        ["nombre", { nombre: "" }],
        ["apellido", { apellido: "" }],
        ["correo", { email: "" }],
        ["contraseña", { password: "" }],
        ["tipo de documento", { tipoDocId: "" }],
        ["número de documento", { numeroDocumento: "" }],
        ["cargo", { rolId: "" }]
    ])("V-01 campo obligatorio vacío: %s -> 400", (campo, cambio) => {
        const res = ejecutar({ ...base, ...cambio });

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Todos los campos son obligatorios" });
        expect(UserService.solicitarRegistro).not.toHaveBeenCalled();
    });

    test.each(["laura", "laura@", "laura@correo", "la ura@correo.com"])(
        "V-02 correo mal formado '%s' -> 400", (email) => {
            const res = ejecutar({ ...base, email });

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ message: "El correo no tiene un formato válido" });
        });

    test("V-03 contraseña de 5 caracteres -> 400 (mínimo 6)", () => {
        const res = ejecutar({ ...base, password: "12345" });

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "La contraseña debe tener al menos 6 caracteres" });
    });

    test("V-04 contraseña de 6 caracteres (valor límite) -> se acepta", () => {
        const res = ejecutar({ ...base, password: "123456" });

        expect(res.status).toHaveBeenCalledWith(201);
    });

    test("V-05 cargo Administrador (rolId 3) -> 400 Rol no permitido", () => {
        const res = ejecutar({ ...base, rolId: 3 });

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: "Rol no permitido" });
    });

    test.each(["123", "10.234.567", "1023 456", "A".repeat(21)])(
        "V-06 número de documento no válido '%s' -> 400", (numeroDocumento) => {
            const res = ejecutar({ ...base, numeroDocumento });

            expect(res.status).toHaveBeenCalledWith(400);
            expect(UserService.solicitarRegistro).not.toHaveBeenCalled();
        });

    test("V-07 correo repetido (ER_DUP_ENTRY en Email) -> 409", () => {
        UserService.solicitarRegistro.mockImplementation((datos, cb) =>
            cb({ code: "ER_DUP_ENTRY", sqlMessage: "Duplicate entry for key 'Email'" }));

        const res = ejecutar(base);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ message: "Ese correo ya está registrado." });
    });

    test("V-08 documento repetido (ER_DUP_ENTRY en Numero_Documento) -> 409", () => {
        UserService.solicitarRegistro.mockImplementation((datos, cb) =>
            cb({ code: "ER_DUP_ENTRY", sqlMessage: "Duplicate entry for key 'Numero_Documento'" }));

        const res = ejecutar(base);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({ message: "Ese número de documento ya está registrado." });
    });

    test("V-09 datos correctos -> 201 y se envían limpios al servicio", () => {
        const res = ejecutar({ ...base, nombre: "  Laura ", email: " laura@correo.com " });

        expect(res.status).toHaveBeenCalledWith(201);
        // mock.calls[0][0] = primer argumento de la primera llamada al servicio
        expect(UserService.solicitarRegistro.mock.calls[0][0]).toMatchObject({
            nombre: "Laura",
            email: "laura@correo.com",
            rolId: 1,
            tipoDocId: 1
        });
    });
});
// 1) Simulamos todo lo que toca la base de datos o servicios externos.
//    jest.mock reemplaza el módulo real por uno falso ANTES de cargarlo.
jest.mock("../../config/db", () => ({ query: jest.fn(), getConnection: jest.fn(), on: jest.fn() }));
jest.mock("../../models/userModel");
jest.mock("bcrypt");

const UserModel = require("../../models/userModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const UserService = require("../../services/userService");

// Usuario de prueba con el estado que se necesite en cada caso
const usuario = (estado) => ({
    id_Usuarios_Restaurante: 9,
    Nombre: "Ana",
    Apellido: "Ríos",
    Email: "ana@logiclab.test",
    id_Roles_Usuarios: 1,
    Estado: estado,
    "Contraseña_hash": "hash_falso"
});

// loginUser responde con un callback; lo convertimos en promesa para usar await
const login = () => new Promise(resolve =>
    UserService.loginUser("ana@logiclab.test", "Clave123", (err, data) => resolve({ err, data })));

describe("UserService.loginUser - cobertura de caminos", () => {
    // Después de cada prueba se limpian los dobles para que no se mezclen
    afterEach(() => jest.resetAllMocks());

    test("C1 error de la base de datos al buscar el correo", async () => {
        UserModel.findByEmail.mockImplementation((email, cb) => cb(new Error("BD caída")));

        const { err } = await login();

        expect(err.message).toBe("BD caída");
    });

    test("C2 correo no registrado -> 401 Credenciales inválidas", async () => {
        UserModel.findByEmail.mockImplementation((email, cb) => cb(null, []));

        const { err } = await login();

        expect(err).toEqual({ status: 401, message: "Credenciales inválidas" });
    });

    test("C3 error de bcrypt al comparar la contraseña", async () => {
        UserModel.findByEmail.mockImplementation((email, cb) => cb(null, [usuario("activo")]));
        bcrypt.compare.mockImplementation((pass, hash, cb) => cb(new Error("Fallo bcrypt")));

        const { err } = await login();

        expect(err.message).toBe("Fallo bcrypt");
    });

    test("C4 contraseña incorrecta -> 401 (no revela el estado de la cuenta)", async () => {
        UserModel.findByEmail.mockImplementation((email, cb) => cb(null, [usuario("pendiente")]));
        bcrypt.compare.mockImplementation((pass, hash, cb) => cb(null, false));

        const { err } = await login();

        expect(err).toEqual({ status: 401, message: "Credenciales inválidas" });
    });

    test("C5 cuenta pendiente de aprobación -> 403", async () => {
        UserModel.findByEmail.mockImplementation((email, cb) => cb(null, [usuario("pendiente")]));
        bcrypt.compare.mockImplementation((pass, hash, cb) => cb(null, true));

        const { err } = await login();

        expect(err).toEqual({ status: 403, message: "Tu solicitud está pendiente de aprobación." });
    });

    test("C6 cuenta inactiva -> 403", async () => {
        UserModel.findByEmail.mockImplementation((email, cb) => cb(null, [usuario("inactivo")]));
        bcrypt.compare.mockImplementation((pass, hash, cb) => cb(null, true));

        const { err } = await login();

        expect(err).toEqual({ status: 403, message: "Este usuario está inactivo." });
    });

    test("C7 cuenta activa -> devuelve el usuario y un JWT con {id, rolId}", async () => {
        UserModel.findByEmail.mockImplementation((email, cb) => cb(null, [usuario("activo")]));
        bcrypt.compare.mockImplementation((pass, hash, cb) => cb(null, true));

        const { err, data } = await login();

        expect(err).toBeNull();
        expect(data.usuario).toMatchObject({ id: 9, email: "ana@logiclab.test", rolId: 1 });
        const decodificado = jwt.verify(data.token, process.env.JWT_SECRET);
        expect(decodificado).toMatchObject({ id: 9, rolId: 1 });
    });
});
const jwt = require("jsonwebtoken");
const verificarToken = require("../../middlewares/authMiddleware");

const crearRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("verificarToken", () => {
    // El middleware escribe en consola cuando rechaza un token; lo silenciamos
    beforeAll(() => jest.spyOn(console, "error").mockImplementation(() => {}));

    test("U-01 rechaza la petición sin encabezado Authorization (401)", () => {
        const req = { headers: {} };
        const res = crearRes();
        const next = jest.fn();

        verificarToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test("U-02 rechaza un encabezado sin token (401)", () => {
        const req = { headers: { authorization: "Bearer" } };
        const res = crearRes();
        const next = jest.fn();

        verificarToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test("U-03 rechaza un token firmado con otro secreto (403)", () => {
        const tokenFalso = jwt.sign({ id: 1, rolId: 3 }, "otro_secreto");
        const req = { headers: { authorization: `Bearer ${tokenFalso}` }, method: "GET", originalUrl: "/prueba" };
        const res = crearRes();
        const next = jest.fn();

        verificarToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test("U-04 acepta un token válido y guarda los datos en req.usuario", () => {
        const token = jwt.sign({ id: 7, rolId: 1 }, process.env.JWT_SECRET);
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = crearRes();
        const next = jest.fn();

        verificarToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.usuario).toMatchObject({ id: 7, rolId: 1 });
    });
});
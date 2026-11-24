const soloAdmin = require("../../middlewares/soloAdmin");

const crearRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe("soloAdmin", () => {
    test("U-05 bloquea una petición sin datos de sesión (403)", () => {
        const req = {};
        const res = crearRes();
        const next = jest.fn();

        soloAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test("U-06 bloquea a un mesero (rolId 1) (403)", () => {
        const req = { usuario: { id: 5, rolId: 1 } };
        const res = crearRes();
        const next = jest.fn();

        soloAdmin(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test("U-07 deja pasar al administrador (rolId 3)", () => {
        const req = { usuario: { id: 1, rolId: 3 } };
        const res = crearRes();
        const next = jest.fn();

        soloAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});
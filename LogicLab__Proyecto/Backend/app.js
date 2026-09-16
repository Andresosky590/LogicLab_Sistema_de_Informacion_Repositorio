const express = require("express");
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');
const UserController = require("./controllers/userController");
const MesaController = require("./controllers/mesaController");
const PlatoController = require("./controllers/platoController");
const PedidoController = require("./controllers/pedidoController");
const ReporteController = require("./controllers/reporteController");
const PqrsfController = require("./controllers/pqrsfController");
const MenuDiaController = require("./controllers/menuDiaController");
const verificarToken = require("./middlewares/authMiddleware");
const authOpcional = require("./middlewares/authOpcional");

const app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => res.send('API Funcionando Correctamente'));

app.get('/api/usuarios/listar', verificarToken, UserController.getUsers);
app.get('/api/usuarios/consultar/:id', verificarToken, UserController.getUserById);
app.post('/api/usuarios/registro', UserController.register);
app.post('/api/usuarios/login', UserController.login);
app.put('/api/usuarios/actualizar/:id', verificarToken,UserController.updateUser);
app.delete('/api/usuarios/eliminar/:id', verificarToken, UserController.deleteUser);

app.get('/api/mesas/listar', MesaController.getMesas);
app.put('/api/mesas/estado/:id', MesaController.updateEstado);
app.get('/api/mesas/admin/listar', verificarToken, MesaController.getMesasConQr);
app.get('/api/mesas/qr/:token', MesaController.getMesaPorToken);
app.put('/api/mesas/:id/regenerar-qr', verificarToken, MesaController.regenerarQr);

app.get('/api/platos/listar', verificarToken, PlatoController.getPlatos);
app.get('/api/categorias/listar', verificarToken, PlatoController.getCategorias);
app.put('/api/platos/actualizar/:id', verificarToken, PlatoController.updatePlato);
app.post('/api/platos/agregar', verificarToken, PlatoController.createPlato);
app.delete('/api/platos/eliminar/:id', verificarToken, PlatoController.deletePlato);
app.put('/api/platos/disponibilidad/:id', verificarToken, PlatoController.toggleDisponibilidad);

app.get('/api/pedidos/listar', verificarToken, PedidoController.getPedidos);
app.get('/api/pedidos/estado/:estado', verificarToken, PedidoController.getPedidosPorEstado);
app.get('/api/pedidos/mesa/:numero', PedidoController.getPedidosPorMesa);
app.post('/api/pedidos/crear', authOpcional, PedidoController.crearPedido);
app.put('/api/pedidos/asignar/:id', verificarToken, PedidoController.asignarPedido);
app.put('/api/pedidos/cancelar/:id', verificarToken, PedidoController.cancelarPedido);
app.put('/api/pedidos/modificar/:id', verificarToken, PedidoController.modificarPedido);
app.put('/api/pedidos/cuenta/:id', verificarToken, PedidoController.cerrarCuenta);
app.put('/api/pedidos/estado/:id', PedidoController.actualizarEstado);
app.get('/api/pedidos/mesero/:idUsuario', verificarToken, PedidoController.getPedidosPorMesero);
app.get('/api/pedidos/:id/detalles', verificarToken, PedidoController.getDetallesPedido);

app.get('/api/reportes/ventas', verificarToken, ReporteController.getVentas);

app.get('/api/pqrsf/tipos',      PqrsfController.getTipos);
app.post('/api/pqrsf/crear',     PqrsfController.crear);
app.get('/api/pqrsf/listar',     verificarToken, PqrsfController.listar);

app.get('/api/menu-dia/hoy', MenuDiaController.getMenuHoy);
app.post('/api/menu-dia/publicar', verificarToken, MenuDiaController.publicarMenu);
app.put('/api/menu-dia/desactivar', verificarToken, MenuDiaController.desactivarMenu);

module.exports = app;
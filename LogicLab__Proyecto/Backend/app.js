const express = require("express");
const path = require("path");
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');
const UserController = require("./controllers/userController");
const MesaController = require("./controllers/mesaController");
const MetodoPagoController = require("./controllers/metodoPagoController");
const PlatoController = require("./controllers/platoController");
const PedidoController = require("./controllers/pedidoController");
const ReporteController = require("./controllers/reporteController");
const PqrsfController = require("./controllers/Pqrsfcontroller");
const MenuDiaController = require("./controllers/Menudiacontroller");
const verificarToken = require("./middlewares/authMiddleware");
const authOpcional = require("./middlewares/authOpcional");
const uploadImagen = require("./middlewares/uploadImagen");

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

// Sirve las imágenes subidas (Backend/uploads/platos/archivo.jpg queda
// disponible en http://<host>:5030/uploads/platos/archivo.jpg).
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => res.send('API Funcionando Correctamente'));

app.get('/api/usuarios/listar', verificarToken, UserController.getUsers);
app.get('/api/usuarios/consultar/:id', verificarToken, UserController.getUserById);
app.post('/api/usuarios/registro', UserController.register);
app.post('/api/usuarios/login', UserController.login);
// Recuperación de contraseña (públicas: el usuario aún no puede iniciar sesión)
app.post('/api/usuarios/solicitar-codigo', UserController.solicitarCodigo);
app.post('/api/usuarios/restablecer-password', UserController.restablecerPassword);
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
app.post('/api/platos/:id/imagen', verificarToken, uploadImagen.single('imagen'), PlatoController.subirImagen);

app.get('/api/pedidos/listar', verificarToken, PedidoController.getPedidos);
app.get('/api/pedidos/estado/:estado', verificarToken, PedidoController.getPedidosPorEstado);
app.get('/api/pedidos/mesa/:numero', PedidoController.getPedidosPorMesa);
app.post('/api/pedidos/crear', authOpcional, PedidoController.crearPedido);
app.put('/api/pedidos/asignar/:id', verificarToken, PedidoController.asignarPedido);
// Puede cancelar un cliente anónimo (su pedido) o un mesero autenticado.
app.put('/api/pedidos/cancelar/:id', authOpcional, PedidoController.cancelarPedido);
app.put('/api/pedidos/modificar/:id', authOpcional, PedidoController.modificarPedido);

// Operaciones atómicas sobre un ítem individual — reemplazan, para
// el flujo nuevo, al "modificar" de arriba (que reemplaza TODA la
// lista de una). authOpcional porque las usa tanto el cliente (sin
// token) como el mesero (con token).
app.post('/api/pedidos/:id/items', authOpcional, PedidoController.agregarItem);
app.delete('/api/pedidos/:id/items/:idDetalle', authOpcional, PedidoController.quitarItem);
app.put('/api/pedidos/:id/items/:idDetalle', authOpcional, PedidoController.actualizarCantidadItem);
app.put('/api/pedidos/cuenta/:id', verificarToken, PedidoController.cerrarCuenta);
app.put('/api/pedidos/pago-presencial/:id', verificarToken, PedidoController.pagoPresencial);
app.put('/api/pedidos/simular-pago/:id', authOpcional, PedidoController.simularPago);
// Solo personal autenticado: marca como devuelto un reembolso pendiente.
app.put('/api/pedidos/reembolso/:id', verificarToken, PedidoController.marcarReembolso);
app.get('/api/metodo-pago/online', MetodoPagoController.getMetodosOnline);
// Todos los métodos (Efectivo/Tarjeta/Transferencia incluidos) — para personal.
app.get('/api/metodo-pago/listar', verificarToken, MetodoPagoController.getMetodos);
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

// Manejador de errores de multer (archivo muy grande, tipo no
// permitido, etc.) — sin esto, Express devolvería un HTML de error
// genérico en vez de un JSON que el frontend pueda leer.
app.use((err, req, res, next) => {
    if (err && err.name === "MulterError") {
        const mensaje = err.code === "LIMIT_FILE_SIZE"
            ? "La imagen no puede pesar más de 5 MB."
            : "No se pudo procesar la imagen.";
        return res.status(400).json({ message: mensaje });
    }

    if (err && err.message && err.message.includes("Solo se permiten imágenes")) {
        return res.status(400).json({ message: err.message });
    }

    next(err);
});

module.exports = app;
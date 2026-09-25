import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"
import "../App.css";
import "../../Hojas_de_Estilo/MensajeCliente.css";
import { inicializarAudio, reproducirNotificacion } from "./utils/audioHelper";

const API = "http://localhost:5030";

function MensajeCliente() {
  const navigate = useNavigate()
  const [pedidosAgrupados, setPedidosAgrupados] = useState([]);
  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);
  
  const sonidoRef = useRef(sonidoHabilitado);
  useEffect(() => {
    sonidoRef.current = sonidoHabilitado;
  }, [sonidoHabilitado]);

  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [mostrarModalCancelar, setMostrarModalCancelar] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [mostrarModalModificar, setMostrarModalModificar] = useState(false);
  const [itemsModificando, setItemsModificando] = useState([]);
  const [mostrarModalCobrar, setMostrarModalCobrar] = useState(false);
  const [metodosPago, setMetodosPago] = useState([]);
  const [cargandoMetodosPago, setCargandoMetodosPago] = useState(false);
  const [menuDelDiaModal, setMenuDelDiaModal] = useState([]);
  const [cargandoMenuModal, setCargandoMenuModal] = useState(false);
  const [procesandoDetalle, setProcesandoDetalle] = useState(null);
  const [agregandoPlato, setAgregandoPlato] = useState(null);

  const reproducirAlerta = () => {
    if (sonidoRef.current) {
      reproducirNotificacion();
    }
  };

  useEffect(() => {
    inicializarAudio();
    cargarPedidos();

    const intervalo = setInterval(() => {
      cargarPedidos();
    }, 5000);

    return () => clearInterval(intervalo);
  }, []);

  const cargarPedidos = async () => {
    try {
      const [resPendientes, resPreparando] = await Promise.all([
        axios.get(`${API}/api/pedidos/estado/pendiente`),
        axios.get(`${API}/api/pedidos/estado/preparando`)
      ]);

      const todosPedidos = [...resPendientes.data, ...resPreparando.data];

      const pedidos = todosPedidos.map(pedido => {
        const platos = pedido.detalles.filter(d => Number(d.id_Categoria) !== 4);
        const bebidas = pedido.detalles.filter(d => Number(d.id_Categoria) === 4);
        return { ...pedido, platos, bebidas };
      });

      setPedidosAgrupados(prevPedidos => {
        if (prevPedidos.length > 0) {
          const idsAnteriores = prevPedidos.map(p => p.id_Pedidos);
          const hayNuevoPedido = resPendientes.data.some(p => !idsAnteriores.includes(p.id_Pedidos));
          
          if (hayNuevoPedido) {
            reproducirAlerta();
          }
        }
        return pedidos;
      });

    } catch (error) {
      console.error("Error cargando pedidos:", error);
    }
  };

  const aprobarPedido = async (idPedido) => {
    try {
      await axios.put(`${API}/api/pedidos/estado/${idPedido}`, { estado: "preparando" });
      alert("Pedido enviado a cocina");
      await cargarPedidos();
    } catch (error) {
      console.error(error);
    }
  };

  // El cliente pidió por su cuenta desde el QR pero prefiere pagarle
  // al mesero en persona en vez de usar la pasarela online. Distinto
  // de "cerrar cuenta": esto solo marca el pago, el pedido sigue su
  // camino normal hacia cocina en vez de saltar directo a "entregado".
  const abrirModalCobrar = async (pedido) => {
    setPedidoSeleccionado(pedido);
    setMostrarModalCobrar(true);
    setCargandoMetodosPago(true);

    try {
      const res = await axios.get(`${API}/api/metodo-pago/listar`);
      setMetodosPago(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error cargando métodos de pago:", error);
      setMetodosPago([]);
      alert("No se pudieron cargar los métodos de pago.");
    } finally {
      setCargandoMetodosPago(false);
    }
  };

  const confirmarCobroPresencial = async (metodoPago) => {
    try {
      await axios.put(
        `${API}/api/pedidos/pago-presencial/${pedidoSeleccionado.id_Pedidos}`,
        { metodoPago }
      );
      setMostrarModalCobrar(false);
      await cargarPedidos();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "No se pudo registrar el pago.");
    }
  };

  const tomarPedido = async (idPedido, nombreMeseroActual) => {
    const usuario = JSON.parse(sessionStorage.getItem("usuario"));
    const idUsuario = usuario?.id_Usuarios_Restaurante ?? usuario?.id;
    const nombreUsuario = usuario?.nombre ?? "este usuario";

    if (!idUsuario) {
      alert("No se pudo identificar tu usuario. Vuelve a iniciar sesión.");
      return;
    }

    const mensaje = nombreMeseroActual
      ? `Este pedido está asignado a ${nombreMeseroActual}. ¿Tomarlo para ${nombreUsuario}?`
      : `¿Tomar este pedido como ${nombreUsuario}?`;
    const confirmar = window.confirm(mensaje);
    if (!confirmar) return;

    try {
      await axios.put(`${API}/api/pedidos/asignar/${idPedido}`, { idUsuario });
      await cargarPedidos();
    } catch (error) {
      console.error("Error al tomar el pedido:", error);
      alert("No se pudo tomar el pedido. Intenta de nuevo.");
    }
  };

  const abrirModalCancelar = (pedido) => {
    setPedidoSeleccionado(pedido);
    setMotivoCancelacion("");
    setMostrarModalCancelar(true);
  };

  const ejecutarCancelarPedido = async () => {
    if (!motivoCancelacion.trim()) {
      alert("Por favor, ingrese un motivo de cancelación.");
      return;
    }
    try {
      await axios.put(`${API}/api/pedidos/cancelar/${pedidoSeleccionado.id_Pedidos}`, {
        motivo: motivoCancelacion,
        esMesero: true
      });
      alert("Pedido cancelado exitosamente.");
      setMostrarModalCancelar(false);
      setPedidoSeleccionado(null);
      await cargarPedidos();
    } catch (error) {
      console.error("Error al cancelar el pedido:", error);
    }
  };

  const abrirModalModificar = async (pedido) => {
    if (pedido.EstadoPedido !== "pendiente") {
      alert("Solo se puede modificar un pedido mientras está Pendiente.");
      return;
    }
    setPedidoSeleccionado(pedido);

    const itemsConUnitario = [...pedido.platos, ...pedido.bebidas].map(item => ({
      ...item,
      precioUnitario: item.PrecioFinal / item.CantidadPedido
    }));
    setItemsModificando(itemsConUnitario);
    setMostrarModalModificar(true);

    // Menú para poder agregar algo nuevo (no solo lo que ya tenía).
    setCargandoMenuModal(true);
    try {
      const res = await axios.get(`${API}/api/menu-dia/hoy`);
      setMenuDelDiaModal(res.data && Array.isArray(res.data.items) ? res.data.items : []);
    } catch (error) {
      console.error("Error cargando el menú:", error);
      setMenuDelDiaModal([]);
    } finally {
      setCargandoMenuModal(false);
    }
  };

  // Trae de nuevo los ítems del pedido desde el backend — es quien
  // manda sobre las cantidades y el total, nunca se calculan a mano.
  const refrescarItemsModal = async (idPedido) => {
    try {
      const res = await axios.get(`${API}/api/pedidos/${idPedido}/detalles`);
      const itemsConUnitario = res.data.map(item => ({
        ...item,
        precioUnitario: item.PrecioFinal / item.CantidadPedido
      }));
      setItemsModificando(itemsConUnitario);
    } catch (error) {
      console.error("Error refrescando el pedido:", error);
    }
    // El total que se ve en la lista de atrás también queda viejo —
    // se actualiza en segundo plano, sin cerrar el modal.
    cargarPedidos();
  };

  // Cada acción (cambiar cantidad, quitar, agregar) llama a su propio
  // endpoint atómico — nunca se reemplaza la lista completa — para
  // que esto pueda convivir sin choques con que el cliente siga
  // agregando cosas al mismo pedido desde su celular al mismo tiempo.
  const cambiarCantidadItem = async (item, cambio) => {
    const nuevaCantidad = item.CantidadPedido + cambio;
    if (nuevaCantidad <= 0) {
      await quitarItemModal(item, false);
      return;
    }

    setProcesandoDetalle(item.id_Detalle_Pedidos);
    try {
      await axios.put(
        `${API}/api/pedidos/${pedidoSeleccionado.id_Pedidos}/items/${item.id_Detalle_Pedidos}`,
        {
          cantidadPedido: nuevaCantidad,
          precioFinal: item.precioUnitario * nuevaCantidad,
        }
      );
      await refrescarItemsModal(pedidoSeleccionado.id_Pedidos);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "No se pudo actualizar la cantidad.");
    } finally {
      setProcesandoDetalle(null);
    }
  };

  const quitarItemModal = async (item, confirmar = true) => {
    if (confirmar && !window.confirm(`¿Quitar ${item.NombrePlato}?`)) return;

    setProcesandoDetalle(item.id_Detalle_Pedidos);
    try {
      await axios.delete(
        `${API}/api/pedidos/${pedidoSeleccionado.id_Pedidos}/items/${item.id_Detalle_Pedidos}`
      );
      await refrescarItemsModal(pedidoSeleccionado.id_Pedidos);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "No se pudo quitar el ítem.");
    } finally {
      setProcesandoDetalle(null);
    }
  };

  const agregarDelMenuModal = async (plato) => {
    setAgregandoPlato(plato.id_Platos);
    try {
      await axios.post(`${API}/api/pedidos/${pedidoSeleccionado.id_Pedidos}/items`, {
        idPlato: plato.id_Platos,
        nombrePlato: plato.NombrePlato,
        cantidadPedido: 1,
        notasEspeciales: null,
        precioFinal: plato.Precio,
        idCategoria: plato.id_Categoria,
      });
      await refrescarItemsModal(pedidoSeleccionado.id_Pedidos);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "No se pudo agregar el ítem.");
    } finally {
      setAgregandoPlato(null);
    }
  };

  const cerrarModalModificar = () => {
    setMostrarModalModificar(false);
    setPedidoSeleccionado(null);
    setItemsModificando([]);
    setMenuDelDiaModal([]);
  };

  return (
    <div className="mc-container">
      <header className="mc-header">
        <div className="mc-header-center">
          <h1 className="mc-titulo">Mensajes Clientes</h1>
          <div className="mc-titulo-linea"></div>
        </div>
        
        <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: 'bold', color: '#555', fontSize: '14px' }}>
            {sonidoHabilitado ? "🔔 Sonido Activado" : "🔕 Sonido Muteado"}
          </label>
          <input 
            type="checkbox" 
            checked={sonidoHabilitado} 
            onChange={(e) => setSonidoHabilitado(e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
        </div>
      </header>

      <div className="mc-lista">
        {pedidosAgrupados.length === 0 ? (
          <div className="mc-vacio">
            <p>No hay pedidos pendientes o en preparación.</p>
          </div>
        ) : (
          pedidosAgrupados.map(pedido => (
            <div key={pedido.id_Pedidos} className="mc-card">
              <div className="mc-card-header">
                <span className="mc-badge-mesa">
                  MESA {pedido.Numero_mesa}
                </span>

                <button
                  onClick={() => tomarPedido(pedido.id_Pedidos, pedido.NombreMesero)}
                  className={`mc-btn-mesero ${pedido.NombreMesero ? 'tomado' : 'libre'}`}
                  title="Haz clic para tomar este pedido"
                >
                  {pedido.NombreMesero ? `Tomado por ${pedido.NombreMesero}` : 'Tomar Pedido'}
                </button>

                <span className={`mc-badge-estado ${pedido.EstadoPedido}`}>
                  {pedido.EstadoPedido.toUpperCase()}
                </span>

                <span className="mc-fecha">
                  {pedido.Fecha_Pedido}
                </span>

                <span className="mc-total-header">
                  $ {Number(pedido.TotalPagar).toLocaleString("es-CO")}
                </span>
              </div>

              <div className="mc-card-body">
                {pedido.platos.length > 0 && (
                  <div className="mc-grupo">
                    <p className="mc-grupo-label">Platos</p>
                    {pedido.platos.map((d, i) => (
                      <div key={i} className="mc-detalle-item">
                        <div className="mc-detalle-info">
                          <span className="mc-detalle-nombre">
                            {d.CantidadPedido}x {d.NombrePlato}
                          </span>
                          {d.NotasEspeciales && <span className="mc-detalle-nota">{d.NotasEspeciales}</span>}
                        </div>
                        <span className="mc-detalle-precio">
                          $ {Number(d.PrecioFinal).toLocaleString("es-CO")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {pedido.bebidas.length > 0 && (
                  <div className="mc-grupo">
                    <p className="mc-grupo-label">Bebidas</p>
                    {pedido.bebidas.map((d, i) => (
                      <div key={i} className="mc-detalle-item">
                        <div className="mc-detalle-info">
                          <span className="mc-detalle-nombre">
                            {d.CantidadPedido}x {d.NombrePlato}
                          </span>
                          {d.NotasEspeciales && <span className="mc-detalle-nota">{d.NotasEspeciales}</span>}
                        </div>
                        <span className="mc-detalle-precio">
                          $ {Number(d.PrecioFinal).toLocaleString("es-CO")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mc-card-footer">
                <div className="mc-actions-row">
                  <button
                    onClick={() => abrirModalModificar(pedido)}
                    disabled={pedido.EstadoPedido !== 'pendiente'}
                    title={pedido.EstadoPedido !== 'pendiente' ? 'Solo se puede modificar mientras está Pendiente' : ''}
                    className="mc-btn-secundario"
                  >
                    Modificar
                  </button>
                  <button onClick={() => abrirModalCancelar(pedido)} className="mc-btn-peligro">
                    Cancelar
                  </button>
                </div>

                {pedido.EstadoPedido === 'pendiente' && pedido.EstadoPago !== 'aprobado' && (
                  <button
                    className="mc-btn-cobrar"
                    onClick={() => abrirModalCobrar(pedido)}
                  >
                    💵 Cobrar aquí (opcional, si el cliente ya te va a pagar)
                  </button>
                )}

                {pedido.EstadoPedido === 'pendiente' && (
                  <button
                    className="mc-btn-confirmar"
                    onClick={() => aprobarPedido(pedido.id_Pedidos)}
                  >
                    Enviar a Cocina
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {mostrarModalCancelar && (
        <div className="mc-modal-overlay">
          <div className="mc-modal-card">
            <h3 className="mc-modal-titulo">Cancelar Pedido</h3>
            <p className="mc-modal-subtitulo">Pedido #{pedidoSeleccionado?.id_Pedidos}</p>
            <textarea
              rows="4"
              className="mc-modal-textarea"
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              placeholder="Motivo de la cancelación..."
            />
            <div className="mc-modal-actions">
              <button onClick={() => setMostrarModalCancelar(false)} className="mc-btn-secundario">Volver</button>
              <button onClick={ejecutarCancelarPedido} className="mc-btn-peligro">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalModificar && (
        <div className="mc-modal-overlay">
          <div className="mc-modal-card mc-modal-card-grande">
            <h3 className="mc-modal-titulo">Editar Pedido</h3>
            <p className="mc-modal-subtitulo">Pedido #{pedidoSeleccionado?.id_Pedidos}</p>

            <p className="mc-modal-seccion-label">EN EL PEDIDO</p>
            <div className="mc-modal-lista-items">
              {itemsModificando.length === 0 && (
                <p className="mc-modal-vacio-texto">Sin ítems — agrega algo del menú abajo.</p>
              )}
              {itemsModificando.map((item) => {
                const procesando = procesandoDetalle === item.id_Detalle_Pedidos;
                return (
                  <div key={item.id_Detalle_Pedidos} className="mc-modal-item-row">
                    <span className="mc-modal-item-nombre">{item.NombrePlato}</span>
                    {procesando ? (
                      <span className="mc-modal-item-cargando">...</span>
                    ) : (
                      <div className="mc-modal-stepper">
                        <button onClick={() => cambiarCantidadItem(item, -1)} className="mc-modal-qty-btn">−</button>
                        <span className="mc-modal-qty-num">{item.CantidadPedido}</span>
                        <button onClick={() => cambiarCantidadItem(item, 1)} className="mc-modal-qty-btn">+</button>
                        <button onClick={() => quitarItemModal(item)} className="mc-modal-btn-quitar" title="Quitar">🗑</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mc-modal-seccion-label">AGREGAR OTRA COSA</p>
            <p className="mc-modal-seccion-nota">
              Si el cliente quiere cambiar un plato por otro: agrega el nuevo aquí, y quita el viejo arriba.
            </p>
            <div className="mc-modal-lista-menu">
              {cargandoMenuModal && <p className="mc-modal-vacio-texto">Cargando menú...</p>}
              {!cargandoMenuModal && menuDelDiaModal.length === 0 && (
                <p className="mc-modal-vacio-texto">No hay menú publicado hoy.</p>
              )}
              {menuDelDiaModal.map((plato) => (
                <div key={plato.id_Platos} className="mc-modal-menu-row">
                  <div>
                    <span className="mc-modal-item-nombre">{plato.NombrePlato}</span>
                    <span className="mc-modal-menu-precio">
                      $ {Number(plato.Precio).toLocaleString("es-CO")}
                    </span>
                  </div>
                  {agregandoPlato === plato.id_Platos ? (
                    <span className="mc-modal-item-cargando">...</span>
                  ) : (
                    <button onClick={() => agregarDelMenuModal(plato)} className="mc-modal-btn-agregar">+</button>
                  )}
                </div>
              ))}
            </div>

            <div className="mc-modal-actions">
              <button onClick={cerrarModalModificar} className="mc-btn-confirmar">Listo</button>
            </div>
          </div>
        </div>
      )}
      {mostrarModalCobrar && (
        <div className="mc-modal-overlay">
          <div className="mc-modal-card">
            <h3 className="mc-modal-titulo">Cobrar en persona</h3>
            <p className="mc-modal-subtitulo">
              Pedido #{pedidoSeleccionado?.id_Pedidos} · $ {Number(pedidoSeleccionado?.TotalPagar).toLocaleString("es-CO")}
            </p>
            <p className="mc-modal-subtitulo">¿Con qué te paga el cliente?</p>
            <div className="mc-modal-metodos">
              {cargandoMetodosPago ? (
                <p className="mc-modal-vacio-texto">Cargando métodos de pago...</p>
              ) : metodosPago.length === 0 ? (
                <p className="mc-modal-vacio-texto">No hay métodos de pago disponibles.</p>
              ) : (
                metodosPago.map((metodo) => (
                  <button
                    key={metodo.id_MetodoPago}
                    onClick={() => confirmarCobroPresencial(metodo.NombreMetodo)}
                    className="mc-btn-metodo"
                  >
                    {metodo.NombreMetodo}
                  </button>
                ))
              )}
            </div>
            <div className="mc-modal-actions">
              <button onClick={() => setMostrarModalCobrar(false)} className="mc-btn-secundario">Volver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MensajeCliente;
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

  const abrirModalModificar = (pedido) => {
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
  };

  const cambiarCantidadItem = (idDetalle, cambio) => {
    const nuevosItems = itemsModificando.map(item => {
      if (item.id_Detalle_Pedidos === idDetalle) {
        const nuevaCantidad = item.CantidadPedido + cambio;
        if (nuevaCantidad <= 0) return { ...item, CantidadPedido: 0 };
        return {
          ...item,
          CantidadPedido: nuevaCantidad,
          PrecioFinal: item.precioUnitario * nuevaCantidad
        };
      }
      return item;
    }).filter(item => item.CantidadPedido > 0);

    setItemsModificando(nuevosItems);
  };

  const guardarModificacionesPedido = async () => {
    if (itemsModificando.length === 0) {
      alert("El pedido debe tener al menos un ítem. Si quieres eliminarlo por completo, usa Cancelar.");
      return;
    }
    try {
      const itemsParaEnviar = itemsModificando.map(item => ({
        idPlato: item.id_Platos,
        nombrePlato: item.NombrePlato,
        cantidadPedido: item.CantidadPedido,
        notasEspeciales: item.NotasEspeciales || null,
        precioFinal: item.PrecioFinal,
        idCategoria: item.id_Categoria
      }));

      await axios.put(`${API}/api/pedidos/modificar/${pedidoSeleccionado.id_Pedidos}`, {
        items: itemsParaEnviar
      });
      alert("Pedido modificado correctamente.");
      setMostrarModalModificar(false);
      setPedidoSeleccionado(null);
      await cargarPedidos();
    } catch (error) {
      console.error("Error al modificar el pedido:", error);
      alert(error.response?.data?.message || "No se pudo modificar el pedido.");
    }
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

                {pedido.EstadoPedido === 'pendiente' && (
                  <button className="mc-btn-confirmar" onClick={() => aprobarPedido(pedido.id_Pedidos)}>
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
          <div className="mc-modal-card">
            <h3 className="mc-modal-titulo">Modificar Cantidades</h3>
            <p className="mc-modal-subtitulo">Pedido #{pedidoSeleccionado?.id_Pedidos}</p>
            <div className="mc-modal-lista-items">
              {itemsModificando.map((item) => (
                <div key={item.id_Detalle_Pedidos} className="mc-modal-item-row">
                  <span className="mc-modal-item-nombre">{item.NombrePlato}</span>
                  <div className="mc-modal-stepper">
                    <button onClick={() => cambiarCantidadItem(item.id_Detalle_Pedidos, -1)} className="mc-modal-qty-btn">−</button>
                    <span className="mc-modal-qty-num">{item.CantidadPedido}</span>
                    <button onClick={() => cambiarCantidadItem(item.id_Detalle_Pedidos, 1)} className="mc-modal-qty-btn">+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mc-modal-actions">
              <button onClick={() => setMostrarModalModificar(false)} className="mc-btn-secundario">Cancelar</button>
              <button onClick={guardarModificacionesPedido} className="mc-btn-confirmar">Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MensajeCliente;
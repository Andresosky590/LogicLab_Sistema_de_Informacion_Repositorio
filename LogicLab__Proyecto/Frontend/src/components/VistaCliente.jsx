import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"
import '../../Hojas_de_Estilo/Cliente.css';
import '../App.css';
import { inicializarAudio, reproducirNotificacion } from './utils/audioHelper';

const API = "http://localhost:5030";

const IMG_CATEGORIA = {
    "1": "/CartaCorriente.png",
    "2": "/CartaComidaRapida.png",
    "3": "/CartaEspecial.png",
    "4": "/CartaBebidas.png",
}

const TarjetaPlato = ({ plato, agregado, expandida, cantidad, peticion,
  onTogglePlato, onCambiarCantidad, onToggleCarrito, onCambiarPeticion }) => {
  return (
    <div className={`vc-tarjeta ${agregado ? "vc-tarjeta-agregada" : ""}`}>
      <div className="vc-tarjeta-fila" onClick={() => onTogglePlato(plato)}>
        <div className="vc-tarjeta-img-wrap">
          <img
            src={IMG_CATEGORIA[String(plato.id_Categoria)] ?? "/CartaCorriente.png"}
            alt={plato.NombrePlato}
            className="vc-tarjeta-img"
          />
        </div>
        <div className="vc-tarjeta-body">
          <p className="vc-tarjeta-nombre">{plato.NombrePlato}</p>
          <p className="vc-tarjeta-desc">{plato.Descripcion}</p>
          <p className="vc-tarjeta-precio">${plato.Precio.toLocaleString("es-CO")}</p>

          <div className="vc-tarjeta-bottom">
            <div className="vc-tarjeta-cantidad" onClick={e => e.stopPropagation()}>
              <button className="vc-cant-btn" onClick={() => onCambiarCantidad(plato.id_Platos, -1)}>−</button>
              <span className="vc-cant-num">{cantidad}</span>
              <button className="vc-cant-btn" onClick={() => onCambiarCantidad(plato.id_Platos, 1)}>+</button>
            </div>
            <button
              className={`vc-tarjeta-btn ${agregado ? "vc-tarjeta-btn-quitar" : ""}`}
              onClick={e => { e.stopPropagation(); onToggleCarrito(plato) }}
            >
              {agregado ? "✕" : "+ Agregar al pedido"}
            </button>
          </div>
        </div>
      </div>

      {expandida && (
        <div className="vc-tarjeta-peticion-wrap" onClick={e => e.stopPropagation()}>
          <input
            className="vc-tarjeta-peticion-input"
            type="text"
            placeholder="Peticiones: Ej: sin cebolla..."
            value={peticion}
            onChange={e => onCambiarPeticion(plato.id_Platos, e.target.value)}
          />
        </div>
      )}
    </div>
  )
}

function VistaCliente() {
  const [menuDelDia, setMenuDelDia] = useState([])
  const [mesaActiva, setMesaActiva] = useState("")
  const [idMesaActiva, setIdMesaActiva] = useState(null)
  const [cantidades, setCantidades] = useState({})
  const [peticiones, setPeticiones] = useState({})
  const [carrito, setCarrito] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [platoAbierto, setPlatoAbierto] = useState(null)
  const [pedidoActivo, setPedidoActivo] = useState(null)
  const [carritoAbierto, setCarritoAbierto] = useState(false)

  // ── PQRSF ──
  const [pqrsfAbierto, setPqrsfAbierto] = useState(false)
  const [tiposPqrsf, setTiposPqrsf] = useState([])
  const [pqrsfForm, setPqrsfForm] = useState({ id_TipoPQRSF: "", nombre: "", mensaje: "" })
  const [enviandoPqrsf, setEnviandoPqrsf] = useState(false)
  const [pqrsfMsg, setPqrsfMsg] = useState(null)

  useEffect(() => {
    axios.get(`${API}/api/pqrsf/tipos`)
      .then(res => setTiposPqrsf(res.data))
      .catch(() => {})
  }, [])

  const enviarPqrsf = async () => {
    if (!pqrsfForm.id_TipoPQRSF) { setPqrsfMsg({ ok: false, txt: "Selecciona el tipo de solicitud" }); return }
    if (!pqrsfForm.mensaje.trim()) { setPqrsfMsg({ ok: false, txt: "Escribe tu mensaje" }); return }
    setEnviandoPqrsf(true)
    try {
      await axios.post(`${API}/api/pqrsf/crear`, pqrsfForm)
      setPqrsfMsg({ ok: true, txt: "¡Enviado correctamente! Gracias por tu mensaje." })
      setPqrsfForm({ id_TipoPQRSF: "", nombre: "", mensaje: "" })
      setTimeout(() => { setPqrsfAbierto(false); setPqrsfMsg(null) }, 2000)
    } catch {
      setPqrsfMsg({ ok: false, txt: "Error al enviar. Inténtalo de nuevo." })
    } finally {
      setEnviandoPqrsf(false)
    }
  }

  const navigate = useNavigate()

  // ── Cerrar sesión del cliente: libera la mesa en BD y navega al login ──
  const cerrarSesionCliente = async () => {
    try {
      if (idMesaActiva) {
        await axios.put(`${API}/api/mesas/estado/${idMesaActiva}`, { estado: "disponible" })
      }
    } catch (err) {
      console.error("Error al liberar la mesa:", err)
    } finally {
      localStorage.removeItem("mesaSeleccionada")
      localStorage.removeItem("idMesero")
      navigate("/login")
    }
  }

  const [sonidoHabilitado, setSonidoHabilitado] = useState(true);
  
  // Usamos un useRef para evitar desincronizaciones de cierres (closures) en funciones asíncronas
  const sonidoRef = useRef(sonidoHabilitado);
  useEffect(() => {
    sonidoRef.current = sonidoHabilitado;
  }, [sonidoHabilitado]);

  // Función encargada de reproducir el archivo de la carpeta public
  const reproducirAlertaListo = () => {
    if (sonidoRef.current) {
      reproducirNotificacion();
    }
  };

  // NUEVO / MEJORADO: Validación y comparación de estados para disparar el sonido
  const verificarPedidoMesa = (numeroMesa) => {
    if (!numeroMesa) return;
    
    axios.get(`${API}/api/pedidos/mesa/${numeroMesa}`)
      .then(res => {
        // Estados activos (sin entregado) — mantiene el comportamiento de desaparecer solo
        const activo = res.data.find(p => ['pendiente', 'preparando', 'listo'].includes(p.EstadoPedido));
        // Detectamos si hay un pedido entregado
        const entregado = res.data.find(p => p.EstadoPedido === 'entregado');

        setPedidoActivo(prevPedido => {
          // Suena cuando el mesero entrega: había un pedido activo y ahora ya no lo hay pero existe uno entregado
          if (prevPedido && !activo && entregado) {
            reproducirAlertaListo();
            // Limpiamos el carrito para que al volver solo vea el menú
            setCarrito([]);
            setCantidades({});
            setPeticiones({});
          }
          return activo || null;
        });
      })
      .catch(err => console.error("Error verificando pedido de la mesa:", err));
  }

  useEffect(() => {
    inicializarAudio()
    const menuGuardado = localStorage.getItem("menuDelDia")
    if (menuGuardado) setMenuDelDia(JSON.parse(menuGuardado))

    const mesaGuardada = localStorage.getItem("mesaSeleccionada")
    if (mesaGuardada) {
      setMesaActiva(mesaGuardada)
      verificarPedidoMesa(mesaGuardada);

      axios.get(`${API}/api/mesas/listar`)
        .then(res => {
          const mesa = res.data.find(m => String(m.Numero_mesa) === String(mesaGuardada))
          if (mesa) setIdMesaActiva(mesa.id_Mesas)
        })
        .catch(err => console.error("Error cargando id de mesa:", err))
    }
  }, [])

  // --- MODIFICACIÓN RF11: POLLING AUTOMÁTICO EN SEGUNDO PLANO ---
  useEffect(() => {
    if (!mesaActiva) return;

    // Ejecuta la consulta de forma automatizada cada 5 segundos
    const intervalo = setInterval(() => {
      verificarPedidoMesa(mesaActiva);
    }, 5000);

    return () => clearInterval(intervalo);
  }, [mesaActiva]);

  const platosMenu = menuDelDia.filter(p => String(p.id_Categoria) !== "4")
  const bebidasMenu = menuDelDia.filter(p => String(p.id_Categoria) === "4")

  const getCantidad = (id) => cantidades[id] || 1
  const getPeticion = (id) => peticiones[id] || ""

  const cambiarCantidad = (id, valor) => {
    setCantidades(prev => ({ ...prev, [id]: Math.max(1, (prev[id] || 1) + valor) }))
  }

  const togglePlato = (plato) => {
    setPlatoAbierto(prev => prev === plato.id_Platos ? null : plato.id_Platos)
  }

  const enCarrito = (id) => carrito.some(i => i.plato.id_Platos === id)

  const toggleCarrito = (plato) => {
    if (enCarrito(plato.id_Platos)) {
      setCarrito(prev => prev.filter(i => i.plato.id_Platos !== plato.id_Platos))
    } else {
      setCarrito(prev => [...prev, {
        plato,
        cantidad: getCantidad(plato.id_Platos),
        peticion: getPeticion(plato.id_Platos),
      }])
    }
  }

  const quitarDelCarrito = (id) => setCarrito(prev => prev.filter(i => i.plato.id_Platos !== id))

  const cambiarPeticion = (id, valor) => {
    setPeticiones(prev => ({ ...prev, [id]: valor }))
  }

  const carritoPlatos = carrito.filter(i => String(i.plato.id_Categoria) !== "4")
  const carritoBebidas = carrito.filter(i => String(i.plato.id_Categoria) === "4")

  const totalItemsCarrito = carrito.reduce((acc, item) => acc + item.cantidad, 0)
  const totalPedido = carrito.reduce((acc, item) => acc + item.plato.Precio * item.cantidad, 0)

  const formatPrecio = (precio) => `$${precio.toLocaleString("es-CO")}`

  const enviarPedido = async () => {
    if (carrito.length === 0) return
    if (!idMesaActiva) {
      alert("No se pudo identificar la mesa. Vuelve al inicio y selecciona la mesa nuevamente.")
      return
    }

    setEnviando(true)
    try {
      const usuario      = JSON.parse(localStorage.getItem("usuario"))
      const totalGeneral = carrito.reduce((acc, item) => acc + item.plato.Precio * item.cantidad, 0)

      const items = carrito.map(item => ({
        idPlato:         item.plato.id_Platos,
        nombrePlato:     item.plato.NombrePlato,
        cantidadPedido:  item.cantidad,
        notasEspeciales: item.peticion || null,
        precioFinal:     item.plato.Precio * item.cantidad,
        idCategoria:     item.plato.id_Categoria
      }))

      await axios.post(`${API}/api/pedidos/crear`, {
        idMesa:    idMesaActiva,
        idUsuario: Number(localStorage.getItem("idMesero")) || null,
        totalPagar: totalGeneral,
        items
      })

      setCarrito([])
      setCantidades({})
      setPeticiones({})
      setCarritoAbierto(false)
      alert(`¡Pedido enviado al mesero para la Mesa #${mesaActiva}!`)
      verificarPedidoMesa(mesaActiva);

    } catch (error) {
      console.error(error)
      alert("Error al enviar el pedido. Intenta de nuevo.")
    } finally {
      setEnviando(false)
    }
  }

  const handleCancelarPedido = async () => {
    if (!pedidoActivo) return;

    if (pedidoActivo.EstadoPedido !== "pendiente") {
      alert("Tu pedido ya está siendo preparado en cocina y no puede cancelarse.");
      return;
    }

    const confirmar = window.confirm("¿Estás seguro de que deseas cancelar tu pedido?");
    if (!confirmar) return;

    try {
      await axios.put(`${API}/api/pedidos/cancelar/${pedidoActivo.id_Pedidos}`, {
        motivo: "Cancelado por el cliente desde la mesa"
      });

      alert("Tu pedido ha sido cancelado con éxito.");
      setPedidoActivo(null);
    } catch (error) {
      console.error(error);
      const mensajeError = error.response?.data?.message || "Error al intentar cancelar.";
      alert(mensajeError);
      verificarPedidoMesa(mesaActiva);
    }
  }

  const btnYModalPQRSF = (
    <>
      <button onClick={() => { setPqrsfAbierto(true); setPqrsfMsg(null) }} style={{
        position: "fixed", bottom: "24px", left: "24px", zIndex: 900,
        background: "linear-gradient(135deg, #d43737, #ff6b6b)",
        border: "none", borderRadius: "50px", padding: "14px 22px",
        display: "flex", alignItems: "center", gap: "10px",
        color: "#fff", fontWeight: "700", fontSize: "0.88rem",
        cursor: "pointer", letterSpacing: "1px",
        boxShadow: "0 4px 20px rgba(212,55,55,0.5)",
        animation: "pqrsfPulse 2.5s ease-in-out infinite"
      }}>
        <span style={{ fontSize: "1.1rem" }}>💬</span> PQRSF
      </button>

      {pqrsfAbierto && (
        <div onClick={() => setPqrsfAbierto(false)} style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#111", border: "1px solid #d43737",
            borderRadius: "16px", width: "100%", maxWidth: "460px", overflow: "hidden"
          }}>
            <div style={{ background: "rgba(212,55,55,0.12)", borderBottom: "1px solid rgba(212,55,55,0.3)", padding: "20px 24px" }}>
              <h2 style={{ color: "#d43737", margin: "0 0 4px", fontSize: "1.1rem", letterSpacing: "3px" }}>💬 PQRSF</h2>
              <p style={{ color: "#888", margin: 0, fontSize: "0.85rem" }}>Peticiones, Quejas, Reclamos, Felicitaciones y Sugerencias</p>
            </div>
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ color: "#bbb", fontSize: "0.85rem", display: "block", marginBottom: "6px" }}>Tipo de solicitud *</label>
                <select value={pqrsfForm.id_TipoPQRSF} onChange={e => setPqrsfForm(p => ({ ...p, id_TipoPQRSF: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#fff", fontSize: "0.95rem", outline: "none" }}>
                  <option value="">— Selecciona —</option>
                  {tiposPqrsf.map(t => <option key={t.id_TipoPQRSF} value={t.id_TipoPQRSF} style={{ background: "#111" }}>{t.TipoPQRSF}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: "#bbb", fontSize: "0.85rem", display: "block", marginBottom: "6px" }}>Tu nombre (opcional)</label>
                <input type="text" placeholder="Anónimo" value={pqrsfForm.nombre}
                  onChange={e => setPqrsfForm(p => ({ ...p, nombre: e.target.value }))}
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#fff", fontSize: "0.95rem", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ color: "#bbb", fontSize: "0.85rem", display: "block", marginBottom: "6px" }}>Mensaje *</label>
                <textarea placeholder="Escribe tu mensaje aquí..." value={pqrsfForm.mensaje}
                  onChange={e => setPqrsfForm(p => ({ ...p, mensaje: e.target.value }))} rows={4}
                  style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#fff", fontSize: "0.9rem", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              {pqrsfMsg && (
                <div style={{ padding: "10px 14px", borderRadius: "8px", textAlign: "center", fontSize: "0.88rem",
                  background: pqrsfMsg.ok ? "rgba(46,204,113,0.15)" : "rgba(231,76,60,0.15)",
                  color: pqrsfMsg.ok ? "#2ecc71" : "#e74c3c",
                  border: `1px solid ${pqrsfMsg.ok ? "rgba(46,204,113,0.4)" : "rgba(231,76,60,0.4)"}` }}>
                  {pqrsfMsg.txt}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "12px", padding: "0 24px 24px" }}>
              <button onClick={() => setPqrsfAbierto(false)}
                style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: "rgba(255,255,255,0.08)", color: "#bbb", cursor: "pointer", fontSize: "0.95rem" }}>
                Cancelar
              </button>
              <button onClick={enviarPqrsf} disabled={enviandoPqrsf}
                style={{ flex: 1, padding: "12px", border: "none", borderRadius: "8px", background: enviandoPqrsf ? "#555" : "#d43737", color: "#fff", fontWeight: "700", cursor: enviandoPqrsf ? "not-allowed" : "pointer", fontSize: "0.95rem" }}>
                {enviandoPqrsf ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes pqrsfPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(212,55,55,0.5); }
          50% { box-shadow: 0 4px 32px rgba(212,55,55,0.8), 0 0 0 6px rgba(212,55,55,0.15); }
        }
      `}</style>
    </>
  )

  // RENDER: Caso menú vacío
  if (menuDelDia.length === 0) {
    return (
      <>
        <div className="vc-container">
          <header className="vc-header">
            <span className="vc-badge-mesa">Mesa #{mesaActiva}</span>
            <div className="vc-header-center">
              <h1 className="vc-logo">Restaurante Mangata</h1>
            </div>
            <button className="vc-btn-salir" onClick={cerrarSesionCliente}>SALIR</button>
          </header>
          <div className="vc-vacio">
            <p>El menú de hoy aún no está listo.</p>
            <span>El administrador lo publicará en breve.</span>
          </div>
        </div>
        {btnYModalPQRSF}
      </>
    )
  }

  // RENDER: Caso cuando la mesa tiene un pedido en curso (Pantalla de Bloqueo / Estado)
  if (pedidoActivo) {
    return (
      <>
      <div className="vc-container">
        <header className="vc-header">
          <span className="vc-badge-mesa">Mesa #{mesaActiva}</span>
          <div className="vc-header-center">
            <h1 className="vc-logo">Restaurante Mangata</h1>
            <p className="vc-menu-dia-label">Estado de tu Orden</p>
          </div>
          <button className="vc-btn-salir" onClick={cerrarSesionCliente}>SALIR</button>
        </header>

        <div className="vc-sonido-toggle">
          <input
            type="checkbox"
            id="audioToggleCurso"
            checked={sonidoHabilitado}
            onChange={(e) => setSonidoHabilitado(e.target.checked)}
          />
          <label htmlFor="audioToggleCurso" className="vc-sonido-label-grande">
            {sonidoHabilitado ? "🔔 Sonido Activado (Te avisaremos cuando esté listo)" : "🔕 Sonido Muteado"}
          </label>
        </div>

        <div className="vc-estado-card">
          <h2 className="vc-estado-titulo">
            Tu pedido está:{" "}
            <span className={`vc-estado-valor ${pedidoActivo.EstadoPedido}`}>
              {pedidoActivo.EstadoPedido}
            </span>
          </h2>
          <p className="vc-estado-total">Total a Pagar: <strong>{formatPrecio(pedidoActivo.TotalPagar)}</strong></p>

          {pedidoActivo.EstadoPedido === "pendiente" ? (
            <div>
              <p className="vc-estado-aviso">Tu orden aún no ha entrado a la cocina, puedes cancelarla si lo requieres.</p>
              <button onClick={handleCancelarPedido} className="vc-btn-cancelar">
                Cancelar Pedido
              </button>
            </div>
          ) : (
            <p className={`vc-estado-mensaje ${pedidoActivo.EstadoPedido === 'listo' ? 'listo' : 'espera'}`}>
              {pedidoActivo.EstadoPedido === 'listo'
                ? "🎉 ¡Tu pedido está listo! El mesero se acercará a entregártelo en un momento."
                : "⚠️ Tu pedido ya se encuentra en preparación, por lo tanto ya no puede ser cancelado."
              }
            </p>
          )}

          <button onClick={() => verificarPedidoMesa(mesaActiva)} className="vc-btn-actualizar">
            🔄 Actualizar Estado
          </button>
        </div>
      </div>
      {btnYModalPQRSF}
      </>
    )
  }

  // RENDER: Flujo ordinario de compra de la carta
  return (
    <>
    <div className="vc-container">
      <header className="vc-header">
        <span className="vc-badge-mesa">Mesa #{mesaActiva}</span>
        <div className="vc-header-center">
          <h1 className="vc-logo">Restaurante Mangata</h1>
          <p className="vc-menu-dia-label">Menú del Día</p>
        </div>
        <button className="vc-btn-salir" onClick={cerrarSesionCliente}>SALIR</button>
      </header>

      <div className="vc-sonido-toggle">
        <input
          type="checkbox"
          id="audioToggleCarta"
          checked={sonidoHabilitado}
          onChange={(e) => setSonidoHabilitado(e.target.checked)}
        />
        <label htmlFor="audioToggleCarta" className="vc-sonido-label">
          {sonidoHabilitado ? "🔔 Alertas sonoras activadas" : "🔕 Alertas silenciadas"}
        </label>
      </div>

      {platosMenu.length > 0 && (
        <section className="vc-seccion">
          <h2 className="vc-seccion-titulo">Platos</h2>
          <div className="vc-grid">
            {platosMenu.map(plato => (
              <TarjetaPlato
                key={plato.id_Platos}
                plato={plato}
                agregado={enCarrito(plato.id_Platos)}
                expandida={platoAbierto === plato.id_Platos}
                cantidad={getCantidad(plato.id_Platos)}
                peticion={getPeticion(plato.id_Platos)}
                onTogglePlato={togglePlato}
                onCambiarCantidad={cambiarCantidad}
                onToggleCarrito={toggleCarrito}
                onCambiarPeticion={cambiarPeticion}
              />
            ))}
          </div>
        </section>
      )}

      {bebidasMenu.length > 0 && (
        <section className="vc-seccion">
          <h2 className="vc-seccion-titulo">Bebidas</h2>
          <div className="vc-grid">
            {bebidasMenu.map(plato => (
              <TarjetaPlato
                key={plato.id_Platos}
                plato={plato}
                agregado={enCarrito(plato.id_Platos)}
                expandida={platoAbierto === plato.id_Platos}
                cantidad={getCantidad(plato.id_Platos)}
                peticion={getPeticion(plato.id_Platos)}
                onTogglePlato={togglePlato}
                onCambiarCantidad={cambiarCantidad}
                onToggleCarrito={toggleCarrito}
                onCambiarPeticion={cambiarPeticion}
              />
            ))}
          </div>
        </section>
      )}

      {carrito.length > 0 && (
        <button className="vc-fab-carrito" onClick={() => setCarritoAbierto(true)}>
          <i className="bi bi-cart-fill"></i>
          <span className="vc-fab-badge">{totalItemsCarrito}</span>
        </button>
      )}

      {carritoAbierto && (
        <div className="vc-offcanvas-backdrop" onClick={() => setCarritoAbierto(false)}></div>
      )}

      <div className={`offcanvas offcanvas-end vc-offcanvas ${carritoAbierto ? "show" : ""}`} tabIndex="-1">
        <div className="vc-pedido">
          <div className="vc-pedido-header">
            <h2 className="vc-pedido-titulo">Pedido</h2>
            <button className="vc-pedido-cerrar" onClick={() => setCarritoAbierto(false)}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          {carrito.length === 0 ? (
            <p className="vc-pedido-vacio">Tu carrito está vacío.</p>
          ) : (
            <>
              {carritoPlatos.length > 0 && (
                <div className="vc-pedido-grupo">
                  <p className="vc-pedido-grupo-label">Platos</p>
                  {carritoPlatos.map(item => (
                    <div key={item.plato.id_Platos} className="vc-pedido-item">
                      <div className="vc-pedido-item-info">
                        <span className="vc-pedido-nombre">{item.cantidad}x {item.plato.NombrePlato}</span>
                        {item.peticion && <span className="vc-pedido-peticion">{item.peticion}</span>}
                      </div>
                      <div className="vc-pedido-item-right">
                        <span className="vc-pedido-precio">{formatPrecio(item.plato.Precio * item.cantidad)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {carritoBebidas.length > 0 && (
                <div className="vc-pedido-grupo">
                  <p className="vc-pedido-grupo-label">Bebidas</p>
                  {carritoBebidas.map(item => (
                    <div key={item.plato.id_Platos} className="vc-pedido-item">
                      <div className="vc-pedido-item-info">
                        <span className="vc-pedido-nombre">{item.cantidad}x {item.plato.NombrePlato}</span>
                        {item.peticion && <span className="vc-pedido-peticion">{item.peticion}</span>}
                      </div>
                      <div className="vc-pedido-item-right">
                        <span className="vc-pedido-precio">{formatPrecio(item.plato.Precio * item.cantidad)}</span>
                        <button className="vc-pedido-quitar" onClick={() => quitarDelCarrito(item.plato.id_Platos)}>quitar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="vc-pedido-total">
                <span>Total</span>
                <span className="vc-pedido-total-num">{formatPrecio(totalPedido)}</span>
              </div>

              <button className="vc-btn-enviar" onClick={enviarPedido} disabled={enviando || !idMesaActiva}>
                {enviando ? "Enviando..." : "Enviar"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    {btnYModalPQRSF}
    </>
  )
}

export default VistaCliente;
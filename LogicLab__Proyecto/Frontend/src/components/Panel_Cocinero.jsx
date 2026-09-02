import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"
import "../../Hojas_de_Estilo/Cocinero.css";
import "../App.css";
import { inicializarAudio, reproducirNotificacion } from "./utils/audioHelper";

const API = "http://localhost:5030";

const IMG_CATEGORIA = {
  "1": "/CartaCorriente.png",
  "2": "/CartaComidaRapida.png",
  "3": "/CartaEspecial.png",
  "4": "/CartaBebidas.png",
};

function Panel_Cocinero({ usuario }) {
  const navigate = useNavigate()

  const [pedidosAgrupados, setPedidosAgrupados] = useState([]);
  const [tab, setTab] = useState("ordenes");
  const [menuDelDia, setMenuDelDia] = useState([]);

  // ── Refs para detección de pedidos nuevos y control de audio ──
  const idsAnterioresRef = useRef(null)  
  const primeraCargaRef  = useRef(true)   

  if (!usuario) {
    const usuarioGuardado = JSON.parse(
      sessionStorage.getItem("usuario")
    );
    if (usuarioGuardado) {
      usuario = usuarioGuardado;
    }
  }

  const reproducirAlerta = () => {
    reproducirNotificacion()
  }

  const cargarPedidosCocina = async () => {
    try {
      const response = await axios.get(
        `${API}/api/pedidos/estado/preparando`
      );

      const pedidos = response.data.map(pedido => {
        const platos = pedido.detalles.filter(
          d => Number(d.id_Categoria) !== 4
        );
        const bebidas = pedido.detalles.filter(
          d => Number(d.id_Categoria) === 4
        );
        return { ...pedido, platos, bebidas };
      });

      // ── Detectar pedidos nuevos y sonar ──
      if (primeraCargaRef.current) {
        // Primera carga: solo guardamos los IDs actuales, no sonamos
        idsAnterioresRef.current = new Set(pedidos.map(p => p.id_Pedidos))
        primeraCargaRef.current = false
      } else {
        // Cargas siguientes: comparamos con los IDs anteriores
        const idsNuevos = pedidos
          .map(p => p.id_Pedidos)
          .filter(id => !idsAnterioresRef.current.has(id))

        if (idsNuevos.length > 0) {
          reproducirAlerta()
        }

        idsAnterioresRef.current = new Set(pedidos.map(p => p.id_Pedidos))
      }

      setPedidosAgrupados(pedidos);
    } catch (error) {
      console.error("Error cargando pedidos para cocina:", error);
    }
  };

  const cargarMenuDelDia = () => {
    const menuGuardado = localStorage.getItem("menuDelDia");
    const parsed = menuGuardado ? JSON.parse(menuGuardado) : [];
    setMenuDelDia(Array.isArray(parsed) ? parsed : []);
  };

  useEffect(() => {
    inicializarAudio();
    cargarPedidosCocina();
    cargarMenuDelDia();
    // ── Polling cada 15 segundos para detectar pedidos nuevos ──
    const iv = setInterval(cargarPedidosCocina, 15000)
    return () => clearInterval(iv)
  }, []);

  const marcarComoListo = async (idPedido) => {
    try {
      await axios.put(
        `${API}/api/pedidos/estado/${idPedido}`,
        { estado: "listo" }
      );
      await cargarPedidosCocina();
      alert("¡El pedido está listo para ser entregado!");
    } catch (error) {
      console.error("Error al actualizar el estado:", error);
    }
  };

  const cerrarSesion = () => {
    sessionStorage.removeItem("usuario");
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    localStorage.removeItem("paginaActual");
    navigate("/login");
  };

  const formatPrecio = (precio) =>
    `$${Number(precio).toLocaleString("es-CO")}`;

  const menuPlatos = menuDelDia.filter(
    p => String(p.id_Categoria) !== "4"
  );
  const menuBebidas = menuDelDia.filter(
    p => String(p.id_Categoria) === "4"
  );

  return (
    <div className="kitchen-container">

      {/* ── Header ── */}
      <header className="kitchen-header">
        <div className="kitchen-header-center">
          <h1 className="kitchen-main-title">Panel de Cocina</h1>
          <p className="kitchen-chef-info">
            Chef: {usuario?.nombre} {usuario?.apellido}
          </p>
        </div>
        <button onClick={cerrarSesion} className="kitchen-btn-salir">
          SALIR
        </button>
      </header>

      {/* ── Tabs ── */}
      <div className="kitchen-tabs">
        <button
          className={`kitchen-tab-btn ${tab === "ordenes" ? "tab-active" : ""}`}
          onClick={() => setTab("ordenes")}
        >
          Órdenes
          {pedidosAgrupados.length > 0 && (
            <span style={{
              marginLeft: "8px",
              background: "#39ff14",
              color: "#000",
              borderRadius: "999px",
              padding: "1px 7px",
              fontSize: "0.7rem",
              fontWeight: "900",
            }}>
              {pedidosAgrupados.length}
            </span>
          )}
        </button>
        <button
          className={`kitchen-tab-btn ${tab === "menu" ? "tab-active" : ""}`}
          onClick={() => { setTab("menu"); cargarMenuDelDia(); }}
        >
          Menú del Día
        </button>
      </div>

      {/* ── Vista: Órdenes ── */}
      {tab === "ordenes" && (
        <div className="kitchen-board">
          <h2 className="kitchen-subtitle">ÓRDENES POR PREPARAR</h2>
          <div className="orders-list">
            {pedidosAgrupados.length === 0 ? (
              <div className="no-orders-msg">
                <p>No hay pedidos pendientes. ¡Buen trabajo Chef!</p>
              </div>
            ) : (
              pedidosAgrupados.map(pedido => (
                <div key={pedido.id_Pedidos} className="order-card">

                  <div className="order-card-header">
                    <span className="order-table-badge">
                      MESA {pedido.Numero_mesa}
                    </span>
                    <span className="order-total">
                      {formatPrecio(pedido.TotalPagar)}
                    </span>
                    <span className="order-fecha">
                      {new Date(pedido.Fecha_Pedido).toLocaleString("es-CO")}
                    </span>
                  </div>

                  <div className="order-card-body">
                    {pedido.platos.length > 0 && (
                      <div className="order-grupo">
                        <p className="order-grupo-label">Platos</p>
                        {pedido.platos.map((d, i) => (
                          <div key={i} className="order-detalle-item">
                            <div className="order-detalle-info">
                              <span className="order-detalle-nombre">
                                {d.CantidadPedido}x {d.NombrePlato}
                              </span>
                              {d.NotasEspeciales && (
                                <span className="order-detalle-nota">
                                  {d.NotasEspeciales}
                                </span>
                              )}
                            </div>
                            <span className="order-detalle-precio">
                              {formatPrecio(d.PrecioFinal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {pedido.bebidas.length > 0 && (
                      <div className="order-grupo">
                        <p className="order-grupo-label">Bebidas</p>
                        {pedido.bebidas.map((d, i) => (
                          <div key={i} className="order-detalle-item">
                            <div className="order-detalle-info">
                              <span className="order-detalle-nombre">
                                {d.CantidadPedido}x {d.NombrePlato}
                              </span>
                              {d.NotasEspeciales && (
                                <span className="order-detalle-nota">
                                  {d.NotasEspeciales}
                                </span>
                              )}
                            </div>
                            <span className="order-detalle-precio">
                              {formatPrecio(d.PrecioFinal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="order-card-footer">
                    <button
                      onClick={() => marcarComoListo(pedido.id_Pedidos)}
                      className="btn-order-ready"
                    >
                      PEDIDO LISTO
                    </button>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Vista: Menú del Día ── */}
      {tab === "menu" && (
        <div className="kitchen-board">
          <h2 className="kitchen-subtitle">MENÚ DEL DÍA</h2>

          {menuDelDia.length === 0 ? (
            <div className="kitchen-menu-vacio">
              <p>El administrador aún no ha publicado el menú de hoy.</p>
            </div>
          ) : (
            <>
              {menuPlatos.length > 0 && (
                <div className="kitchen-menu-seccion">
                  <p className="kitchen-menu-grupo-label">Platos</p>
                  <div className="kitchen-menu-grid">
                    {menuPlatos.map((plato, i) => (
                      <div key={i} className="kitchen-menu-card">
                        <img
                          src={IMG_CATEGORIA[String(plato.id_Categoria)] ?? "/CartaCorriente.png"}
                          alt={plato.NombrePlato}
                          className="kitchen-menu-card-img"
                        />
                        <div className="kitchen-menu-card-body">
                          <p className="kitchen-menu-card-nombre">
                            {plato.NombrePlato}
                          </p>
                          {plato.Descripcion && (
                            <p className="kitchen-menu-card-desc">
                              {plato.Descripcion}
                            </p>
                          )}
                          <p className="kitchen-menu-card-precio">
                            {formatPrecio(plato.Precio)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {menuBebidas.length > 0 && (
                <div className="kitchen-menu-seccion">
                  <p className="kitchen-menu-grupo-label">Bebidas</p>
                  <div className="kitchen-menu-grid">
                    {menuBebidas.map((plato, i) => (
                      <div key={i} className="kitchen-menu-card">
                        <img
                          src={IMG_CATEGORIA["4"]}
                          alt={plato.NombrePlato}
                          className="kitchen-menu-card-img"
                        />
                        <div className="kitchen-menu-card-body">
                          <p className="kitchen-menu-card-nombre">
                            {plato.NombrePlato}
                          </p>
                          {plato.Descripcion && (
                            <p className="kitchen-menu-card-desc">
                              {plato.Descripcion}
                            </p>
                          )}
                          <p className="kitchen-menu-card-precio">
                            {formatPrecio(plato.Precio)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="kitchen-menu-resumen">
                <div className="kitchen-menu-resumen-item">
                  <span className="kitchen-menu-resumen-num">
                    {menuPlatos.length}
                  </span>
                  <span className="kitchen-menu-resumen-label">Platos</span>
                </div>
                <div className="kitchen-menu-resumen-item">
                  <span className="kitchen-menu-resumen-num">
                    {menuBebidas.length}
                  </span>
                  <span className="kitchen-menu-resumen-label">Bebidas</span>
                </div>
                <div className="kitchen-menu-resumen-item">
                  <span className="kitchen-menu-resumen-num">
                    {menuDelDia.length}
                  </span>
                  <span className="kitchen-menu-resumen-label">Total</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}

export default Panel_Cocinero;
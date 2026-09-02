import { useState, useEffect } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import Empleados from './Empleados'
import Platos from './Platos'
import Menus from './Menus'
import Reportes from './reportes'
import '../../../Hojas_de_Estilo/Administrador.css';
import '../../App.css';

const API = "http://localhost:5030";

// ── PQRSF: iconos por tipo, usados en el widget del Home ──
const PQRSF_ICON_TIPO = {
  "Petición":     "📋",
  "Queja":        "😤",
  "Reclamo":      "⚠️",
  "Felicitación": "🌟",
  "Sugerencia":   "💡",
}

export function LayoutAdmin({ usuario, paginaActual, children }) {
  const navigate = useNavigate()
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const navItems = [
    { id: "panel", icon: "bi-house", label: "Panel" },
    { id: "empleados", icon: "bi-people", label: "Empleados" },
    { id: "platos", icon: "bi-egg-fried", label: "Platos" },
    { id: "menus", icon: "bi-journal-text", label: "Menús" },
    { id: "reportes", icon: "bi-bar-chart", label: "Reportes" },
  ];

  const cerrarSesion = () => {
    sessionStorage.removeItem("usuario");
    localStorage.removeItem("paginaActual");
    navigate("/login");
  }

  return (
    <div className="admin-layout-container">

      <aside
        className={`sidebar-admin ${sidebarExpanded ? "sidebar-expanded" : "sidebar-collapsed"}`}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        <div className="sidebar-header">
          <div className="sidebar-logo-row">
            <span className="sidebar-logo-icon"><i className="bi bi-shop"></i></span>
            <span className="sidebar-logo-text">MANGATA</span>
          </div>
          <div className={`sidebar-perfil ${sidebarExpanded ? "perfil-visible" : ""}`}>
            <p className="sidebar-bienvenido">Bienvenido,</p>
            <p className="sidebar-nombre">{usuario?.nombre || "Admin"}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${paginaActual === item.id ? "nav-active" : ""}`}
              onClick={() => navigate(item.id === "panel" ? "/admin" : `/${item.id}`)}
              title={item.label}
            >
              <i className={`bi ${item.icon} nav-icon`}></i>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="btn-logout-admin"
            onClick={cerrarSesion}
            title="Cerrar sesión"
          >
            <i className="bi bi-box-arrow-left nav-icon"></i>
            <span className="nav-label">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="admin-content-area">
        {children}
      </main>

    </div>
  )
}

function Panel_Administrador({ usuario }) {
  const [pedidosRealizados, setPedidosRealizados] = useState(0);
  const [gananciasHoy, setGananciasHoy] = useState(0);
  const [totalEntregados, setTotalEntregados] = useState(0);
  const [mesasOcupadas, setMesasOcupadas] = useState(0);
  const [totalMesas, setTotalMesas] = useState(0);
  const [menuDelDia, setMenuDelDia] = useState([]);

  // ── PQRSF: registros para la tabla del Home ──
  const [registrosPqrsf, setRegistrosPqrsf] = useState([]);
  const [cargandoPqrsf, setCargandoPqrsf] = useState(true);

  const cargarDashboard = async () => {
    try {
      const [resPedidos, resMesas, resPqrsf] = await Promise.all([
        axios.get(`${API}/api/pedidos/listar`),
        axios.get(`${API}/api/mesas/listar`),
        axios.get(`${API}/api/pqrsf/listar`),
      ]);

      const pedidos = resPedidos.data;
      const mesas = resMesas.data;
      setRegistrosPqrsf(resPqrsf.data);
      setCargandoPqrsf(false);

      const ahora = new Date();
      const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;

      const pedidosHoy = pedidos.filter(p => p.Fecha_Pedido?.startsWith(hoy));

      const ganancias = pedidosHoy.reduce((acc, p) => acc + (Number(p.TotalPagar) || 0), 0);
      const entregados = pedidosHoy.filter(p => p.EstadoPedido === "entregado").length;
      const ocupadas = mesas.filter(m => m.Estado === "ocupada").length;

      setPedidosRealizados(pedidosHoy.length);
      setGananciasHoy(ganancias);
      setTotalEntregados(entregados);
      setMesasOcupadas(ocupadas);
      setTotalMesas(mesas.length);

    } catch (err) {
      console.error("Error cargando dashboard:", err);
      setCargandoPqrsf(false);
    }

    const menuGuardado = localStorage.getItem("menuDelDia");
    const parsed = menuGuardado ? JSON.parse(menuGuardado) : [];
    setMenuDelDia(Array.isArray(parsed) ? parsed : []);
  };

  useEffect(() => {
    cargarDashboard();
    const intervalo = setInterval(cargarDashboard, 30000);
    return () => clearInterval(intervalo);
  }, []);

  const porcentajeOcupadas = totalMesas > 0 ? Math.round((mesasOcupadas / totalMesas) * 100) : 0;
  const menuPlatos = menuDelDia.filter(p => String(p.id_Categoria) !== "4");
  const menuBebidas = menuDelDia.filter(p => String(p.id_Categoria) === "4");
  const formatPrecio = (precio) => `$${Number(precio).toLocaleString("es-CO")}`;

  return (
    <LayoutAdmin usuario={usuario} paginaActual="panel">
      <div className="dashboard-grid">

        <div className="dashboard-top-row">

          <div className="dash-card menu-dia-card">
            <div className="dash-card-header">
              <i className="bi bi-journal-text dash-card-icon"></i>
              <h2 className="dash-card-titulo">MENÚ DEL DÍA</h2>
            </div>
            {menuDelDia.length === 0 ? (
              <div className="empty-placeholder">
                <i className="bi bi-clipboard-x" style={{ fontSize: "2rem", color: "#555" }}></i>
                <p style={{ marginTop: "10px" }}>Sin platos asignados</p>
                <span>Ve a <strong>Menús</strong> para armar el menú</span>
              </div>
            ) : (
              <div className="menu-dia-lista">
                {menuPlatos.length > 0 && (
                  <div className="menu-dia-grupo">
                    <p className="menu-dia-grupo-label">PLATOS</p>
                    {menuPlatos.map((p, i) => (
                      <div key={i} className="menu-dia-item">
                        <span className="menu-dia-nombre">{p.NombrePlato}</span>
                        <span className="menu-dia-precio">{formatPrecio(p.Precio)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {menuBebidas.length > 0 && (
                  <div className="menu-dia-grupo">
                    <p className="menu-dia-grupo-label">BEBIDAS</p>
                    {menuBebidas.map((p, i) => (
                      <div key={i} className="menu-dia-item">
                        <span className="menu-dia-nombre">{p.NombrePlato}</span>
                        <span className="menu-dia-precio">{formatPrecio(p.Precio)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="menu-dia-total">{menuDelDia.length} ítems en el menú</p>
              </div>
            )}
          </div>

          <div className="dash-card mesas-card">
            <div className="dash-card-header">
              <i className="bi bi-grid dash-card-icon"></i>
              <h2 className="dash-card-titulo">MESAS OCUPADAS</h2>
            </div>
            <div className="mesas-circle-wrap">
              <svg viewBox="0 0 100 100" className="mesas-svg">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#2a2a2a" strokeWidth="10"/>
                <circle
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke="#e87d2a"
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - porcentajeOcupadas / 100)}`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
                <text x="50" y="55" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold">
                  {mesasOcupadas}
                </text>
              </svg>
            </div>
            <p className="mesas-label">Mesas ocupadas</p>
            <p className="mesas-detalle">{mesasOcupadas} de {totalMesas} ({porcentajeOcupadas}%)</p>
          </div>
        </div>

        <div className="dashboard-stats-row">
          <div className="stat-card">
            <div className="stat-card-icon-wrap">
              <i className="bi bi-receipt stat-card-icon"></i>
            </div>
            <div className="stat-card-info">
              <p className="stat-card-label">Pedidos Realizados</p>
              <p className="stat-number">{pedidosRealizados}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon-wrap">
              <i className="bi bi-currency-dollar stat-card-icon"></i>
            </div>
            <div className="stat-card-info">
              <p className="stat-card-label">Ganancias de hoy</p>
              <p className="stat-number">{formatPrecio(gananciasHoy)} <span className="stat-cop">COP</span></p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon-wrap">
              <i className="bi bi-check-circle stat-card-icon"></i>
            </div>
            <div className="stat-card-info">
              <p className="stat-card-label">Total Entregados</p>
              <p className="stat-number">{totalEntregados}</p>
            </div>
          </div>
        </div>

        {/* ── PQRSF: buzón de Peticiones, Quejas, Reclamos, Felicitaciones y Sugerencias ── */}
        <div className="dash-card pqrsf-home-card">
          <div className="dash-card-header">
            <i className="bi bi-chat-left-text dash-card-icon"></i>
            <h2 className="dash-card-titulo">PQRSF</h2>
          </div>

          {cargandoPqrsf && <p className="pqrsf-home-estado-msg">Cargando registros...</p>}

          {!cargandoPqrsf && registrosPqrsf.length === 0 && (
            <div className="empty-placeholder">
              <i className="bi bi-chat-square-text" style={{ fontSize: "2rem", color: "#555" }}></i>
              <p style={{ marginTop: "10px" }}>Aún no hay registros</p>
              <span>Los mensajes que envíen los clientes desde la mesa aparecerán aquí</span>
            </div>
          )}

          {!cargandoPqrsf && registrosPqrsf.length > 0 && (
            <div className="pqrsf-home-tabla-wrap">
              <table className="pqrsf-home-tabla">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Nombre</th>
                    <th>Mensaje</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosPqrsf.map(r => (
                    <tr key={r.id_Registro_PQRSF}>
                      <td className="pqrsf-home-td-tipo">
                        <span>{PQRSF_ICON_TIPO[r.TipoPQRSF] || "📌"}</span> {r.TipoPQRSF}
                      </td>
                      <td>{r.Nombre}</td>
                      <td className="pqrsf-home-td-mensaje">{r.Mensaje}</td>
                      <td className="pqrsf-home-td-fecha">{r.Fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </LayoutAdmin>
  )
}

export default Panel_Administrador;
import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import '../../../Hojas_de_Estilo/Administrador.css'
import '../../App.css'

const API = "http://localhost:5030"

const PQRSF_ICON_TIPO = {
    "Petición": "📋",
    "Queja": "😤",
    "Reclamo": "⚠️",
    "Felicitación": "🌟",
    "Sugerencia": "💡",
}

const fmt = n => `$${Number(n || 0).toLocaleString("es-CO")}`

const obtenerHoy = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const normalizarFecha = valor => {
    if (!valor) return ""
    return String(valor).substring(0, 10)
}

const nombreMetodo = metodo => {
    if (!metodo) return "Sin método"
    return metodo
}

export function LayoutAdmin({ usuario, paginaActual, children }) {
    const navigate = useNavigate()
    const [sidebarExpanded, setSidebarExpanded] = useState(false)

    const navItems = [
        { id: "panel", icon: "bi-house", label: "Panel" },
        { id: "empleados", icon: "bi-people", label: "Empleados" },
        { id: "platos", icon: "bi-egg-fried", label: "Platos" },
        { id: "menus", icon: "bi-journal-text", label: "Menús" },
        { id: "mesas", icon: "bi-qr-code", label: "Mesas" },
        { id: "reportes", icon: "bi-bar-chart", label: "Reportes" },
    ]

    const cerrarSesion = () => {
        sessionStorage.removeItem("usuario")
        sessionStorage.removeItem("token")
        sessionStorage.removeItem("rol")
        delete axios.defaults.headers.common["Authorization"]
        localStorage.removeItem("paginaActual")
        navigate("/login")
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
                        <span className="sidebar-logo-icon">
                            <i className="bi bi-shop"></i>
                        </span>
                        <span className="sidebar-logo-text">MANGATA</span>
                    </div>

                    <div className={`sidebar-perfil ${sidebarExpanded ? "perfil-visible" : ""}`}>
                        <p className="sidebar-bienvenido">Bienvenido,</p>
                        <p className="sidebar-nombre">
                            {usuario?.nombre || "Admin"}
                        </p>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            className={`sidebar-nav-item ${paginaActual === item.id ? "nav-active" : ""}`}
                            onClick={() =>
                                navigate(
                                    item.id === "panel"
                                        ? "/admin"
                                        : `/${item.id}`
                                )
                            }
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
    const [pedidos, setPedidos] = useState([])
    const [mesas, setMesas] = useState([])
    const [menuDelDia, setMenuDelDia] = useState([])

    const [registrosPqrsf, setRegistrosPqrsf] = useState([])
    const [cargando, setCargando] = useState(true)

    const cargarDashboard = useCallback(async () => {
        try {
            const [resPedidos, resMesas, resPqrsf, resMenuDia] = await Promise.all([
                axios.get(`${API}/api/pedidos/listar`),
                axios.get(`${API}/api/mesas/listar`),
                axios.get(`${API}/api/pqrsf/listar`),
                axios.get(`${API}/api/menu-dia/hoy`)
            ])

            setPedidos(Array.isArray(resPedidos.data) ? resPedidos.data : [])
            setMesas(Array.isArray(resMesas.data) ? resMesas.data : [])
            setRegistrosPqrsf(Array.isArray(resPqrsf.data) ? resPqrsf.data : [])
            setMenuDelDia(resMenuDia.data && Array.isArray(resMenuDia.data.items) ? resMenuDia.data.items : [])
        } catch (error) {
            console.error("Error cargando dashboard:", error)
        } finally {
            setCargando(false)
        }
    }, [])

    useEffect(() => {
        cargarDashboard()

        const intervalo = setInterval(cargarDashboard, 30000)

        return () => clearInterval(intervalo)
    }, [cargarDashboard])

    const hoy = obtenerHoy()

    const pedidosHoy = pedidos.filter(
        p => normalizarFecha(p.Fecha_Pedido) === hoy
    )

    const pagosAprobadosHoy = pedidosHoy.filter(
        p => String(p.EstadoPago || "").toLowerCase() === "aprobado"
    )

    const pedidosEntregadosHoy = pagosAprobadosHoy.filter(
        p => String(p.EstadoPedido || "").toLowerCase() === "entregado"
    )

    const gananciasHoy = pagosAprobadosHoy.reduce(
        (total, p) => total + Number(p.TotalPagar || 0),
        0
    )

    const gananciasEntregadasHoy = pedidosEntregadosHoy.reduce(
        (total, p) => total + Number(p.TotalPagar || 0),
        0
    )

    const mesasOcupadas = mesas.filter(
        m => String(m.Estado || "").toLowerCase() === "ocupada"
    ).length

    const porcentajeOcupadas =
        mesas.length > 0
            ? Math.round((mesasOcupadas / mesas.length) * 100)
            : 0

    const menuPlatos = menuDelDia.filter(
        p => String(p.id_Categoria) !== "4"
    )

    const menuBebidas = menuDelDia.filter(
        p => String(p.id_Categoria) === "4"
    )

    const pagosPorMetodo = pagosAprobadosHoy.reduce((acc, pedido) => {
        const metodo = nombreMetodo(pedido.MetodoPago)

        if (!acc[metodo]) {
            acc[metodo] = {
                cantidad: 0,
                total: 0
            }
        }

        acc[metodo].cantidad += 1
        acc[metodo].total += Number(pedido.TotalPagar || 0)

        return acc
    }, {})

    const metodosOrdenados = Object.entries(pagosPorMetodo)
        .sort((a, b) => b[1].total - a[1].total)

    const ultimosPagos = pagosAprobadosHoy
        .slice()
        .sort(
            (a, b) =>
                new Date(b.Fecha_Pedido) -
                new Date(a.Fecha_Pedido)
        )
        .slice(0, 8)

    return (
        <LayoutAdmin usuario={usuario} paginaActual="panel">
            <div className="dashboard-grid">

                <div className="dashboard-top-row">

                    <div className="dash-card menu-dia-card">
                        <div className="dash-card-header">
                            <i className="bi bi-journal-text dash-card-icon"></i>
                            <h2 className="dash-card-titulo">
                                MENÚ DEL DÍA
                            </h2>
                        </div>

                        {menuDelDia.length === 0 ? (
                            <div className="empty-placeholder">
                                <i
                                    className="bi bi-clipboard-x"
                                    style={{
                                        fontSize: "2rem",
                                        color: "#555"
                                    }}
                                ></i>

                                <p style={{ marginTop: "10px" }}>
                                    Sin platos asignados
                                </p>

                                <span>
                                    Ve a <strong>Menús</strong> para
                                    armar el menú
                                </span>
                            </div>
                        ) : (
                            <div className="menu-dia-lista">

                                {menuPlatos.length > 0 && (
                                    <div className="menu-dia-grupo">
                                        <p className="menu-dia-grupo-label">
                                            PLATOS
                                        </p>

                                        {menuPlatos.map((p, i) => (
                                            <div
                                                key={i}
                                                className="menu-dia-item"
                                            >
                                                <span className="menu-dia-nombre">
                                                    {p.NombrePlato}
                                                </span>

                                                <span className="menu-dia-precio">
                                                    {fmt(p.Precio)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {menuBebidas.length > 0 && (
                                    <div className="menu-dia-grupo">
                                        <p className="menu-dia-grupo-label">
                                            BEBIDAS
                                        </p>

                                        {menuBebidas.map((p, i) => (
                                            <div
                                                key={i}
                                                className="menu-dia-item"
                                            >
                                                <span className="menu-dia-nombre">
                                                    {p.NombrePlato}
                                                </span>

                                                <span className="menu-dia-precio">
                                                    {fmt(p.Precio)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <p className="menu-dia-total">
                                    {menuDelDia.length} ítems en el menú
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="dash-card mesas-card">
                        <div className="dash-card-header">
                            <i className="bi bi-grid dash-card-icon"></i>

                            <h2 className="dash-card-titulo">
                                MESAS OCUPADAS
                            </h2>
                        </div>

                        <div className="mesas-circle-wrap">
                            <svg
                                viewBox="0 0 100 100"
                                className="mesas-svg"
                            >
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    stroke="#2a2a2a"
                                    strokeWidth="10"
                                />

                                <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    stroke="#e87d2a"
                                    strokeWidth="10"
                                    strokeDasharray={`${2 * Math.PI * 40}`}
                                    strokeDashoffset={
                                        2 *
                                        Math.PI *
                                        40 *
                                        (1 - porcentajeOcupadas / 100)
                                    }
                                    strokeLinecap="round"
                                    transform="rotate(-90 50 50)"
                                />

                                <text
                                    x="50"
                                    y="55"
                                    textAnchor="middle"
                                    fill="white"
                                    fontSize="22"
                                    fontWeight="bold"
                                >
                                    {mesasOcupadas}
                                </text>
                            </svg>
                        </div>

                        <p className="mesas-label">
                            Mesas ocupadas
                        </p>

                        <p className="mesas-detalle">
                            {mesasOcupadas} de {mesas.length} (
                            {porcentajeOcupadas}%)
                        </p>
                    </div>
                </div>

                <div className="dashboard-stats-row">

                    <div className="stat-card">
                        <div className="stat-card-icon-wrap">
                            <i className="bi bi-receipt stat-card-icon"></i>
                        </div>

                        <div className="stat-card-info">
                            <p className="stat-card-label">
                                Pedidos de hoy
                            </p>

                            <p className="stat-number">
                                {pedidosHoy.length}
                            </p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-icon-wrap">
                            <i className="bi bi-currency-dollar stat-card-icon"></i>
                        </div>

                        <div className="stat-card-info">
                            <p className="stat-card-label">
                                Ingresos de hoy
                            </p>

                            <p className="stat-number">
                                {fmt(gananciasHoy)}
                                <span className="stat-cop"> COP</span>
                            </p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-card-icon-wrap">
                            <i className="bi bi-check-circle stat-card-icon"></i>
                        </div>

                        <div className="stat-card-info">
                            <p className="stat-card-label">
                                Entregados
                            </p>

                            <p className="stat-number">
                                {pedidosEntregadosHoy.length}
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    className="dash-card"
                    style={{
                        padding: "22px",
                        marginTop: "4px"
                    }}
                >
                    <div className="dash-card-header">
                        <i className="bi bi-credit-card dash-card-icon"></i>

                        <h2 className="dash-card-titulo">
                            PAGOS DE HOY
                        </h2>
                    </div>

                    {metodosOrdenados.length === 0 ? (
                        <div className="empty-placeholder">
                            <i
                                className="bi bi-wallet2"
                                style={{
                                    fontSize: "2rem",
                                    color: "#555"
                                }}
                            ></i>

                            <p style={{ marginTop: "10px" }}>
                                Aún no hay pagos aprobados hoy
                            </p>
                        </div>
                    ) : (
                        <>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                        "repeat(auto-fit,minmax(170px,1fr))",
                                    gap: "12px",
                                    marginBottom: "20px"
                                }}
                            >
                                {metodosOrdenados.map(
                                    ([metodo, info]) => (
                                        <div
                                            key={metodo}
                                            style={{
                                                padding: "15px",
                                                borderRadius: "12px",
                                                background:
                                                    "rgba(255,255,255,0.035)",
                                                border:
                                                    "1px solid rgba(232,125,42,0.2)"
                                            }}
                                        >
                                            <div
                                                style={{
                                                    color: "#aaa",
                                                    fontSize: "0.75rem",
                                                    textTransform:
                                                        "uppercase",
                                                    marginBottom: "6px"
                                                }}
                                            >
                                                {metodo}
                                            </div>

                                            <div
                                                style={{
                                                    color: "#e87d2a",
                                                    fontSize: "1.25rem",
                                                    fontWeight: "700"
                                                }}
                                            >
                                                {fmt(info.total)}
                                            </div>

                                            <div
                                                style={{
                                                    color: "#666",
                                                    fontSize: "0.75rem",
                                                    marginTop: "4px"
                                                }}
                                            >
                                                {info.cantidad} pago
                                                {info.cantidad !== 1
                                                    ? "s"
                                                    : ""}
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    paddingTop: "14px",
                                    borderTop:
                                        "1px solid rgba(255,255,255,0.08)"
                                }}
                            >
                                <span
                                    style={{
                                        color: "#999",
                                        fontSize: "0.85rem"
                                    }}
                                >
                                    Total recibido
                                </span>

                                <strong
                                    style={{
                                        color: "#fff",
                                        fontSize: "1.15rem"
                                    }}
                                >
                                    {fmt(gananciasHoy)}
                                </strong>
                            </div>
                        </>
                    )}
                </div>

                <div
                    className="dash-card"
                    style={{
                        padding: "22px",
                        marginTop: "4px"
                    }}
                >
                    <div className="dash-card-header">
                        <i className="bi bi-clock-history dash-card-icon"></i>

                        <h2 className="dash-card-titulo">
                            ÚLTIMOS PAGOS
                        </h2>
                    </div>

                    {ultimosPagos.length === 0 ? (
                        <p
                            style={{
                                color: "#666",
                                textAlign: "center",
                                padding: "25px"
                            }}
                        >
                            No hay pagos aprobados todavía.
                        </p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontSize: "0.82rem"
                                }}
                            >
                                <thead>
                                    <tr>
                                        {[
                                            "Pedido",
                                            "Mesa",
                                            "Método",
                                            "Estado",
                                            "Total"
                                        ].map(t => (
                                            <th
                                                key={t}
                                                style={{
                                                    textAlign: "left",
                                                    padding: "10px",
                                                    color: "#e87d2a",
                                                    borderBottom:
                                                        "1px solid rgba(232,125,42,0.2)",
                                                    fontSize: "0.72rem",
                                                    letterSpacing: "1px"
                                                }}
                                            >
                                                {t}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    {ultimosPagos.map(p => (
                                        <tr key={p.id_Pedidos}>
                                            <td
                                                style={{
                                                    padding: "10px",
                                                    color: "#fff"
                                                }}
                                            >
                                                #{p.id_Pedidos}
                                            </td>

                                            <td
                                                style={{
                                                    padding: "10px",
                                                    color: "#bbb"
                                                }}
                                            >
                                                Mesa {p.Numero_mesa ?? "—"}
                                            </td>

                                            <td
                                                style={{
                                                    padding: "10px",
                                                    color: "#ddd"
                                                }}
                                            >
                                                {p.MetodoPago || "Sin método"}
                                            </td>

                                            <td
                                                style={{
                                                    padding: "10px"
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        padding:
                                                            "4px 9px",
                                                        borderRadius:
                                                            "20px",
                                                        background:
                                                            "rgba(46,204,113,0.12)",
                                                        color: "#2ecc71",
                                                        fontSize:
                                                            "0.7rem"
                                                    }}
                                                >
                                                    APROBADO
                                                </span>
                                            </td>

                                            <td
                                                style={{
                                                    padding: "10px",
                                                    color: "#e87d2a",
                                                    fontWeight: "700"
                                                }}
                                            >
                                                {fmt(p.TotalPagar)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="dash-card pqrsf-home-card">
                    <div className="dash-card-header">
                        <i className="bi bi-chat-left-text dash-card-icon"></i>

                        <h2 className="dash-card-titulo">
                            PQRSF
                        </h2>
                    </div>

                    {cargando ? (
                        <p className="pqrsf-home-estado-msg">
                            Cargando registros...
                        </p>
                    ) : registrosPqrsf.length === 0 ? (
                        <div className="empty-placeholder">
                            <i
                                className="bi bi-chat-square-text"
                                style={{
                                    fontSize: "2rem",
                                    color: "#555"
                                }}
                            ></i>

                            <p style={{ marginTop: "10px" }}>
                                Aún no hay registros
                            </p>

                            <span>
                                Los mensajes de los clientes
                                aparecerán aquí
                            </span>
                        </div>
                    ) : (
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
                                                <span>
                                                    {PQRSF_ICON_TIPO[r.TipoPQRSF] || "📌"}
                                                </span>{" "}
                                                {r.TipoPQRSF}
                                            </td>

                                            <td>{r.Nombre}</td>

                                            <td className="pqrsf-home-td-mensaje">
                                                {r.Mensaje}
                                            </td>

                                            <td className="pqrsf-home-td-fecha">
                                                {r.Fecha}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        color: "#666",
                        fontSize: "0.75rem",
                        padding: "4px 5px 20px"
                    }}
                >
                    Pagos aprobados hoy: {pagosAprobadosHoy.length}
                    {" · "}
                    Entregado: {fmt(gananciasEntregadasHoy)}
                </div>
            </div>
        </LayoutAdmin>
    )
}

export default Panel_Administrador
import { useEffect, useState, useCallback, useRef } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import '../../Hojas_de_Estilo/Mesero.css'
import { inicializarAudio, reproducirNotificacion } from './utils/audioHelper'

const API = "http://localhost:5030"

const fmt = n => `$${Number(n || 0).toLocaleString("es-CO")}`
const fmtHora = s => new Date(s).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
const fmtFecha = s => new Date(s).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
const hoyStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` }

const BADGE = {
    pendiente: { bg: "rgba(241,196,15,0.2)", color: "#f1c40f", label: "Pendiente"  },
    preparando: { bg: "rgba(52,152,219,0.2)", color: "#3498db", label: "Preparando" },
    listo: { bg: "rgba(46,204,113,0.2)",  color: "#2ecc71", label: "Listo" },
    entregado: { bg: "rgba(149,165,166,0.2)", color: "#95a5a6", label: "Entregado" },
    cancelado: { bg: "rgba(231,76,60,0.2)", color: "#e74c3c", label: "Cancelado" },
}

const NAV = [
    { pagina: "mesero", icono: "bi-grid-3x3-gap", label: "Mesas"},
    { pagina: "menu", icono: "bi-journal-text", label: "Menú del día"},
    { pagina: "mensajecliente", icono: "bi-chat-dots", label: "Pedidos clientes" },
    { pagina: "mensajecocina", icono: "bi-bell", label: "Mensajes cocina"},
]

//Layout compartido 
export function LayoutMesero({ usuario, paginaActual, children }) {
    const navigate = useNavigate()
    const [pedidos,  setPedidos]  = useState([])
    const [cargando, setCargando] = useState(true)

    const user = usuario ?? JSON.parse(sessionStorage.getItem("usuario") ?? "null")

    // ── Refs para detección de pedidos activos generales (preparando + listo) ──
    const idsActivosAntRef = useRef(null)
    const primeraCargaRef  = useRef(true)

    const reproducirAlerta = () => {
        reproducirNotificacion()
    }

    // ── Polling del historial propio del mesero (30s) ──
    const cargar = useCallback(async () => {
        const u = usuario ?? JSON.parse(sessionStorage.getItem("usuario") ?? "null")
        const uid = u?.id_Usuarios_Restaurante ?? u?.id
        if (!uid) return
        try {
            const res = await axios.get(`${API}/api/pedidos/mesero/${uid}`)
            setPedidos(res.data)
        } catch (e) { console.error(e) }
        finally { setCargando(false) }
    }, [usuario])

    // ── Polling de notificaciones: pedidos activos GENERALES (15s) ──
    const verificarPedidosActivos = useCallback(async () => {
        try {
            const [resPreparando, resListos] = await Promise.all([
                axios.get(`${API}/api/pedidos/estado/preparando`),
                axios.get(`${API}/api/pedidos/estado/listo`),
            ])

            const idsAhora = new Set([
                ...resPreparando.data.map(p => p.id_Pedidos),
                ...resListos.data.map(p => p.id_Pedidos),
            ])

            if (primeraCargaRef.current) {
                // Primera carga: guardamos IDs actuales sin sonar
                idsActivosAntRef.current = idsAhora
                primeraCargaRef.current  = false
            } else {
                // Ciclos siguientes: detectamos IDs nuevos
                const nuevos = [...idsAhora].filter(
                    id => !idsActivosAntRef.current.has(id)
                )
                if (nuevos.length > 0) {
                    console.log("[Mesero] Pedidos nuevos detectados:", nuevos)
                    reproducirAlerta()
                }
                idsActivosAntRef.current = idsAhora
            }
        } catch (e) { console.error("[Mesero] Error verificando pedidos activos:", e) }
    }, [])

    useEffect(() => {
        if (!user) { navigate("/login"); return }
        inicializarAudio()
        // Arrancamos ambos pollings de forma independiente
        cargar()
        verificarPedidosActivos()
        const ivHistorial      = setInterval(cargar, 30000)
        const ivNotificaciones = setInterval(verificarPedidosActivos, 15000)
        return () => {
            clearInterval(ivHistorial)
            clearInterval(ivNotificaciones)
        }
    }, [usuario])

    const cerrarSesion = () => {
        ["usuario","token","rol","mesaSeleccionada","idMesero"].forEach(k => sessionStorage.removeItem(k))
        navigate("/login")
    }

    const pedidosHoy    = pedidos.filter(p => p.Fecha_Pedido?.startsWith(hoyStr()))
    const entregadosHoy = pedidosHoy.filter(p => p.EstadoPedido === "entregado")
    const gananciasHoy  = entregadosHoy.reduce((a, p) => a + Number(p.TotalPagar || 0), 0)

    return (
        <div className="mesero-layout">

            {/* ── SIDEBAR ── */}
            <aside className="mesero-sidebar">
                {/* Perfil */}
                <div style={{ textAlign: "center", paddingBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "12px" }}>
                    <div className="mesero-avatar" style={{ margin: "0 auto 10px" }}>
                        {(user?.nombre ?? "M")[0].toUpperCase()}
                    </div>
                    <p style={{ color: "#888", fontSize: "0.68rem", letterSpacing: "2px", textTransform: "uppercase", margin: "0 0 2px" }}>Mesero</p>
                    <p style={{ color: "#e87d2a", fontWeight: 700, fontSize: "0.92rem", margin: 0, textTransform: "capitalize" }}>{user?.nombre ?? "—"}</p>
                </div>

                {/* Nav */}
                <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                    {NAV.map(item => (
                        <button key={item.pagina}
                            className={`mesero-nav-btn ${paginaActual === item.pagina ? "mesero-nav-activo" : ""}`}
                            onClick={() => navigate(`/${item.pagina}`)}
                        >
                            <i className={`bi ${item.icono}`} style={{ fontSize: "1.1rem", flexShrink: 0 }}></i>
                            <span style={{ fontSize: "0.83rem" }}>{item.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Cerrar sesión */}
                <button onClick={cerrarSesion} style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 13px", border: "1px solid #e74c3c",
                    borderRadius: "10px", background: "transparent", color: "#e74c3c",
                    cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, width: "100%",
                    transition: "background 0.2s", marginTop: "auto"
                }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(231,76,60,0.12)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                    <i className="bi bi-box-arrow-left"></i>
                    <span>Cerrar sesión</span>
                </button>
            </aside>

            {/* ── CONTENIDO CENTRAL ── */}
            <main className="mesero-main">
                {children}
            </main>

            {/* ── HISTORIAL ── */}
            <aside className="mesero-historial">
                <h2 className="mesero-titulo-seccion" style={{ marginBottom: "16px" }}>Historial de pedidos</h2>

                {/* Resumen hoy */}
                <div className="mesero-resumen-hoy">
                    <div className="mesero-resumen-item">
                        <span className="mesero-resumen-valor">{pedidosHoy.length}</span>
                        <span className="mesero-resumen-label">Pedidos hoy</span>
                    </div>
                    <div className="mesero-resumen-divider"/>
                    <div className="mesero-resumen-item">
                        <span className="mesero-resumen-valor">{entregadosHoy.length}</span>
                        <span className="mesero-resumen-label">Entregados</span>
                    </div>
                    <div className="mesero-resumen-divider"/>
                    <div className="mesero-resumen-item">
                        <span className="mesero-resumen-valor mesero-resumen-dinero">{fmt(gananciasHoy)}</span>
                        <span className="mesero-resumen-label">Ganado hoy</span>
                    </div>
                </div>

                {/* Lista de pedidos */}
                <div className="mesero-pedidos-lista">
                    {cargando
                        ? <p className="mesero-sin-pedidos">Cargando...</p>
                        : pedidos.length === 0
                            ? <p className="mesero-sin-pedidos">Sin pedidos registrados</p>
                            : pedidos.map(p => {
                                const est = BADGE[p.EstadoPedido] ?? BADGE.pendiente
                                return (
                                    <div key={p.id_Pedidos} className="mesero-pedido-card">
                                        <div className="mesero-pedido-top">
                                            <span className="mesero-pedido-id">#{p.id_Pedidos}</span>
                                            <span className="mesero-pedido-mesa">Mesa {p.Numero_mesa ?? "—"}</span>
                                            <span className="mesero-pedido-badge"
                                                style={{ background: est.bg, color: est.color }}>
                                                {est.label}
                                            </span>
                                        </div>
                                        <div className="mesero-pedido-bottom">
                                            <span className="mesero-pedido-fecha">{fmtFecha(p.Fecha_Pedido)} · {fmtHora(p.Fecha_Pedido)}</span>
                                            <span className="mesero-pedido-total">{fmt(p.TotalPagar)}</span>
                                        </div>
                                    </div>
                                )
                            })
                    }
                </div>

                {/* Total fijo abajo */}
                <div className="mesero-total-ganado">
                    <span>Total ganado hoy</span>
                    <span className="mesero-total-num">{fmt(gananciasHoy)} <small>COP</small></span>
                </div>
            </aside>
        </div>
    )
}

// ── Panel de mesas ────────────────────────────────────────────────────────────
function Panel_Mesero({ usuario }) {
    const navigate = useNavigate()
    const [mesas,    setMesas]    = useState([])
    const [cargando, setCargando] = useState(true)

    const user = usuario ?? JSON.parse(sessionStorage.getItem("usuario") ?? "null")
    const uid  = user?.id_Usuarios_Restaurante ?? user?.id

    const cargarMesas = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/api/mesas/listar`)
            setMesas(res.data.map(m => ({ id: m.id_Mesas, numero: m.Numero_mesa, estado: m.Estado })))
        } catch (e) { console.error(e) }
        finally { setCargando(false) }
    }, [])

    useEffect(() => {
        cargarMesas()
        const iv = setInterval(cargarMesas, 30000)
        return () => clearInterval(iv)
    }, [])

    return (
        <LayoutMesero usuario={usuario} paginaActual="mesero">
            <div style={{ padding: "32px 28px" }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    marginBottom: "28px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <h1 className="mesero-titulo-seccion" style={{ fontSize: "1.3rem", letterSpacing: "3px" }}>
                        Mesas del restaurante
                    </h1>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <span style={{ fontSize: "0.75rem", padding: "4px 14px", borderRadius: "20px", fontWeight: 600,
                            background: "rgba(46,204,113,0.12)", color: "#2ecc71", border: "1px solid rgba(46,204,113,0.3)" }}>
                            Disponible
                        </span>
                        <span style={{ fontSize: "0.75rem", padding: "4px 14px", borderRadius: "20px", fontWeight: 600,
                            background: "rgba(231,76,60,0.12)", color: "#e74c3c", border: "1px solid rgba(231,76,60,0.3)" }}>
                            Ocupada
                        </span>
                    </div>
                </div>

                {/* Grid de mesas */}
                {cargando
                    ? <p className="mesero-loading">Cargando mesas...</p>
                    : (
                        <div className="mesero-mesas-grid">
                            {mesas.map(mesa => {
                                const libre = mesa.estado === "disponible"
                                return (
                                    <div key={mesa.id}
                                        className={`mesero-mesa-card ${libre ? "mesero-mesa-libre" : "mesero-mesa-ocupada"}`}
                                        onClick={() => {
                                            localStorage.setItem("mesaSeleccionada", mesa.numero)
                                            localStorage.setItem("idMesero", uid)
                                            navigate("/menu")
                                        }}
                                    >
                                        <span className="mesero-mesa-num">{mesa.numero}</span>
                                        <span style={{ fontSize: "0.8rem", color: libre ? "#2ecc71" : "#e74c3c" }}>●</span>
                                        <span className="mesero-mesa-estado">{libre ? "DISPONIBLE" : "OCUPADA"}</span>
                                    </div>
                                )
                            })}
                        </div>
                    )
                }
            </div>
        </LayoutMesero>
    )
}

export default Panel_Mesero
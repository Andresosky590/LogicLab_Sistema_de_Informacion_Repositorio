import { useEffect, useState, useCallback, useRef } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import '../../Hojas_de_Estilo/Mesero.css'
import {
    inicializarAudio,
    reproducirNotificacion
} from './utils/audioHelper'

const API = "http://localhost:5030"

const fmt = n =>
    `$${Number(n || 0).toLocaleString("es-CO")}`

const fmtHora = s => {
    if (!s) return "—"

    const fecha = new Date(s)

    if (Number.isNaN(fecha.getTime())) return "—"

    return fecha.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit"
    })
}

const fmtFecha = s => {
    if (!s) return "—"

    const fecha = new Date(s)

    if (Number.isNaN(fecha.getTime())) return "—"

    return fecha.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short"
    })
}

const hoyStr = () => {
    const d = new Date()

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const BADGE = {
    pendiente: {
        bg: "rgba(241,196,15,0.2)",
        color: "#f1c40f",
        label: "Pendiente"
    },

    preparando: {
        bg: "rgba(52,152,219,0.2)",
        color: "#3498db",
        label: "Preparando"
    },

    listo: {
        bg: "rgba(46,204,113,0.2)",
        color: "#2ecc71",
        label: "Listo"
    },

    entregado: {
        bg: "rgba(149,165,166,0.2)",
        color: "#95a5a6",
        label: "Entregado"
    },

    cancelado: {
        bg: "rgba(231,76,60,0.2)",
        color: "#e74c3c",
        label: "Cancelado"
    }
}

const NAV = [
    {
        pagina: "mesero",
        icono: "bi-grid-3x3-gap",
        label: "Mesas"
    },
    {
        pagina: "pedidoasistido",
        icono: "bi-plus-circle",
        label: "Pedido asistido"
    },
    {
        pagina: "menu",
        icono: "bi-journal-text",
        label: "Menú del día"
    },
    {
        pagina: "mensajecliente",
        icono: "bi-chat-dots",
        label: "Pedidos clientes"
    },
    {
        pagina: "mensajecocina",
        icono: "bi-bell",
        label: "Mensajes cocina"
    }
]

export function LayoutMesero({
    usuario,
    paginaActual,
    children
}) {
    const navigate = useNavigate()

    const [pedidos, setPedidos] = useState([])
    const [cargando, setCargando] = useState(true)

    const user =
        usuario ??
        JSON.parse(
            sessionStorage.getItem("usuario") ?? "null"
        )

    const idsActivosAntRef = useRef(null)
    const primeraCargaRef = useRef(true)

    const cargar = useCallback(async () => {
        const u =
            usuario ??
            JSON.parse(
                sessionStorage.getItem("usuario") ?? "null"
            )

        const uid =
            u?.id_Usuarios_Restaurante ??
            u?.id

        if (!uid) {
            setCargando(false)
            return
        }

        try {
            const res = await axios.get(
                `${API}/api/pedidos/mesero/${uid}`
            )

            setPedidos(
                Array.isArray(res.data)
                    ? res.data
                    : []
            )
        } catch (error) {
            console.error(
                "[Mesero] Error cargando pedidos:",
                error
            )
        } finally {
            setCargando(false)
        }
    }, [usuario])

    const verificarPedidosActivos = useCallback(async () => {
        try {
            const [
                resPreparando,
                resListos
            ] = await Promise.all([
                axios.get(
                    `${API}/api/pedidos/estado/preparando`
                ),
                axios.get(
                    `${API}/api/pedidos/estado/listo`
                )
            ])

            const preparando =
                Array.isArray(resPreparando.data)
                    ? resPreparando.data
                    : []

            const listos =
                Array.isArray(resListos.data)
                    ? resListos.data
                    : []

            const idsAhora = new Set([
                ...preparando.map(
                    p => p.id_Pedidos
                ),
                ...listos.map(
                    p => p.id_Pedidos
                )
            ])

            if (primeraCargaRef.current) {
                idsActivosAntRef.current = idsAhora
                primeraCargaRef.current = false
                return
            }

            const anteriores =
                idsActivosAntRef.current ??
                new Set()

            const nuevos = [
                ...idsAhora
            ].filter(
                id => !anteriores.has(id)
            )

            if (nuevos.length > 0) {
                reproducirNotificacion()
            }

            idsActivosAntRef.current = idsAhora
        } catch (error) {
            console.error(
                "[Mesero] Error verificando pedidos activos:",
                error
            )
        }
    }, [])

    useEffect(() => {
        if (!user) {
            navigate("/login")
            return
        }

        inicializarAudio()

        cargar()
        verificarPedidosActivos()

        const ivHistorial =
            setInterval(cargar, 30000)

        const ivNotificaciones =
            setInterval(
                verificarPedidosActivos,
                15000
            )

        return () => {
            clearInterval(ivHistorial)
            clearInterval(ivNotificaciones)
        }
    }, [
        usuario,
        navigate,
        cargar,
        verificarPedidosActivos
    ])

    const cerrarSesion = () => {
        [
            "usuario",
            "token",
            "rol",
            "mesaSeleccionada",
            "idMesero"
        ].forEach(k =>
            sessionStorage.removeItem(k)
        )

        delete axios.defaults.headers.common[
            "Authorization"
        ]

        navigate("/login")
    }

    const pedidosHoy = pedidos.filter(
        p =>
            p.Fecha_Pedido?.startsWith(
                hoyStr()
            )
    )

    const entregadosHoy =
        pedidosHoy.filter(
            p =>
                String(
                    p.EstadoPedido || ""
                ).toLowerCase() ===
                "entregado"
        )

    const pagosAprobadosHoy =
        pedidosHoy.filter(
            p =>
                String(
                    p.EstadoPago || ""
                ).toLowerCase() ===
                "aprobado"
        )

    const gananciasHoy =
        pagosAprobadosHoy.reduce(
            (total, p) =>
                total +
                Number(
                    p.TotalPagar || 0
                ),
            0
        )

    const pagosPorMetodo =
        pagosAprobadosHoy.reduce(
            (acc, p) => {
                const metodo =
                    p.MetodoPago ||
                    "Sin método"

                if (!acc[metodo]) {
                    acc[metodo] = {
                        cantidad: 0,
                        total: 0
                    }
                }

                acc[metodo].cantidad += 1
                acc[metodo].total +=
                    Number(
                        p.TotalPagar || 0
                    )

                return acc
            },
            {}
        )

    return (
        <div className="mesero-layout">

            <aside className="mesero-sidebar">

                <div
                    style={{
                        textAlign: "center",
                        paddingBottom: "20px",
                        borderBottom:
                            "1px solid rgba(255,255,255,0.08)",
                        marginBottom: "12px"
                    }}
                >
                    <div
                        className="mesero-avatar"
                        style={{
                            margin:
                                "0 auto 10px"
                        }}
                    >
                        {(user?.nombre ??
                            "M")[0].toUpperCase()}
                    </div>

                    <p
                        style={{
                            color: "#888",
                            fontSize: "0.68rem",
                            letterSpacing:
                                "2px",
                            textTransform:
                                "uppercase",
                            margin:
                                "0 0 2px"
                        }}
                    >
                        Mesero
                    </p>

                    <p
                        style={{
                            color: "#e87d2a",
                            fontWeight: 700,
                            fontSize:
                                "0.92rem",
                            margin: 0,
                            textTransform:
                                "capitalize"
                        }}
                    >
                        {user?.nombre ?? "—"}
                    </p>
                </div>

                <nav
                    style={{
                        display: "flex",
                        flexDirection:
                            "column",
                        gap: "4px",
                        flex: 1
                    }}
                >
                    {NAV.map(item => (
                        <button
                            key={
                                item.pagina
                            }
                            className={`mesero-nav-btn ${
                                paginaActual ===
                                item.pagina
                                    ? "mesero-nav-activo"
                                    : ""
                            }`}
                            onClick={() =>
                                navigate(
                                    `/${item.pagina}`
                                )
                            }
                        >
                            <i
                                className={`bi ${item.icono}`}
                                style={{
                                    fontSize:
                                        "1.1rem",
                                    flexShrink: 0
                                }}
                            ></i>

                            <span
                                style={{
                                    fontSize:
                                        "0.83rem"
                                }}
                            >
                                {item.label}
                            </span>
                        </button>
                    ))}
                </nav>

                <button
                    onClick={
                        cerrarSesion
                    }
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding:
                            "10px 13px",
                        border:
                            "1px solid #e74c3c",
                        borderRadius:
                            "10px",
                        background:
                            "transparent",
                        color: "#e74c3c",
                        cursor:
                            "pointer",
                        fontSize:
                            "0.85rem",
                        fontWeight: 600,
                        width: "100%",
                        transition:
                            "background 0.2s",
                        marginTop:
                            "auto"
                    }}
                    onMouseEnter={e =>
                        e.currentTarget.style.background =
                            "rgba(231,76,60,0.12)"
                    }
                    onMouseLeave={e =>
                        e.currentTarget.style.background =
                            "transparent"
                    }
                >
                    <i className="bi bi-box-arrow-left"></i>
                    <span>
                        Cerrar sesión
                    </span>
                </button>
            </aside>

            <main className="mesero-main">
                {children}
            </main>

            <aside className="mesero-historial">

                <h2
                    className="mesero-titulo-seccion"
                    style={{
                        marginBottom:
                            "16px"
                    }}
                >
                    Historial de pedidos
                </h2>

                <div className="mesero-resumen-hoy">

                    <div className="mesero-resumen-item">
                        <span className="mesero-resumen-valor">
                            {pedidosHoy.length}
                        </span>

                        <span className="mesero-resumen-label">
                            Pedidos hoy
                        </span>
                    </div>

                    <div className="mesero-resumen-divider" />

                    <div className="mesero-resumen-item">
                        <span className="mesero-resumen-valor">
                            {entregadosHoy.length}
                        </span>

                        <span className="mesero-resumen-label">
                            Entregados
                        </span>
                    </div>

                    <div className="mesero-resumen-divider" />

                    <div className="mesero-resumen-item">
                        <span className="mesero-resumen-valor mesero-resumen-dinero">
                            {fmt(gananciasHoy)}
                        </span>

                        <span className="mesero-resumen-label">
                            Cobrado hoy
                        </span>
                    </div>
                </div>

                {Object.keys(
                    pagosPorMetodo
                ).length > 0 && (
                    <div
                        style={{
                            margin:
                                "12px 0",
                            padding:
                                "12px",
                            borderRadius:
                                "10px",
                            background:
                                "rgba(255,255,255,0.03)",
                            border:
                                "1px solid rgba(232,125,42,0.15)"
                        }}
                    >
                        <p
                            style={{
                                color:
                                    "#777",
                                fontSize:
                                    "0.68rem",
                                letterSpacing:
                                    "1.5px",
                                margin:
                                    "0 0 9px",
                                textTransform:
                                    "uppercase"
                            }}
                        >
                            Pagos por método
                        </p>

                        {Object.entries(
                            pagosPorMetodo
                        ).map(
                            ([
                                metodo,
                                info
                            ]) => (
                                <div
                                    key={
                                        metodo
                                    }
                                    style={{
                                        display:
                                            "flex",
                                        justifyContent:
                                            "space-between",
                                        alignItems:
                                            "center",
                                        gap:
                                            "8px",
                                        marginBottom:
                                            "7px"
                                    }}
                                >
                                    <span
                                        style={{
                                            color:
                                                "#bbb",
                                            fontSize:
                                                "0.74rem"
                                        }}
                                    >
                                        {metodo}
                                    </span>

                                    <span
                                        style={{
                                            color:
                                                "#e87d2a",
                                            fontSize:
                                                "0.74rem",
                                            fontWeight:
                                                "700"
                                        }}
                                    >
                                        {fmt(
                                            info.total
                                        )}
                                    </span>
                                </div>
                            )
                        )}
                    </div>
                )}

                <div className="mesero-pedidos-lista">

                    {cargando ? (
                        <p className="mesero-sin-pedidos">
                            Cargando...
                        </p>
                    ) : pedidos.length === 0 ? (
                        <p className="mesero-sin-pedidos">
                            Sin pedidos registrados
                        </p>
                    ) : (
                        pedidos.map(p => {
                            const estado =
                                String(
                                    p.EstadoPedido ||
                                    "pendiente"
                                ).toLowerCase()

                            const est =
                                BADGE[
                                    estado
                                ] ??
                                BADGE.pendiente

                            const pagoAprobado =
                                String(
                                    p.EstadoPago ||
                                    ""
                                ).toLowerCase() ===
                                "aprobado"

                            return (
                                <div
                                    key={
                                        p.id_Pedidos
                                    }
                                    className="mesero-pedido-card"
                                >
                                    <div className="mesero-pedido-top">

                                        <span className="mesero-pedido-id">
                                            #{p.id_Pedidos}
                                        </span>

                                        <span className="mesero-pedido-mesa">
                                            Mesa{" "}
                                            {p.Numero_mesa ??
                                                "—"}
                                        </span>

                                        <span
                                            className="mesero-pedido-badge"
                                            style={{
                                                background:
                                                    est.bg,
                                                color:
                                                    est.color
                                            }}
                                        >
                                            {est.label}
                                        </span>
                                    </div>

                                    <div className="mesero-pedido-bottom">

                                        <div
                                            style={{
                                                display:
                                                    "flex",
                                                flexDirection:
                                                    "column",
                                                gap:
                                                    "3px"
                                            }}
                                        >
                                            <span className="mesero-pedido-fecha">
                                                {fmtFecha(
                                                    p.Fecha_Pedido
                                                )}{" "}
                                                ·{" "}
                                                {fmtHora(
                                                    p.Fecha_Pedido
                                                )}
                                            </span>

                                            <span
                                                style={{
                                                    fontSize:
                                                        "0.68rem",
                                                    color:
                                                        pagoAprobado
                                                            ? "#2ecc71"
                                                            : "#f1c40f"
                                                }}
                                            >
                                                <i
                                                    className={`bi ${
                                                        pagoAprobado
                                                            ? "bi-check-circle-fill"
                                                            : "bi-hourglass-split"
                                                    }`}
                                                ></i>{" "}
                                                {pagoAprobado
                                                    ? `Pagado · ${p.MetodoPago || "Método no indicado"}`
                                                    : "Pago pendiente"}
                                            </span>
                                        </div>

                                        <span className="mesero-pedido-total">
                                            {fmt(
                                                p.TotalPagar
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="mesero-total-ganado">
                    <span>
                        Total cobrado hoy
                    </span>

                    <span className="mesero-total-num">
                        {fmt(gananciasHoy)}
                        <small> COP</small>
                    </span>
                </div>
            </aside>
        </div>
    )
}

function Panel_Mesero({ usuario }) {
    const navigate = useNavigate()

    const [mesas, setMesas] = useState([])
    const [cargando, setCargando] =
        useState(true)

    const user =
        usuario ??
        JSON.parse(
            sessionStorage.getItem("usuario") ??
            "null"
        )

    const uid =
        user?.id_Usuarios_Restaurante ??
        user?.id

    const cargarMesas =
        useCallback(async () => {
            try {
                const res =
                    await axios.get(
                        `${API}/api/mesas/listar`
                    )

                const lista =
                    Array.isArray(
                        res.data
                    )
                        ? res.data
                        : []

                setMesas(
                    lista.map(m => ({
                        id:
                            m.id_Mesas,
                        numero:
                            m.Numero_mesa,
                        estado:
                            m.Estado
                    }))
                )
            } catch (error) {
                console.error(
                    "Error cargando mesas:",
                    error
                )
            } finally {
                setCargando(false)
            }
        }, [])

    useEffect(() => {
        cargarMesas()

        const iv =
            setInterval(
                cargarMesas,
                30000
            )

        return () =>
            clearInterval(iv)
    }, [cargarMesas])

    const seleccionarMesa = mesa => {
        localStorage.setItem(
            "mesaSeleccionada",
            mesa.numero
        )

        if (uid) {
            localStorage.setItem(
                "idMesero",
                uid
            )
        }

        navigate("/menu")
    }

    const liberarMesa = async (
        e,
        mesa
    ) => {
        e.stopPropagation()

        const confirmar =
            window.confirm(
                `¿Liberar la mesa ${mesa.numero}? Solo hazlo si los clientes ya se fueron.`
            )

        if (!confirmar) return

        try {
            await axios.put(
                `${API}/api/mesas/estado/${mesa.id}`,
                {
                    estado:
                        "disponible"
                }
            )

            await cargarMesas()
        } catch (error) {
            console.error(
                "Error al liberar mesa:",
                error
            )

            alert(
                "No se pudo liberar la mesa. Intenta de nuevo."
            )
        }
    }

    return (
        <LayoutMesero
            usuario={usuario}
            paginaActual="mesero"
        >
            <div
                style={{
                    padding:
                        "32px 28px"
                }}
            >
                <div
                    style={{
                        display:
                            "flex",
                        justifyContent:
                            "space-between",
                        alignItems:
                            "center",
                        marginBottom:
                            "28px",
                        paddingBottom:
                            "16px",
                        borderBottom:
                            "1px solid rgba(255,255,255,0.08)"
                    }}
                >
                    <h1
                        className="mesero-titulo-seccion"
                        style={{
                            fontSize:
                                "1.3rem",
                            letterSpacing:
                                "3px"
                        }}
                    >
                        Mesas del restaurante
                    </h1>

                    <div
                        style={{
                            display:
                                "flex",
                            gap:
                                "10px"
                        }}
                    >
                        <span
                            style={{
                                fontSize:
                                    "0.75rem",
                                padding:
                                    "4px 14px",
                                borderRadius:
                                    "20px",
                                fontWeight:
                                    600,
                                background:
                                    "rgba(46,204,113,0.12)",
                                color:
                                    "#2ecc71",
                                border:
                                    "1px solid rgba(46,204,113,0.3)"
                            }}
                        >
                            Disponible
                        </span>

                        <span
                            style={{
                                fontSize:
                                    "0.75rem",
                                padding:
                                    "4px 14px",
                                borderRadius:
                                    "20px",
                                fontWeight:
                                    600,
                                background:
                                    "rgba(231,76,60,0.12)",
                                color:
                                    "#e74c3c",
                                border:
                                    "1px solid rgba(231,76,60,0.3)"
                            }}
                        >
                            Ocupada
                        </span>
                    </div>
                </div>

                {cargando ? (
                    <p className="mesero-loading">
                        Cargando mesas...
                    </p>
                ) : mesas.length === 0 ? (
                    <p className="mesero-loading">
                        No hay mesas registradas.
                    </p>
                ) : (
                    <div className="mesero-mesas-grid">
                        {mesas.map(mesa => {
                            const libre =
                                String(
                                    mesa.estado
                                ).toLowerCase() ===
                                "disponible"

                            return (
                                <div
                                    key={
                                        mesa.id
                                    }
                                    className={`mesero-mesa-card ${
                                        libre
                                            ? "mesero-mesa-libre"
                                            : "mesero-mesa-ocupada"
                                    }`}
                                    onClick={() =>
                                        seleccionarMesa(
                                            mesa
                                        )
                                    }
                                >
                                    <span className="mesero-mesa-num">
                                        {mesa.numero}
                                    </span>

                                    <span
                                        style={{
                                            fontSize:
                                                "0.8rem",
                                            color:
                                                libre
                                                    ? "#2ecc71"
                                                    : "#e74c3c"
                                        }}
                                    >
                                        ●
                                    </span>

                                    <span className="mesero-mesa-estado">
                                        {libre
                                            ? "DISPONIBLE"
                                            : "OCUPADA"}
                                    </span>

                                    {!libre && (
                                        <button
                                            onClick={e =>
                                                liberarMesa(
                                                    e,
                                                    mesa
                                                )
                                            }
                                            style={{
                                                marginTop:
                                                    "8px",
                                                fontSize:
                                                    "0.7rem",
                                                padding:
                                                    "4px 10px",
                                                borderRadius:
                                                    "6px",
                                                border:
                                                    "1px solid #e74c3c",
                                                background:
                                                    "transparent",
                                                color:
                                                    "#e74c3c",
                                                cursor:
                                                    "pointer"
                                            }}
                                        >
                                            Liberar mesa
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </LayoutMesero>
    )
}

export default Panel_Mesero
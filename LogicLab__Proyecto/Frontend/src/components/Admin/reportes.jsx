import { useEffect, useState, useRef } from "react"
import axios from "axios"
import '../../../Hojas_de_Estilo/Administrador.css'

const API  = "http://localhost:5030"
const NEON = "#ff1744"

const fmt   = n => `$${Number(n).toLocaleString("es-CO")}`
const fmtN  = n => Number(n).toLocaleString("es-CO")
const fecha = s => new Date(s).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })

const PERIODOS = [
    { valor: "esta_semana", label: "Esta semana"  },
    { valor: "este_mes",    label: "Este mes"     },
    { valor: "mes_pasado",  label: "Mes pasado"   },
]

function StatCard({ icono, label, valor, sub }) {
    return (
        <div style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid rgba(255,23,68,0.25)`,
            borderRadius: "14px", padding: "20px 24px",
            display: "flex", alignItems: "center", gap: "16px",
            transition: "border-color 0.2s, box-shadow 0.2s",
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = NEON; e.currentTarget.style.boxShadow = "0 0 18px rgba(255,23,68,0.15)" }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,23,68,0.25)"; e.currentTarget.style.boxShadow = "none" }}
        >
            <div style={{
                width: "48px", height: "48px", borderRadius: "12px",
                background: "rgba(255,23,68,0.12)", display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
                fontSize: "1.3rem", filter: "drop-shadow(0 0 6px rgba(255,23,68,0.5))"
            }}>{icono}</div>
            <div>
                <p style={{ color: "#888", fontSize: "0.75rem", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
                <p style={{ color: NEON, fontSize: "1.6rem", fontWeight: "700", margin: 0, lineHeight: 1, textShadow: "0 0 10px rgba(255,23,68,0.5)" }}>{valor}</p>
                {sub && <p style={{ color: "#666", fontSize: "0.75rem", margin: "4px 0 0" }}>{sub}</p>}
            </div>
        </div>
    )
}

function GraficaBarras({ datos }) {
    if (!datos?.length) return (
        <div style={{ textAlign: "center", padding: "40px", color: "#444" }}>Sin datos para este período</div>
    )

    const maxVal  = Math.max(...datos.map(d => d.ingresos), 1)
    const W = 600
    const H = 200
    const PAD_L = 70
    const PAD_B = 40
    const anchoBar = Math.min(40, (W - PAD_L) / datos.length - 6)

    return (
        <svg viewBox={`0 0 ${W} ${H + PAD_B}`} style={{ width: "100%", height: "auto" }}>
            {/* Líneas de referencia */}
            {[0, 0.25, 0.5, 0.75, 1].map(f => {
                const y = H - f * H
                return (
                    <g key={f}>
                        <line x1={PAD_L} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                        <text x={PAD_L - 6} y={y + 4} fill="#555" fontSize="10" textAnchor="end">
                            {fmt(maxVal * f)}
                        </text>
                    </g>
                )
            })}

            {/* Barras */}
            {datos.map((d, i) => {
                const barH  = (d.ingresos / maxVal) * H
                const x     = PAD_L + i * ((W - PAD_L) / datos.length) + ((W - PAD_L) / datos.length - anchoBar) / 2
                const y     = H - barH
                return (
                    <g key={i}>
                        <defs>
                            <linearGradient id={`bar${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%"   stopColor={NEON} stopOpacity="0.9" />
                                <stop offset="100%" stopColor={NEON} stopOpacity="0.3" />
                            </linearGradient>
                        </defs>
                        <rect x={x} y={y} width={anchoBar} height={barH}
                            fill={`url(#bar${i})`} rx="4"
                            style={{ filter: "drop-shadow(0 0 4px rgba(255,23,68,0.4))" }}
                        />
                        {barH > 20 && (
                            <text x={x + anchoBar / 2} y={y - 4} fill={NEON} fontSize="9"
                                textAnchor="middle" fontWeight="600">
                                {fmt(d.ingresos)}
                            </text>
                        )}
                        <text x={x + anchoBar / 2} y={H + PAD_B - 4} fill="#666"
                            fontSize="9" textAnchor="middle">
                            {fecha(d.fecha)}
                        </text>
                    </g>
                )
            })}
        </svg>
    )
}

function Reportes() {
    const [periodo, setPeriodo] = useState("este_mes")
    const [datos, setDatos] = useState(null)
    const [cargando, setCargando] = useState(false)
    const [error, setError] = useState(null)
    const [generando, setGenerando] = useState(false)
    const reporteRef = useRef(null)

    useEffect(() => { cargarReporte() }, [periodo])

    const cargarReporte = async () => {
        setCargando(true)
        setError(null)
        try {
            const res = await axios.get(`${API}/api/reportes/ventas?periodo=${periodo}`)
            setDatos(res.data)
        } catch {
            setError("No se pudo cargar el reporte. Verifica que el servidor esté activo.")
        } finally { setCargando(false) }
    }

    const exportarPDF = () => {
        setGenerando(true)
        const labelPeriodo = PERIODOS.find(p => p.valor === periodo)?.label ?? periodo

        const m = datos.metricas
        const top = datos.ranking.slice(0, 10)
        const hoy = new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })

        const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Reporte ${labelPeriodo}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; color: #111; padding: 32px; font-size: 13px; }
                h1  { font-size: 22px; color: #cc0011; letter-spacing: 2px; margin-bottom: 4px; }
                .sub { color: #666; font-size: 12px; margin-bottom: 24px; }
                .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
                .card { border: 1px solid #eee; border-radius: 8px; padding: 14px; }
                .card-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
                .card-valor { font-size: 20px; font-weight: 700; color: #cc0011; margin-top: 4px; }
                .card-sub   { font-size: 11px; color: #999; margin-top: 2px; }
                h2  { font-size: 14px; color: #cc0011; letter-spacing: 2px; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                th { background: #cc0011; color: white; padding: 8px 10px; text-align: left; }
                td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; }
                tr:nth-child(even) td { background: #fafafa; }
                .medalla { font-weight: 700; color: #cc0011; }
                .footer { margin-top: 32px; font-size: 10px; color: #aaa; text-align: center; }
            </style>
        </head>
        <body>
            <h1>MANGATA — REPORTE DE VENTAS</h1>
            <p class="sub">Período: ${labelPeriodo} &nbsp;|&nbsp; Generado el ${hoy}</p>

            <div class="grid">
                <div class="card">
                    <div class="card-label">Ingresos totales</div>
                    <div class="card-valor">${fmt(m.ingresos_totales)}</div>
                    <div class="card-sub">COP</div>
                </div>
                <div class="card">
                    <div class="card-label">Pedidos entregados</div>
                    <div class="card-valor">${fmtN(m.entregados)}</div>
                    <div class="card-sub">de ${fmtN(m.total_pedidos)} totales</div>
                </div>
                <div class="card">
                    <div class="card-label">Ticket promedio</div>
                    <div class="card-valor">${fmt(m.ticket_promedio)}</div>
                    <div class="card-sub">por pedido entregado</div>
                </div>
                <div class="card">
                    <div class="card-label">Cancelados</div>
                    <div class="card-valor">${fmtN(m.cancelados)}</div>
                    <div class="card-sub">pedidos</div>
                </div>
                <div class="card">
                    <div class="card-label">Pago en efectivo</div>
                    <div class="card-valor">${fmtN(m.pagos_efectivo)}</div>
                    <div class="card-sub">pedidos</div>
                </div>
                <div class="card">
                    <div class="card-label">Pago con tarjeta</div>
                    <div class="card-valor">${fmtN(m.pagos_tarjeta)}</div>
                    <div class="card-sub">pedidos</div>
                </div>
            </div>

            <h2>RANKING DE PLATOS MÁS VENDIDOS</h2>
            <table>
                <thead>
                    <tr><th>#</th><th>Plato</th><th>Unidades vendidas</th><th>Ingreso generado</th></tr>
                </thead>
                <tbody>
                    ${top.map((p, i) => `
                        <tr>
                            <td class="medalla">${i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</td>
                            <td>${p.NombrePlato}</td>
                            <td>${fmtN(p.veces_pedido)}</td>
                            <td>${fmt(p.ingreso_generado)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>

            <div class="footer">Reporte generado automáticamente por el sistema LogicLab — Mangata Restaurante</div>
        </body>
        </html>`

        const ventana = window.open("", "_blank", "width=900,height=700")
        ventana.document.write(html)
        ventana.document.close()
        ventana.onload = () => {
            ventana.print()
            setGenerando(false)
        }
    }

    const m = datos?.metricas

    return (
        <div className="emp-contenedor" ref={reporteRef}>

            <div className="emp-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                    <h1 className="emp-titulo-pagina">Reportes</h1>
                    <p className="emp-subtitulo">Análisis de ventas y platos más pedidos</p>
                </div>
                <button onClick={exportarPDF} disabled={!datos || generando} style={{
                    padding: "10px 20px", background: datos ? NEON : "#333",
                    border: "none", borderRadius: "8px", color: datos ? "#000" : "#666",
                    fontWeight: "700", fontSize: "0.88rem", cursor: datos ? "pointer" : "not-allowed",
                    letterSpacing: "1px", transition: "box-shadow 0.2s",
                    boxShadow: datos ? "0 0 14px rgba(255,23,68,0.35)" : "none"
                }}>
                    {generando ? "Generando..." : "⬇ Exportar PDF"}
                </button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "28px" }}>
                {PERIODOS.map(p => (
                    <button key={p.valor} onClick={() => setPeriodo(p.valor)} style={{
                        padding: "8px 20px", borderRadius: "20px", cursor: "pointer",
                        border: `1px solid ${periodo === p.valor ? NEON : "rgba(255,255,255,0.15)"}`,
                        background: periodo === p.valor ? NEON : "rgba(255,255,255,0.05)",
                        color: periodo === p.valor ? "#000" : "#bbb",
                        fontWeight: periodo === p.valor ? "700" : "400",
                        fontSize: "0.85rem", transition: "all 0.15s",
                        boxShadow: periodo === p.valor ? "0 0 10px rgba(255,23,68,0.4)" : "none"
                    }}>{p.label}</button>
                ))}
            </div>

            {cargando && <p className="emp-estado-msg">Cargando reporte...</p>}
            {error && <p className="emp-estado-msg emp-error">{error}</p>}

            {!cargando && datos && (
                <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
                        <StatCard icono="💰" label="Ingresos totales"   valor={fmt(m.ingresos_totales)}  sub="COP" />
                        <StatCard icono="🧾" label="Pedidos entregados" valor={fmtN(m.entregados)}        sub={`de ${fmtN(m.total_pedidos)} totales`} />
                        <StatCard icono="📊" label="Ticket promedio"    valor={fmt(m.ticket_promedio)}    sub="por pedido" />
                        <StatCard icono="❌" label="Cancelados"         valor={fmtN(m.cancelados)}        sub="pedidos" />
                        <StatCard icono="💵" label="Pago efectivo"      valor={fmtN(m.pagos_efectivo)}    sub="pedidos" />
                        <StatCard icono="💳" label="Pago tarjeta"       valor={fmtN(m.pagos_tarjeta)}     sub="pedidos" />
                    </div>

                    <div style={{
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,23,68,0.2)",
                        borderRadius: "14px", padding: "24px", marginBottom: "28px"
                    }}>
                        <h2 style={{ color: NEON, fontSize: "0.95rem", letterSpacing: "2px", margin: "0 0 20px",
                            textShadow: "0 0 8px rgba(255,23,68,0.4)" }}>
                            INGRESOS POR DÍA
                        </h2>
                        <GraficaBarras datos={datos.porDia} />
                    </div>

                    <div style={{
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,23,68,0.2)",
                        borderRadius: "14px", padding: "24px"
                    }}>
                        <h2 style={{ color: NEON, fontSize: "0.95rem", letterSpacing: "2px", margin: "0 0 20px",
                            textShadow: "0 0 8px rgba(255,23,68,0.4)" }}>
                            PLATOS MÁS VENDIDOS
                        </h2>

                        {datos.ranking.length === 0
                            ? <p style={{ color: "#444", textAlign: "center", padding: "30px" }}>Sin datos de ventas en este período</p>
                            : (
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                                    <thead>
                                        <tr style={{ borderBottom: "1px solid rgba(255,23,68,0.3)" }}>
                                            {["#", "Plato", "Unidades", "Ingreso generado"].map(h => (
                                                <th key={h} style={{ color: NEON, padding: "10px 12px", textAlign: "left",
                                                    fontSize: "0.75rem", letterSpacing: "1px", fontWeight: "700" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {datos.ranking.map((p, i) => (
                                            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)",
                                                transition: "background 0.15s" }}
                                                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,23,68,0.06)"}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                            >
                                                <td style={{ padding: "10px 12px", fontSize: "1rem" }}>
                                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                                                </td>
                                                <td style={{ padding: "10px 12px", color: "#eee", fontWeight: i < 3 ? "700" : "400" }}>
                                                    {p.NombrePlato}
                                                </td>
                                                <td style={{ padding: "10px 12px", color: NEON, fontWeight: "700" }}>
                                                    {fmtN(p.veces_pedido)}
                                                </td>
                                                <td style={{ padding: "10px 12px", color: "#bbb" }}>
                                                    {fmt(p.ingreso_generado)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )
                        }
                    </div>
                </>
            )}
        </div>
    )
}

export default Reportes
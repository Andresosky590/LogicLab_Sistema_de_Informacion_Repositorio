import { useEffect, useState, useMemo } from "react"
import axios from "axios"
import '../../../Hojas_de_Estilo/Administrador.css'

const API = "http://localhost:5030"
const NEON = "#ff1744"

const fmt = n =>
    `$${Number(n || 0).toLocaleString("es-CO")}`

const fmtN = n =>
    Number(n || 0).toLocaleString("es-CO")

const PERIODOS = [
    {
        valor: "esta_semana",
        label: "Esta semana"
    },
    {
        valor: "este_mes",
        label: "Este mes"
    },
    {
        valor: "mes_pasado",
        label: "Mes pasado"
    }
]

const convertirFecha = valor => {
    if (!valor) return null

    const fecha = new Date(valor)

    return Number.isNaN(fecha.getTime())
        ? null
        : fecha
}

const fechaCorta = valor => {
    const fecha = convertirFecha(valor)

    if (!fecha) return "—"

    return fecha.toLocaleDateString(
        "es-CO",
        {
            day: "2-digit",
            month: "short"
        }
    )
}

const obtenerRango = periodo => {
    const hoy = new Date()

    hoy.setHours(0, 0, 0, 0)

    const inicio = new Date(hoy)
    const fin = new Date(hoy)

    if (periodo === "esta_semana") {
        const dia = hoy.getDay()
        const diferencia =
            dia === 0 ? 6 : dia - 1

        inicio.setDate(
            hoy.getDate() -
            diferencia
        )

        fin.setDate(
            inicio.getDate() + 6
        )
    }

    if (periodo === "este_mes") {
        inicio.setDate(1)

        fin.setMonth(
            hoy.getMonth() + 1,
            0
        )
    }

    if (periodo === "mes_pasado") {
        inicio.setMonth(
            hoy.getMonth() - 1,
            1
        )

        fin.setMonth(
            hoy.getMonth(),
            0
        )
    }

    fin.setHours(
        23,
        59,
        59,
        999
    )

    return {
        inicio,
        fin
    }
}

const estaDentroDelPeriodo = (
    fechaValor,
    periodo
) => {
    const fecha =
        convertirFecha(
            fechaValor
        )

    if (!fecha) return false

    const {
        inicio,
        fin
    } = obtenerRango(periodo)

    return (
        fecha >= inicio &&
        fecha <= fin
    )
}

function StatCard({
    icono,
    label,
    valor,
    sub
}) {
    return (
        <div
            style={{
                background:
                    "rgba(255,255,255,0.04)",
                border:
                    "1px solid rgba(255,23,68,0.25)",
                borderRadius:
                    "14px",
                padding:
                    "20px 24px",
                display:
                    "flex",
                alignItems:
                    "center",
                gap:
                    "16px"
            }}
        >
            <div
                style={{
                    width:
                        "48px",
                    height:
                        "48px",
                    borderRadius:
                        "12px",
                    background:
                        "rgba(255,23,68,0.12)",
                    display:
                        "flex",
                    alignItems:
                        "center",
                    justifyContent:
                        "center",
                    flexShrink:
                        0,
                    fontSize:
                        "1.3rem"
                }}
            >
                {icono}
            </div>

            <div>
                <p
                    style={{
                        color:
                            "#888",
                        fontSize:
                            "0.75rem",
                        margin:
                            "0 0 4px",
                        textTransform:
                            "uppercase",
                        letterSpacing:
                            "0.5px"
                    }}
                >
                    {label}
                </p>

                <p
                    style={{
                        color:
                            NEON,
                        fontSize:
                            "1.6rem",
                        fontWeight:
                            "700",
                        margin:
                            0,
                        lineHeight:
                            1
                    }}
                >
                    {valor}
                </p>

                {sub && (
                    <p
                        style={{
                            color:
                                "#666",
                            fontSize:
                                "0.75rem",
                            margin:
                                "4px 0 0"
                        }}
                    >
                        {sub}
                    </p>
                )}
            </div>
        </div>
    )
}

function GraficaBarras({ datos }) {
    if (!datos?.length) {
        return (
            <div
                style={{
                    textAlign:
                        "center",
                    padding:
                        "40px",
                    color:
                        "#444"
                }}
            >
                Sin datos para este período
            </div>
        )
    }

    const maxVal =
        Math.max(
            ...datos.map(
                d =>
                    Number(
                        d.ingresos || 0
                    )
            ),
            1
        )

    const W = 700
    const H = 210
    const PAD_L = 75
    const PAD_B = 45

    const espacio =
        (W - PAD_L) /
        datos.length

    const anchoBar =
        Math.min(
            42,
            espacio - 8
        )

    return (
        <svg
            viewBox={`0 0 ${W} ${H + PAD_B}`}
            style={{
                width:
                    "100%",
                height:
                    "auto"
            }}
        >
            {[0, 0.25, 0.5, 0.75, 1].map(
                factor => {
                    const y =
                        H -
                        factor *
                            H

                    return (
                        <g
                            key={
                                factor
                            }
                        >
                            <line
                                x1={
                                    PAD_L
                                }
                                y1={
                                    y
                                }
                                x2={
                                    W
                                }
                                y2={
                                    y
                                }
                                stroke="rgba(255,255,255,0.06)"
                            />

                            <text
                                x={
                                    PAD_L -
                                    7
                                }
                                y={
                                    y +
                                    4
                                }
                                fill="#555"
                                fontSize="10"
                                textAnchor="end"
                            >
                                {fmt(
                                    maxVal *
                                        factor
                                )}
                            </text>
                        </g>
                    )
                }
            )}

            {datos.map(
                (d, i) => {
                    const ingreso =
                        Number(
                            d.ingresos ||
                                0
                        )

                    const barH =
                        (ingreso /
                            maxVal) *
                        H

                    const x =
                        PAD_L +
                        i *
                            espacio +
                        (espacio -
                            anchoBar) /
                            2

                    const y =
                        H -
                        barH

                    return (
                        <g
                            key={
                                `${d.fecha}-${i}`
                            }
                        >
                            <defs>
                                <linearGradient
                                    id={`reporteBar${i}`}
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor={
                                            NEON
                                        }
                                        stopOpacity="0.9"
                                    />

                                    <stop
                                        offset="100%"
                                        stopColor={
                                            NEON
                                        }
                                        stopOpacity="0.3"
                                    />
                                </linearGradient>
                            </defs>

                            <rect
                                x={x}
                                y={y}
                                width={
                                    anchoBar
                                }
                                height={
                                    Math.max(
                                        barH,
                                        1
                                    )
                                }
                                fill={`url(#reporteBar${i})`}
                                rx="4"
                            />

                            {barH > 20 && (
                                <text
                                    x={
                                        x +
                                        anchoBar /
                                            2
                                    }
                                    y={
                                        y -
                                        5
                                    }
                                    fill={
                                        NEON
                                    }
                                    fontSize="9"
                                    textAnchor="middle"
                                >
                                    {fmt(
                                        ingreso
                                    )}
                                </text>
                            )}

                            <text
                                x={
                                    x +
                                    anchoBar /
                                        2
                                }
                                y={
                                    H +
                                    PAD_B -
                                    5
                                }
                                fill="#666"
                                fontSize="9"
                                textAnchor="middle"
                            >
                                {fechaCorta(
                                    d.fecha
                                )}
                            </text>
                        </g>
                    )
                }
            )}
        </svg>
    )
}

function Reportes() {
    const [periodo, setPeriodo] =
        useState("este_mes")

    const [datos, setDatos] =
        useState(null)

    const [pedidos, setPedidos] =
        useState([])

    const [cargando, setCargando] =
        useState(false)

    const [error, setError] =
        useState(null)

    const [generando, setGenerando] =
        useState(false)

    useEffect(() => {
        cargarReporte()
    }, [periodo])

    const cargarReporte = async () => {
        setCargando(true)
        setError(null)

        try {
            const [
                resReporte,
                resPedidos
            ] = await Promise.all([
                axios.get(
                    `${API}/api/reportes/ventas?periodo=${periodo}`
                ),
                axios.get(
                    `${API}/api/pedidos/listar`
                )
            ])

            setDatos(
                resReporte.data
            )

            setPedidos(
                Array.isArray(
                    resPedidos.data
                )
                    ? resPedidos.data
                    : []
            )
        } catch (error) {
            console.error(
                "Error cargando reportes:",
                error
            )

            setError(
                "No se pudo cargar el reporte. Verifica que el servidor esté activo."
            )
        } finally {
            setCargando(false)
        }
    }

    const pedidosPeriodo =
        useMemo(
            () =>
                pedidos.filter(
                    p =>
                        estaDentroDelPeriodo(
                            p.Fecha_Pedido,
                            periodo
                        )
                ),
            [
                pedidos,
                periodo
            ]
        )

    const pagosAprobados =
        useMemo(
            () =>
                pedidosPeriodo.filter(
                    p =>
                        String(
                            p.EstadoPago ||
                                ""
                        ).toLowerCase() ===
                        "aprobado"
                ),
            [pedidosPeriodo]
        )

    const pagosPorMetodo =
        useMemo(() => {
            return pagosAprobados.reduce(
                (acc, pedido) => {
                    const metodo =
                        pedido.MetodoPago ||
                        "Sin método"

                    if (!acc[metodo]) {
                        acc[metodo] = {
                            cantidad: 0,
                            total: 0
                        }
                    }

                    acc[metodo].cantidad +=
                        1

                    acc[metodo].total +=
                        Number(
                            pedido.TotalPagar ||
                                0
                        )

                    return acc
                },
                {}
            )
        }, [pagosAprobados])

    const listaMetodos =
        Object.entries(
            pagosPorMetodo
        ).sort(
            (a, b) =>
                b[1].total -
                a[1].total
        )

    const ingresosPagados =
        pagosAprobados.reduce(
            (total, pedido) =>
                total +
                Number(
                    pedido.TotalPagar ||
                        0
                ),
            0
        )

    const pedidosEntregados =
        pagosAprobados.filter(
            p =>
                String(
                    p.EstadoPedido ||
                        ""
                ).toLowerCase() ===
                "entregado"
        )

    const cancelados =
        pedidosPeriodo.filter(
            p =>
                String(
                    p.EstadoPedido ||
                        ""
                ).toLowerCase() ===
                "cancelado"
        )

    const ticketPromedio =
        pagosAprobados.length >
        0
            ? ingresosPagados /
              pagosAprobados.length
            : 0

    const pagosRecientes =
        pagosAprobados
            .slice()
            .sort(
                (a, b) =>
                    new Date(
                        b.Fecha_Pedido
                    ) -
                    new Date(
                        a.Fecha_Pedido
                    )
            )
            .slice(0, 12)

    const exportarPDF = () => {
        if (!datos) return

        setGenerando(true)

        const labelPeriodo =
            PERIODOS.find(
                p =>
                    p.valor ===
                    periodo
            )?.label ??
            periodo

        const ranking =
            Array.isArray(
                datos.ranking
            )
                ? datos.ranking
                : []

        const porDia =
            Array.isArray(
                datos.porDia
            )
                ? datos.porDia
                : []

        const hoy =
            new Date().toLocaleDateString(
                "es-CO",
                {
                    day: "2-digit",
                    month: "long",
                    year: "numeric"
                }
            )

        const filasMetodos =
            listaMetodos
                .map(
                    ([metodo, info]) =>
                        `
                        <tr>
                            <td>${metodo}</td>
                            <td>${fmtN(info.cantidad)}</td>
                            <td>${fmt(info.total)}</td>
                        </tr>
                        `
                )
                .join("")

        const filasPagos =
            pagosRecientes
                .map(
                    p =>
                        `
                        <tr>
                            <td>#${p.id_Pedidos}</td>
                            <td>${p.Numero_mesa ?? "—"}</td>
                            <td>${p.MetodoPago || "Sin método"}</td>
                            <td>${fmt(p.TotalPagar)}</td>
                        </tr>
                        `
                )
                .join("")

        const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Reporte ${labelPeriodo}</title>

            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }

                body {
                    font-family: Arial, sans-serif;
                    color: #111;
                    padding: 32px;
                    font-size: 13px;
                }

                h1 {
                    font-size: 22px;
                    color: #cc0011;
                    letter-spacing: 2px;
                    margin-bottom: 4px;
                }

                .sub {
                    color: #666;
                    font-size: 12px;
                    margin-bottom: 24px;
                }

                .grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 12px;
                    margin-bottom: 28px;
                }

                .card {
                    border: 1px solid #eee;
                    border-radius: 8px;
                    padding: 14px;
                }

                .card-label {
                    font-size: 10px;
                    color: #888;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .card-valor {
                    font-size: 20px;
                    font-weight: 700;
                    color: #cc0011;
                    margin-top: 4px;
                }

                .card-sub {
                    font-size: 11px;
                    color: #999;
                    margin-top: 2px;
                }

                h2 {
                    font-size: 14px;
                    color: #cc0011;
                    letter-spacing: 2px;
                    margin-bottom: 12px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 6px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12px;
                    margin-bottom: 28px;
                }

                th {
                    background: #cc0011;
                    color: white;
                    padding: 8px 10px;
                    text-align: left;
                }

                td {
                    padding: 8px 10px;
                    border-bottom: 1px solid #f0f0f0;
                }

                tr:nth-child(even) td {
                    background: #fafafa;
                }

                .footer {
                    margin-top: 32px;
                    font-size: 10px;
                    color: #aaa;
                    text-align: center;
                }
            </style>
        </head>

        <body>

            <h1>MANGATA — REPORTE DE VENTAS</h1>

            <p class="sub">
                Período: ${labelPeriodo}
                &nbsp;|&nbsp;
                Generado el ${hoy}
            </p>

            <div class="grid">

                <div class="card">
                    <div class="card-label">
                        Ingresos pagados
                    </div>

                    <div class="card-valor">
                        ${fmt(ingresosPagados)}
                    </div>

                    <div class="card-sub">
                        COP
                    </div>
                </div>

                <div class="card">
                    <div class="card-label">
                        Pagos aprobados
                    </div>

                    <div class="card-valor">
                        ${fmtN(pagosAprobados.length)}
                    </div>

                    <div class="card-sub">
                        pedidos
                    </div>
                </div>

                <div class="card">
                    <div class="card-label">
                        Ticket promedio
                    </div>

                    <div class="card-valor">
                        ${fmt(ticketPromedio)}
                    </div>

                    <div class="card-sub">
                        por pago
                    </div>
                </div>

                <div class="card">
                    <div class="card-label">
                        Entregados
                    </div>

                    <div class="card-valor">
                        ${fmtN(pedidosEntregados.length)}
                    </div>

                    <div class="card-sub">
                        pedidos
                    </div>
                </div>

                <div class="card">
                    <div class="card-label">
                        Cancelados
                    </div>

                    <div class="card-valor">
                        ${fmtN(cancelados.length)}
                    </div>

                    <div class="card-sub">
                        pedidos
                    </div>
                </div>
            </div>

            <h2>
                PAGOS POR MÉTODO
            </h2>

            <table>
                <thead>
                    <tr>
                        <th>Método</th>
                        <th>Cantidad</th>
                        <th>Ingresos</th>
                    </tr>
                </thead>

                <tbody>
                    ${
                        filasMetodos ||
                        `<tr><td colspan="3">Sin pagos registrados</td></tr>`
                    }
                </tbody>
            </table>

            <h2>
                PAGOS RECIENTES
            </h2>

            <table>
                <thead>
                    <tr>
                        <th>Pedido</th>
                        <th>Mesa</th>
                        <th>Método</th>
                        <th>Total</th>
                    </tr>
                </thead>

                <tbody>
                    ${
                        filasPagos ||
                        `<tr><td colspan="4">Sin pagos registrados</td></tr>`
                    }
                </tbody>
            </table>

            <h2>
                RANKING DE PLATOS MÁS VENDIDOS
            </h2>

            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Plato</th>
                        <th>Unidades vendidas</th>
                        <th>Ingreso generado</th>
                    </tr>
                </thead>

                <tbody>
                    ${
                        ranking.length
                            ? ranking
                                  .slice(
                                      0,
                                      10
                                  )
                                  .map(
                                      (
                                          p,
                                          i
                                      ) => `
                                    <tr>
                                        <td>
                                            ${
                                                i ===
                                                0
                                                    ? "🥇"
                                                    : i ===
                                                        1
                                                      ? "🥈"
                                                      : i ===
                                                          2
                                                        ? "🥉"
                                                        : `#${i + 1}`
                                            }
                                        </td>

                                        <td>
                                            ${
                                                p.NombrePlato
                                            }
                                        </td>

                                        <td>
                                            ${fmtN(
                                                p.veces_pedido
                                            )}
                                        </td>

                                        <td>
                                            ${fmt(
                                                p.ingreso_generado
                                            )}
                                        </td>
                                    </tr>
                                `
                                  )
                                  .join("")
                            : `<tr><td colspan="4">Sin datos</td></tr>`
                    }
                </tbody>
            </table>

            <div class="footer">
                Reporte generado automáticamente por
                LogicLab — Mangata Restaurante
            </div>

        </body>
        </html>
        `

        const ventana =
            window.open(
                "",
                "_blank",
                "width=1000,height=750"
            )

        if (!ventana) {
            alert(
                "El navegador bloqueó la ventana del reporte. Permite ventanas emergentes."
            )

            setGenerando(false)
            return
        }

        ventana.document.write(
            html
        )

        ventana.document.close()

        ventana.onload = () => {
            ventana.print()
            setGenerando(false)
        }
    }

    const metricasBackend =
        datos?.metricas || {}

    const ingresos =
        pagosAprobados.length >
        0
            ? ingresosPagados
            : Number(
                  metricasBackend
                      .ingresos_totales ||
                      0
              )

    const totalPedidos =
        pedidosPeriodo.length

    return (
        <div className="emp-contenedor">

            <div
                className="emp-header"
                style={{
                    display:
                        "flex",
                    justifyContent:
                        "space-between",
                    alignItems:
                        "flex-end"
                }}
            >
                <div>
                    <h1 className="emp-titulo-pagina">
                        Reportes
                    </h1>

                    <p className="emp-subtitulo">
                        Análisis de ventas,
                        pagos y platos más
                        pedidos
                    </p>
                </div>

                <button
                    onClick={
                        exportarPDF
                    }
                    disabled={
                        !datos ||
                        generando
                    }
                    style={{
                        padding:
                            "10px 20px",
                        background:
                            datos
                                ? NEON
                                : "#333",
                        border:
                            "none",
                        borderRadius:
                            "8px",
                        color:
                            datos
                                ? "#000"
                                : "#666",
                        fontWeight:
                            "700",
                        fontSize:
                            "0.88rem",
                        cursor:
                            datos
                                ? "pointer"
                                : "not-allowed",
                        letterSpacing:
                            "1px"
                    }}
                >
                    {generando
                        ? "Generando..."
                        : "⬇ Exportar PDF"}
                </button>
            </div>

            <div
                style={{
                    display:
                        "flex",
                    gap:
                        "10px",
                    marginBottom:
                        "28px",
                    flexWrap:
                        "wrap"
                }}
            >
                {PERIODOS.map(
                    p => (
                        <button
                            key={
                                p.valor
                            }
                            onClick={() =>
                                setPeriodo(
                                    p.valor
                                )
                            }
                            style={{
                                padding:
                                    "8px 20px",
                                borderRadius:
                                    "20px",
                                cursor:
                                    "pointer",
                                border: `1px solid ${
                                    periodo ===
                                    p.valor
                                        ? NEON
                                        : "rgba(255,255,255,0.15)"
                                }`,
                                background:
                                    periodo ===
                                    p.valor
                                        ? NEON
                                        : "rgba(255,255,255,0.05)",
                                color:
                                    periodo ===
                                    p.valor
                                        ? "#000"
                                        : "#bbb",
                                fontWeight:
                                    periodo ===
                                    p.valor
                                        ? "700"
                                        : "400",
                                fontSize:
                                    "0.85rem"
                            }}
                        >
                            {p.label}
                        </button>
                    )
                )}
            </div>

            {cargando && (
                <p className="emp-estado-msg">
                    Cargando reporte...
                </p>
            )}

            {error && (
                <p className="emp-estado-msg emp-error">
                    {error}
                </p>
            )}

            {!cargando &&
                datos && (
                    <>
                        <div
                            style={{
                                display:
                                    "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit,minmax(210px,1fr))",
                                gap:
                                    "16px",
                                marginBottom:
                                    "28px"
                            }}
                        >
                            <StatCard
                                icono="💰"
                                label="Ingresos pagados"
                                valor={fmt(
                                    ingresos
                                )}
                                sub="COP"
                            />

                            <StatCard
                                icono="💳"
                                label="Pagos aprobados"
                                valor={fmtN(
                                    pagosAprobados.length
                                )}
                                sub={`${totalPedidos} pedidos en el período`}
                            />

                            <StatCard
                                icono="📊"
                                label="Ticket promedio"
                                valor={fmt(
                                    ticketPromedio
                                )}
                                sub="por pago"
                            />

                            <StatCard
                                icono="✅"
                                label="Entregados"
                                valor={fmtN(
                                    pedidosEntregados.length
                                )}
                                sub="pedidos"
                            />

                            <StatCard
                                icono="❌"
                                label="Cancelados"
                                valor={fmtN(
                                    cancelados.length
                                )}
                                sub="pedidos"
                            />
                        </div>

                        <div
                            style={{
                                background:
                                    "rgba(255,255,255,0.03)",
                                border:
                                    "1px solid rgba(255,23,68,0.2)",
                                borderRadius:
                                    "14px",
                                padding:
                                    "24px",
                                marginBottom:
                                    "28px"
                            }}
                        >
                            <h2
                                style={{
                                    color:
                                        NEON,
                                    fontSize:
                                        "0.95rem",
                                    letterSpacing:
                                        "2px",
                                    margin:
                                        "0 0 20px"
                                }}
                            >
                                PAGOS POR MÉTODO
                            </h2>

                            {listaMetodos.length ===
                            0 ? (
                                <p
                                    style={{
                                        color:
                                            "#555",
                                        textAlign:
                                            "center",
                                        padding:
                                            "25px"
                                    }}
                                >
                                    No hay pagos
                                    aprobados
                                    en este
                                    período.
                                </p>
                            ) : (
                                <div
                                    style={{
                                        display:
                                            "grid",
                                        gridTemplateColumns:
                                            "repeat(auto-fit,minmax(180px,1fr))",
                                        gap:
                                            "14px"
                                    }}
                                >
                                    {listaMetodos.map(
                                        ([
                                            metodo,
                                            info
                                        ]) => (
                                            <div
                                                key={
                                                    metodo
                                                }
                                                style={{
                                                    padding:
                                                        "18px",
                                                    borderRadius:
                                                        "12px",
                                                    background:
                                                        "rgba(255,255,255,0.04)",
                                                    border:
                                                        "1px solid rgba(255,23,68,0.18)"
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        color:
                                                            "#aaa",
                                                        fontSize:
                                                            "0.75rem",
                                                        textTransform:
                                                            "uppercase",
                                                        marginBottom:
                                                            "7px"
                                                    }}
                                                >
                                                    {metodo}
                                                </div>

                                                <div
                                                    style={{
                                                        color:
                                                            NEON,
                                                        fontSize:
                                                            "1.35rem",
                                                        fontWeight:
                                                            "700"
                                                    }}
                                                >
                                                    {fmt(
                                                        info.total
                                                    )}
                                                </div>

                                                <div
                                                    style={{
                                                        color:
                                                            "#666",
                                                        fontSize:
                                                            "0.75rem",
                                                        marginTop:
                                                            "5px"
                                                    }}
                                                >
                                                    {info.cantidad}{" "}
                                                    pago
                                                    {info.cantidad !==
                                                    1
                                                        ? "s"
                                                        : ""}
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        <div
                            style={{
                                background:
                                    "rgba(255,255,255,0.03)",
                                border:
                                    "1px solid rgba(255,23,68,0.2)",
                                borderRadius:
                                    "14px",
                                padding:
                                    "24px",
                                marginBottom:
                                    "28px"
                            }}
                        >
                            <h2
                                style={{
                                    color:
                                        NEON,
                                    fontSize:
                                        "0.95rem",
                                    letterSpacing:
                                        "2px",
                                    margin:
                                        "0 0 20px"
                                }}
                            >
                                PAGOS RECIENTES
                            </h2>

                            {pagosRecientes.length ===
                            0 ? (
                                <p
                                    style={{
                                        color:
                                            "#555",
                                        textAlign:
                                            "center",
                                        padding:
                                            "25px"
                                    }}
                                >
                                    Sin pagos
                                    aprobados.
                                </p>
                            ) : (
                                <div
                                    style={{
                                        overflowX:
                                            "auto"
                                    }}
                                >
                                    <table
                                        style={{
                                            width:
                                                "100%",
                                            borderCollapse:
                                                "collapse",
                                            fontSize:
                                                "0.85rem"
                                        }}
                                    >
                                        <thead>
                                            <tr>
                                                {[
                                                    "Pedido",
                                                    "Mesa",
                                                    "Fecha",
                                                    "Método",
                                                    "Estado",
                                                    "Total"
                                                ].map(
                                                    h => (
                                                        <th
                                                            key={
                                                                h
                                                            }
                                                            style={{
                                                                color:
                                                                    NEON,
                                                                padding:
                                                                    "10px 12px",
                                                                textAlign:
                                                                    "left",
                                                                borderBottom:
                                                                    "1px solid rgba(255,23,68,0.25)",
                                                                fontSize:
                                                                    "0.72rem",
                                                                letterSpacing:
                                                                    "1px"
                                                            }}
                                                        >
                                                            {
                                                                h
                                                            }
                                                        </th>
                                                    )
                                                )}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {pagosRecientes.map(
                                                p => (
                                                    <tr
                                                        key={
                                                            p.id_Pedidos
                                                        }
                                                    >
                                                        <td
                                                            style={{
                                                                padding:
                                                                    "10px 12px",
                                                                color:
                                                                    "#fff"
                                                            }}
                                                        >
                                                            #
                                                            {
                                                                p.id_Pedidos
                                                            }
                                                        </td>

                                                        <td
                                                            style={{
                                                                padding:
                                                                    "10px 12px",
                                                                color:
                                                                    "#bbb"
                                                            }}
                                                        >
                                                            Mesa{" "}
                                                            {p.Numero_mesa ??
                                                                "—"}
                                                        </td>

                                                        <td
                                                            style={{
                                                                padding:
                                                                    "10px 12px",
                                                                color:
                                                                    "#888"
                                                            }}
                                                        >
                                                            {fechaCorta(
                                                                p.Fecha_Pedido
                                                            )}
                                                        </td>

                                                        <td
                                                            style={{
                                                                padding:
                                                                    "10px 12px",
                                                                color:
                                                                    "#ddd"
                                                            }}
                                                        >
                                                            {p.MetodoPago ||
                                                                "Sin método"}
                                                        </td>

                                                        <td
                                                            style={{
                                                                padding:
                                                                    "10px 12px"
                                                            }}
                                                        >
                                                            <span
                                                                style={{
                                                                    color:
                                                                        "#2ecc71",
                                                                    background:
                                                                        "rgba(46,204,113,0.12)",
                                                                    border:
                                                                        "1px solid rgba(46,204,113,0.25)",
                                                                    borderRadius:
                                                                        "20px",
                                                                    padding:
                                                                        "4px 9px",
                                                                    fontSize:
                                                                        "0.68rem"
                                                                }}
                                                            >
                                                                APROBADO
                                                            </span>
                                                        </td>

                                                        <td
                                                            style={{
                                                                padding:
                                                                    "10px 12px",
                                                                color:
                                                                    NEON,
                                                                fontWeight:
                                                                    "700"
                                                            }}
                                                        >
                                                            {fmt(
                                                                p.TotalPagar
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div
                            style={{
                                background:
                                    "rgba(255,255,255,0.03)",
                                border:
                                    "1px solid rgba(255,23,68,0.2)",
                                borderRadius:
                                    "14px",
                                padding:
                                    "24px",
                                marginBottom:
                                    "28px"
                            }}
                        >
                            <h2
                                style={{
                                    color:
                                        NEON,
                                    fontSize:
                                        "0.95rem",
                                    letterSpacing:
                                        "2px",
                                    margin:
                                        "0 0 20px"
                                }}
                            >
                                INGRESOS POR DÍA
                            </h2>

                            <GraficaBarras
                                datos={
                                    datos.porDia
                                }
                            />
                        </div>

                        <div
                            style={{
                                background:
                                    "rgba(255,255,255,0.03)",
                                border:
                                    "1px solid rgba(255,23,68,0.2)",
                                borderRadius:
                                    "14px",
                                padding:
                                    "24px"
                            }}
                        >
                            <h2
                                style={{
                                    color:
                                        NEON,
                                    fontSize:
                                        "0.95rem",
                                    letterSpacing:
                                        "2px",
                                    margin:
                                        "0 0 20px"
                                }}
                            >
                                PLATOS MÁS VENDIDOS
                            </h2>

                            {!datos.ranking ||
                            datos.ranking.length ===
                                0 ? (
                                <p
                                    style={{
                                        color:
                                            "#555",
                                        textAlign:
                                            "center",
                                        padding:
                                            "30px"
                                    }}
                                >
                                    Sin datos de
                                    ventas en
                                    este
                                    período.
                                </p>
                            ) : (
                                <div
                                    style={{
                                        overflowX:
                                            "auto"
                                    }}
                                >
                                    <table
                                        style={{
                                            width:
                                                "100%",
                                            borderCollapse:
                                                "collapse",
                                            fontSize:
                                                "0.88rem"
                                        }}
                                    >
                                        <thead>
                                            <tr>
                                                {[
                                                    "#",
                                                    "Plato",
                                                    "Unidades",
                                                    "Ingreso generado"
                                                ].map(
                                                    h => (
                                                        <th
                                                            key={
                                                                h
                                                            }
                                                            style={{
                                                                color:
                                                                    NEON,
                                                                padding:
                                                                    "10px 12px",
                                                                textAlign:
                                                                    "left",
                                                                fontSize:
                                                                    "0.75rem",
                                                                letterSpacing:
                                                                    "1px",
                                                                borderBottom:
                                                                    "1px solid rgba(255,23,68,0.3)"
                                                            }}
                                                        >
                                                            {
                                                                h
                                                            }
                                                        </th>
                                                    )
                                                )}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {datos.ranking.map(
                                                (
                                                    p,
                                                    i
                                                ) => (
                                                    <tr
                                                        key={
                                                            `${p.NombrePlato}-${i}`
                                                        }
                                                    >
                                                        <td
                                                            style={{
                                                                padding:
                                                                    "10px 12px",
                                                                fontSize:
                                                                    "1rem"
                                                            }}
                                                        >
                                                            {i ===
                                                            0
                                                                ? "🥇"
                                                                : i ===
                                                                    1
                                                                  ? "🥈"
                                                                  : i ===
                                                                      2
                                                                    ? "🥉"
                                                                    : `#${i + 1}`}
                                                        </td>

                                                        <td
                                                            style={{
                                                                padding:
                                                                    "10px 12px",
                                                                color:
                                                                    "#eee",
                                                                fontWeight:
                                                                    i <
                                                                    3
                                                                        ? "700"
                                                                        : "400"
                                                            }}
                                                        >
                                                            {
                                                                p.NombrePlato
                                                            }
                                                        </td>

                                                        <td
                                                            style={{
                                                                padding:
                                                                    "10px 12px",
                                                                color:
                                                                    NEON,
                                                                fontWeight:
                                                                    "700"
                                                            }}
                                                        >
                                                            {fmtN(
                                                                p.veces_pedido
                                                            )}
                                                        </td>

                                                        <td
                                                            style={{
                                                                padding:
                                                                    "10px 12px",
                                                                color:
                                                                    "#bbb"
                                                            }}
                                                        >
                                                            {fmt(
                                                                p.ingreso_generado
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
        </div>
    )
}

export default Reportes
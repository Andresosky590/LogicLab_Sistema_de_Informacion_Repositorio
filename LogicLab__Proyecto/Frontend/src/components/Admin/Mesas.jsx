import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import QRCode from "qrcode"
import '../../../Hojas_de_Estilo/Administrador.css'
import '../../App.css'

const API = "http://localhost:5030"

// La URL del QR usa el mismo origen donde corre este panel de admin,
// porque VistaCliente.jsx vive en el mismo proyecto web — a
// diferencia de la app Flutter, acá no hace falta una IP aparte.
const urlVistaCliente = token =>
    `${window.location.origin}/vistacliente?mesa=${token}`

function Mesas() {
    const [mesas, setMesas]       = useState([])
    const [qrs, setQrs]           = useState({})   // { id_Mesas: dataUrl }
    const [cargando, setCargando] = useState(true)
    const [error, setError]       = useState(null)
    const [regenerando, setRegenerando] = useState(null) // id_Mesas en curso
    const [imprimiendo, setImprimiendo] = useState(false)

    // ------------------------------------------------------------
    // GENERAR LAS IMÁGENES QR (una vez que tenemos las mesas)
    // ------------------------------------------------------------

    const generarQrs = useCallback(async (listaMesas) => {
        const entradas = await Promise.all(
            listaMesas.map(async m => {
                const dataUrl = await QRCode.toDataURL(
                    urlVistaCliente(m.QR_Token),
                    { width: 300, margin: 1 }
                )
                return [m.id_Mesas, dataUrl]
            })
        )
        setQrs(Object.fromEntries(entradas))
    }, [])

    // ------------------------------------------------------------
    // CARGAR
    // ------------------------------------------------------------

    const cargar = useCallback(async () => {
        setCargando(true)
        setError(null)
        try {
            const res = await axios.get(`${API}/api/mesas/admin/listar`)
            setMesas(res.data)
            await generarQrs(res.data)
        } catch {
            setError("No se pudieron cargar las mesas")
        } finally {
            setCargando(false)
        }
    }, [generarQrs])

    useEffect(() => { cargar() }, [cargar])

    // ------------------------------------------------------------
    // REGENERAR
    // ------------------------------------------------------------

    const regenerar = async (mesa) => {
        if (!window.confirm(
            `¿Regenerar el QR de la Mesa ${mesa.Numero_mesa}? El QR impreso que tengas pegado ahí dejará de funcionar.`
        )) return

        setRegenerando(mesa.id_Mesas)
        try {
            await axios.put(`${API}/api/mesas/${mesa.id_Mesas}/regenerar-qr`)
            await cargar()
        } catch {
            alert("No se pudo regenerar el código QR")
        } finally {
            setRegenerando(null)
        }
    }

    // ------------------------------------------------------------
    // IMPRIMIR (mismo patrón que usa reportes.jsx: ventana + print)
    // ------------------------------------------------------------

    const construirHtmlImpresion = (listaMesas) => `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>QR de mesas - Restaurante Mangata</title>
            <style>
                * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
                body { padding: 24px; color: #222; }
                h1 { color: #cc0011; font-size: 20px; letter-spacing: 1px; margin-bottom: 2px; }
                .subtitulo { color: #555; font-size: 13px; margin-bottom: 18px; }
                .grid {
                    display: flex; flex-wrap: wrap; gap: 16px;
                }
                .tarjeta {
                    width: 220px; border: 1px solid #ddd; border-radius: 8px;
                    padding: 14px; text-align: center; page-break-inside: avoid;
                }
                .tarjeta img { width: 100%; height: auto; }
                .mesa-num { font-weight: bold; font-size: 15px; margin: 8px 0 2px; }
                .pie { font-size: 10px; color: #888; }
            </style>
        </head>
        <body>
            <h1>RESTAURANTE MANGATA</h1>
            <p class="subtitulo">Códigos QR de mesas</p>
            <div class="grid">
                ${listaMesas.map(m => `
                    <div class="tarjeta">
                        <img src="${qrs[m.id_Mesas] ?? ""}" alt="QR Mesa ${m.Numero_mesa}" />
                        <p class="mesa-num">MESA ${m.Numero_mesa}</p>
                        <p class="pie">Escanea para pedir</p>
                    </div>
                `).join("")}
            </div>
        </body>
        </html>
    `

    const imprimir = (listaMesas) => {
        setImprimiendo(true)

        const ventana = window.open("", "_blank", "width=1000,height=750")

        if (!ventana) {
            alert("El navegador bloqueó la ventana de impresión. Permite ventanas emergentes.")
            setImprimiendo(false)
            return
        }

        ventana.document.write(construirHtmlImpresion(listaMesas))
        ventana.document.close()

        ventana.onload = () => {
            ventana.print()
            setImprimiendo(false)
        }
    }

    // ------------------------------------------------------------
    // RENDER
    // ------------------------------------------------------------

    if (cargando) return <p className="emp-estado-msg">Cargando mesas...</p>
    if (error) return <p className="emp-estado-msg emp-error">{error}</p>

    return (
        <div className="emp-contenedor">

            <div className="emp-header">
                <div>
                    <h1 className="emp-titulo-pagina">QR de Mesas</h1>
                    <p className="emp-subtitulo">{mesas.length} mesas activas</p>
                </div>

                <button
                    className="emp-btn-guardar"
                    onClick={() => imprimir(mesas)}
                    disabled={imprimiendo || mesas.length === 0}
                >
                    {imprimiendo ? "Generando..." : "🖨️ Imprimir todas"}
                </button>
            </div>

            {mesas.length === 0
                ? <p className="emp-estado-msg">No hay mesas registradas todavía.</p>
                : (
                    <div className="platos-grid">
                        {mesas.map(mesa => (
                            <div key={mesa.id_Mesas} className="plato-card mesa-qr-card">
                                <p className="mesa-qr-titulo">MESA {mesa.Numero_mesa}</p>

                                <div className="mesa-qr-img-wrap">
                                    {regenerando === mesa.id_Mesas
                                        ? <div className="mesa-qr-spinner" />
                                        : qrs[mesa.id_Mesas] &&
                                            <img
                                                src={qrs[mesa.id_Mesas]}
                                                alt={`QR Mesa ${mesa.Numero_mesa}`}
                                                className="mesa-qr-img"
                                            />
                                    }
                                </div>

                                <div className="mesa-qr-acciones">
                                    <button
                                        title="Regenerar QR"
                                        onClick={() => regenerar(mesa)}
                                        disabled={regenerando === mesa.id_Mesas}
                                    >
                                        <i className="bi bi-arrow-repeat"></i>
                                    </button>
                                    <button
                                        title="Imprimir esta mesa"
                                        onClick={() => imprimir([mesa])}
                                        disabled={imprimiendo || regenerando === mesa.id_Mesas}
                                    >
                                        <i className="bi bi-printer"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }
        </div>
    )
}

export default Mesas
import { useEffect, useState, useRef } from "react"
import axios from "axios"
import '../../../Hojas_de_Estilo/Administrador.css';
import '../../App.css';

const API = "http://localhost:5030";

const NEON = "#ff1744";
const NEON_DIM = "#cc0f33";
const NEON_SOFT = "rgba(255, 23, 68, 0.15)";
const NEON_BORDER = "rgba(255, 23, 68, 0.30)";
const NEON_GLOW = "rgba(255, 23, 68, 0.55)";

function CustomDropdown({ placeholder, opciones, value, onChange }) {
    const [abierto, setAbierto] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setAbierto(false)
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    return (
        <div ref={ref} style={{ position: "relative", flex: 1 }}>
            <div
                onClick={() => setAbierto(v => !v)}
                style={{
                    padding: "10px 14px", background: "#0d0d0d",
                    border: "1px solid #444", borderRadius: "6px",
                    color: value ? "#fff" : "#777", cursor: "pointer",
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", userSelect: "none", fontSize: "0.9rem"
                }}
            >
                <span>{value || placeholder}</span>
                <span style={{ color: NEON, fontSize: "0.75rem", marginLeft: "8px" }}>
                    {abierto ? "▲" : "▼"}
                </span>
            </div>

            {abierto && (
                <div style={{
                    position: "absolute", top: "calc(100% + 4px)",
                    left: 0, right: 0, background: "#0d0d0d",
                    border: "1px solid #444", borderRadius: "6px",
                    zIndex: 999, maxHeight: "200px", overflowY: "auto",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.6)"
                }}>
                    <div
                        onClick={() => { onChange(""); setAbierto(false) }}
                        style={{ padding: "9px 14px", color: "#666", fontSize: "0.85rem", cursor: "pointer", borderBottom: "1px solid #1f1f1f" }}
                    >
                        {placeholder}
                    </div>
                    {opciones.map((op, i) => (
                        <div
                            key={i}
                            onClick={() => { onChange(op); setAbierto(false) }}
                            style={{
                                padding: "9px 14px",
                                color: op === value ? NEON : "#ddd",
                                background: op === value ? NEON_SOFT : "transparent",
                                fontSize: "0.88rem", cursor: "pointer",
                                borderBottom: i < opciones.length - 1 ? "1px solid #1a1a1a" : "none",
                                transition: "background 0.15s"
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,23,68,0.08)"}
                            onMouseLeave={e => e.currentTarget.style.background = op === value ? NEON_SOFT : "transparent"}
                        >
                            {op}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function FilaSeleccion({ label, opciones, lista, setLista, selVal, setSelVal }) {
    const agregar = () => {
        if (selVal && !lista.includes(selVal)) setLista([...lista, selVal])
        setSelVal("")
    }
    return (
        <div style={{ marginBottom: "18px" }}>
            <label style={{ color: NEON, fontWeight: "700", display: "block", marginBottom: "8px", fontSize: "0.88rem" }}>
                {label}
            </label>
            {lista.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                    {lista.map((item, i) => (
                        <span key={i} style={{
                            padding: "3px 10px", border: `1px solid ${NEON}`,
                            borderRadius: "20px", color: "#fff", fontSize: "0.8rem",
                            display: "flex", alignItems: "center", gap: "6px",
                            background: NEON_SOFT
                        }}>
                            {item}
                            <button onClick={() => setLista(lista.filter(v => v !== item))}
                                style={{ background: "none", border: "none", color: NEON, cursor: "pointer", fontSize: "0.9rem", lineHeight: 1, padding: 0 }}
                            >✕</button>
                        </span>
                    ))}
                </div>
            )}
            <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
                <CustomDropdown placeholder={`— ${label} —`} opciones={opciones} value={selVal} onChange={setSelVal} />
                <button onClick={agregar} style={{
                    padding: "0 16px", background: NEON, color: "#000",
                    border: "none", borderRadius: "6px", cursor: "pointer",
                    fontWeight: "700", fontSize: "1.1rem", flexShrink: 0,
                    boxShadow: `0 0 10px ${NEON_GLOW}`,
                    transition: "background 0.2s, box-shadow 0.2s"
                }}
                    onMouseEnter={e => { e.currentTarget.style.background = NEON_DIM; e.currentTarget.style.boxShadow = `0 0 16px ${NEON_GLOW}`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = NEON; e.currentTarget.style.boxShadow = `0 0 10px ${NEON_GLOW}`; }}
                >+</button>
            </div>
        </div>
    )
}

const PRECIO_CORRIENTE = 15000

function Menus() {
    const [platos, setPlatos] = useState([])
    const [categorias, setCategorias] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)
    const [menuSubido, setMenuSubido] = useState(false)
    const [modalConfirmar, setModalConfirmar] = useState(false)

    const [sopas, setSopas] = useState([])
    const [proteinas, setProteinas] = useState([])
    const [principios, setPrincipios] = useState([])
    const [acompanantes, setAcompanantes] = useState([])
    const [selSopa, setSelSopa] = useState("")
    const [selProteina, setSelProteina] = useState("")
    const [selPrincipio, setSelPrincipio] = useState("")
    const [selAcompanante, setSelAcompanante] = useState("")

    const [platosMenu, setPlatosMenu] = useState([])
    const [filtro, setFiltro] = useState("2")

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [resPlatos, resCategorias] = await Promise.all([
                    axios.get(`${API}/api/platos/listar`),
                    axios.get(`${API}/api/categorias/listar`)
                ])
                setPlatos(resPlatos.data)
                setCategorias(resCategorias.data)
            } catch (err) {
                setError("No se pudo conectar con el servidor")
            } finally {
                setCargando(false)
            }
        }
        cargarDatos()

        const guardado = localStorage.getItem("menuDelDia")
        if (guardado) {
            try {
                const arr = JSON.parse(guardado)
                if (Array.isArray(arr)) {
                    setPlatosMenu(arr.filter(p => String(p.id_Categoria) !== "1"))
                    setMenuSubido(true)
                }
            } catch(e) {}
        }
        const corriente = localStorage.getItem("menuCorriente")
        if (corriente) {
            try {
                const c = JSON.parse(corriente)
                setSopas(c.sopas || [])
                setProteinas(c.proteinas || [])
                setPrincipios(c.principios || [])
                setAcompanantes(c.acompanantes || [])
            } catch(e) {}
        }
    }, [])

    const togglePlato = (plato) => {
        const yaEsta = platosMenu.some(p => p.id_Platos === plato.id_Platos)
        if (yaEsta) {
            setPlatosMenu(prev => prev.filter(p => p.id_Platos !== plato.id_Platos))
        } else {
            setPlatosMenu(prev => [...prev, plato])
        }
        setMenuSubido(false)
    }

    const construirCorrienteDelDia = () => {
        const hayComponentes = sopas.length || proteinas.length || principios.length || acompanantes.length
        if (!hayComponentes) return null

        const partes = []
        if (sopas.length) partes.push(`Sopa: ${sopas.join(" o ")}`)
        if (proteinas.length) partes.push(`Proteína: ${proteinas.join(" o ")}`)
        if (principios.length) partes.push(`Principio: ${principios.join(" o ")}`)
        if (acompanantes.length) partes.push(`Acompañante: ${acompanantes.join(" o ")}`)
        const descripcion = partes.join(" • ")

        return {
            id_Platos: 9999,
            NombrePlato: "Corriente del Día",
            Descripcion: descripcion,
            Precio: PRECIO_CORRIENTE,
            id_Categoria: 1
        }
    }

    const confirmarSubida = () => {
        localStorage.setItem("menuCorriente", JSON.stringify({ sopas, proteinas, principios, acompanantes }))
        const corrienteDelDia = construirCorrienteDelDia()
        const menuFinal = corrienteDelDia
            ? [corrienteDelDia, ...platosMenu]
            : [...platosMenu]
        localStorage.setItem("menuDelDia", JSON.stringify(menuFinal))
        setModalConfirmar(false)
        setMenuSubido(true)
    }

    const limpiarTodo = () => {
        setSopas([]);        setSelSopa("")
        setProteinas([]);    setSelProteina("")
        setPrincipios([]);   setSelPrincipio("")
        setAcompanantes([]); setSelAcompanante("")
        setPlatosMenu([])
        localStorage.removeItem("menuDelDia")
        localStorage.removeItem("menuCorriente")
        setMenuSubido(false)
    }

    const categoriasFiltro = categorias.filter(c => ["2","3","4"].includes(String(c.id_Categoria)))
    const platosFiltrados  = platos.filter(p =>
        ["2","3","4"].includes(String(p.id_Categoria)) &&
        String(p.id_Categoria) === String(filtro)
    )

    const formatPrecio = (precio) => `$${Number(precio).toLocaleString("es-CO")}`
    const hayCorriente = sopas.length || proteinas.length || principios.length || acompanantes.length
    const totalItems   = (hayCorriente ? 1 : 0) + platosMenu.length

    if (cargando) return <p className="emp-estado-msg">Cargando platos...</p>
    if (error)    return <p className="emp-estado-msg emp-error">{error}</p>

    return (
        <div className="emp-contenedor">
            <div className="emp-header">
                <h1 className="emp-titulo-pagina">MENÚ HOY</h1>
                <p className="emp-subtitulo">Arma el menú del día</p>
            </div>

            <div style={{
                maxWidth: "680px", margin: "0 auto 32px auto",
                padding: "28px", border: `1px solid ${NEON_BORDER}`,
                borderRadius: "14px", background: "#111",
                boxShadow: `0 0 20px rgba(255,23,68,0.08)`
            }}>
                <h4 style={{ color: NEON, marginBottom: "6px", fontSize: "1.05rem",
                    textShadow: `0 0 8px ${NEON_GLOW}` }}>
                    Carta Corriente del Día
                </h4>
                <p style={{ color: "#888", fontSize: "0.8rem", marginBottom: "20px" }}>
                    Se publicará como un único plato "Corriente del Día" — precio fijo {formatPrecio(PRECIO_CORRIENTE)}
                </p>
                <FilaSeleccion label="Sopa"
                    opciones={["Sopa de Ajiaco","Sopa de Pasta","Sopa de Arroz","Sopa de Sancocho","Crema de Ahuyama","Crema de Champiñones"]}
                    lista={sopas} setLista={setSopas} selVal={selSopa} setSelVal={setSelSopa}
                />
                <FilaSeleccion label="Proteína"
                    opciones={["Res","Cerdo","Pechuga","Chuleta","Pollo Sudado","Carne Molida"]}
                    lista={proteinas} setLista={setProteinas} selVal={selProteina} setSelVal={setSelProteina}
                />
                <FilaSeleccion label="Principio"
                    opciones={["Frijol","Arveja","Lentejas","Garbanzos","Espaguetis","Macarrones","Poteca de Ahuyama","Puré de Papa"]}
                    lista={principios} setLista={setPrincipios} selVal={selPrincipio} setSelVal={setSelPrincipio}
                />
                <FilaSeleccion label="Acompañante"
                    opciones={["Papa Salada","Tajadas Fritas","Plátano Maduro","Yuca Blanca"]}
                    lista={acompanantes} setLista={setAcompanantes} selVal={selAcompanante} setSelVal={setSelAcompanante}
                />
            </div>

            {/* ── SECCIÓN 2: Platos y bebidas ── */}
            <div style={{ maxWidth: "680px", margin: "0 auto 32px auto" }}>
                <h4 style={{ color: NEON, marginBottom: "16px", fontSize: "1.05rem",
                    textShadow: `0 0 8px ${NEON_GLOW}` }}>
                    Platos y Bebidas del Menú
                </h4>

                <div className="menus-filtros" style={{ marginBottom: "16px" }}>
                    {categoriasFiltro.map(cat => (
                        <button key={cat.id_Categoria}
                            className={`platos-filtro-btn ${String(filtro) === String(cat.id_Categoria) ? "activo" : ""}`}
                            onClick={() => setFiltro(cat.id_Categoria)}
                        >
                            {cat.NombreCategoria}
                        </button>
                    ))}
                </div>

                <div className="menus-platos-lista">
                    {platosFiltrados.map(plato => {
                        const sel = platosMenu.some(p => p.id_Platos === plato.id_Platos)
                        return (
                            <div key={plato.id_Platos} onClick={() => togglePlato(plato)}
                                style={{
                                    display: "flex", alignItems: "center", gap: "12px",
                                    padding: "10px 14px", marginBottom: "8px",
                                    borderRadius: "8px", cursor: "pointer",
                                    border: sel ? `1px solid ${NEON}` : "1px solid #2a2a2a",
                                    background: sel ? NEON_SOFT : "#111",
                                    transition: "all 0.15s",
                                    boxShadow: sel ? `0 0 10px rgba(255,23,68,0.15)` : "none"
                                }}
                            >
                                <span style={{
                                    width: "20px", height: "20px", borderRadius: "4px",
                                    border: `2px solid ${NEON}`,
                                    background: sel ? NEON : "transparent",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    flexShrink: 0, fontSize: "0.75rem", color: "#fff"
                                }}>
                                    {sel ? "✓" : ""}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <p style={{ color: "#eee", fontWeight: sel ? "700" : "400", margin: 0, fontSize: "0.9rem" }}>
                                        {plato.NombrePlato}
                                    </p>
                                    <p style={{ color: "#777", margin: 0, fontSize: "0.78rem" }}>{plato.Descripcion}</p>
                                </div>
                                <span style={{ color: NEON, fontWeight: "700", fontSize: "0.88rem", flexShrink: 0 }}>
                                    {formatPrecio(plato.Precio)}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div style={{ maxWidth: "680px", margin: "0 auto" }}>
                {totalItems > 0 && (
                    <div style={{
                        padding: "14px", background: "#0d0d0d", borderRadius: "8px",
                        fontSize: "0.83rem", color: "#ccc", marginBottom: "16px",
                        border: `1px solid ${NEON_BORDER}`
                    }}>
                        <p style={{ color: NEON, fontWeight: "700", marginBottom: "8px",
                            textShadow: `0 0 6px ${NEON_GLOW}` }}>Resumen</p>
                        {hayCorriente && (
                            <>
                                <p style={{ marginBottom: "4px", color: "#fff" }}>
                                    <strong>Corriente del Día</strong> 
                                    ({formatPrecio(PRECIO_CORRIENTE)}):
                                </p>
                                {sopas.length > 0 && <p style={{ marginBottom: "2px", paddingLeft: "16px" }}>· Sopas: {sopas.join(", ")}</p>}
                                {proteinas.length > 0 && <p style={{ marginBottom: "2px", paddingLeft: "16px" }}>· Proteínas: {proteinas.join(", ")}</p>}
                                {principios.length > 0 && <p style={{ marginBottom: "2px", paddingLeft: "16px" }}>· Principios: {principios.join(", ")}</p>}
                                {acompanantes.length > 0 && <p style={{ marginBottom: "8px", paddingLeft: "16px" }}>· Acompañantes: {acompanantes.join(", ")}</p>}
                            </>
                        )}
                        {platosMenu.length > 0 && (
                            <p style={{ marginBottom: "4px" }}>
                                <strong>Platos/Bebidas:</strong> 
                                {platosMenu.map(p => p.NombrePlato).join(", ")}</p>
                        )}
                    </div>
                )}

                {menuSubido && (
                    <div style={{
                        padding: "8px 14px", background: "rgba(46,160,67,0.15)",
                        border: "1px solid #2ea043", borderRadius: "6px",
                        color: "#2ea043", fontSize: "0.85rem", marginBottom: "14px", textAlign: "center"
                    }}>
                        Menú activo — visible para clientes y meseros
                    </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                    <button className="menus-btn-subir" onClick={() => setModalConfirmar(true)} style={{ flex: 1 }}>
                        ↑ Publicar Menú del Día
                    </button>
                    <button onClick={limpiarTodo} style={{
                        padding: "10px 16px", background: "transparent",
                        border: "1px solid #555", color: "#aaa",
                        borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem"
                    }}>
                        Limpiar
                    </button>
                </div>
            </div>

            {modalConfirmar && (
                <div className="emp-modal-overlay" onClick={() => setModalConfirmar(false)}>
                    <div className="emp-modal menus-modal-confirmar" onClick={e => e.stopPropagation()}>
                        <div className="emp-modal-header">
                            <h2 className="emp-modal-titulo">MENÚ DE HOY</h2>
                        </div>
                        <div className="emp-modal-body">
                            <p className="menus-confirmar-texto">
                                Este será el menú de hoy.<br />¿Está todo correcto?
                            </p>
                            <div className="menus-confirmar-resumen">
                                <span>{(hayCorriente ? 1 : 0) + platosMenu.filter(p => String(p.id_Categoria) !== "4").length} platos</span>
                                <span>{platosMenu.filter(p => String(p.id_Categoria) === "4").length} bebidas</span>
                            </div>
                        </div>
                        <div className="emp-modal-footer">
                            <button className="emp-btn-cancelar" onClick={() => setModalConfirmar(false)}>No</button>
                            <button className="emp-btn-guardar" onClick={confirmarSubida}>¡Sí, publicar!</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Menus;
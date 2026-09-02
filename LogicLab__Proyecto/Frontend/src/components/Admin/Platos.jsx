import { useEffect, useState } from "react"
import axios from "axios"
import '../../../Hojas_de_Estilo/Administrador.css'
import '../../App.css'

const API  = "http://localhost:5030"
const NEON = "#ff1744"

const IMAGENES_PUBLIC = [
    { src: "/CartaCorriente.png", label: "Corriente"},
    { src: "/CartaComidaRapida.png", label: "Comida Rápida"},
    { src: "/CartaEspecial.png", label: "Especial"},
    { src: "/CartaBebidas.png", label: "Bebidas"},
    { src: "/hamburguesa.png", label: "Hamburguesa"},
    { src: "/Nuggets.jpg", label: "Nuggets"},
]

const IMG_CAT = {
    "1": "/CartaCorriente.png",
    "2": "/CartaComidaRapida.png",
    "3": "/CartaEspecial.png",
    "4": "/CartaBebidas.png",
}

function urlImagen(plato, imgMap) {
    return imgMap[plato.id_Platos]
        ?? IMG_CAT[String(plato.id_Categoria)]
        ?? "/CartaCorriente.png"
}

function PickerImagenes({ seleccionada, onSeleccionar }) {
    return (
        <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px",
            margin: "4px 0 12px 0"
        }}>
            {IMAGENES_PUBLIC.map(img => {
                const activa = seleccionada === img.src
                return (
                    <div key={img.src} onClick={() => onSeleccionar(img.src)}
                        style={{
                            border: activa ? `2px solid ${NEON}` : "2px solid transparent",
                            borderRadius: "8px", overflow: "hidden",
                            cursor: "pointer", position: "relative",
                            boxShadow: activa ? `0 0 10px rgba(255,23,68,0.5)` : "none",
                            transition: "all 0.15s"
                        }}
                    >
                        <img src={img.src} alt={img.label}
                            style={{ width: "100%", height: "70px", objectFit: "cover", display: "block" }} />
                        <p style={{
                            margin: 0, textAlign: "center", fontSize: "0.65rem",
                            padding: "3px 0",
                            background: activa ? NEON : "rgba(0,0,0,0.6)",
                            color: activa ? "#000" : "#aaa",
                            fontWeight: activa ? "700" : "400"
                        }}>{img.label}</p>
                        {activa && (
                            <div style={{
                                position: "absolute", top: "4px", right: "4px",
                                background: NEON, borderRadius: "50%",
                                width: "18px", height: "18px",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "0.7rem", color: "#000", fontWeight: "900"
                            }}>✓</div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function PreviewImagen({ src, alt, categoria }) {
    return (
        <div className="plato-modal-img-wrap">
            <img src={src} alt={alt} className="plato-modal-img" />
            {categoria && <span className="plato-modal-img-label">{categoria}</span>}
        </div>
    )
}

function Platos() {
    const [platos,    setPlatos]    = useState([])
    const [categorias,setCategorias]= useState([])
    const [cargando,  setCargando]  = useState(true)
    const [error,     setError]     = useState(null)
    const [busqueda,  setBusqueda]  = useState("")
    const [filtroCat, setFiltroCat] = useState("todas")

    const [imgMap, setImgMap] = useState(() => {
        try { return JSON.parse(localStorage.getItem("platos_imagenes") || "{}") }
        catch { return {} }
    })

    const [editando, setEditando] = useState(null)
    const [formEdit, setFormEdit] = useState({})
    const [imgEdit, setImgEdit] = useState(null)
    const [guardando, setGuardando] = useState(false)
    const [msgEdit, setMsgEdit] = useState(null)

    const [modalNuevo, setModalNuevo] = useState(false)
    const [formNuevo, setFormNuevo] = useState({ nombre: "", descripcion: "", precio: "", id_Categoria: "" })
    const [imgNuevo, setImgNuevo]   = useState(null)
    const [creando, setCreando] = useState(false)
    const [msgNuevo, setMsgNuevo]   = useState(null)

    useEffect(() => { cargar() }, [])

    const cargar = async () => {
        try {
            const [rP, rC] = await Promise.all([
                axios.get(`${API}/api/platos/listar`),
                axios.get(`${API}/api/categorias/listar`),
            ])
            setPlatos(rP.data)
            setCategorias(rC.data)
        } catch { setError("No se pudo conectar con el servidor") }
        finally  { setCargando(false) }
    }

    const actualizarImgMap = (nuevoMapa) => {
        setImgMap(nuevoMapa)
        localStorage.setItem("platos_imagenes", JSON.stringify(nuevoMapa))
    }

    const nombreCat = id => categorias.find(c => String(c.id_Categoria) === String(id))?.NombreCategoria ?? ""
    const fmtPrecio = p  => `$${Number(p).toLocaleString("es-CO")}`

    const abrirEdit = plato => {
        setEditando(plato)
        setFormEdit({ Descripcion: plato.Descripcion ?? "", Precio: plato.Precio })
        setImgEdit(imgMap[plato.id_Platos] ?? IMG_CAT[String(plato.id_Categoria)] ?? "/CartaCorriente.png")
        setMsgEdit(null)
    }

    const cerrarEdit = () => { setEditando(null); setImgEdit(null); setMsgEdit(null) }

    const guardarEdit = async () => {
        setGuardando(true)
        try {
            await axios.put(`${API}/api/platos/actualizar/${editando.id_Platos}`, {
                descripcion: formEdit.Descripcion,
                precio:      Number(formEdit.Precio),
            })
            actualizarImgMap({ ...imgMap, [editando.id_Platos]: imgEdit })
            await cargar()
            setMsgEdit({ ok: true, texto: "Plato actualizado correctamente" })
            setTimeout(cerrarEdit, 1200)
        } catch {
            setMsgEdit({ ok: false, texto: "Error al guardar los cambios" })
        } finally { setGuardando(false) }
    }

    const eliminarPlato = async () => {
        if (!window.confirm(`¿Eliminar "${editando.NombrePlato}"? Esta acción no se puede deshacer.`)) return
        setGuardando(true)
        try {
            await axios.delete(`${API}/api/platos/eliminar/${editando.id_Platos}`)
            const nuevo = { ...imgMap }
            delete nuevo[editando.id_Platos]
            actualizarImgMap(nuevo)
            await cargar()
            cerrarEdit()
        } catch { setMsgEdit({ ok: false, texto: "Error al eliminar el plato" }) }
        finally  { setGuardando(false) }
    }

    const abrirNuevo  = () => {
        setFormNuevo({ nombre: "", descripcion: "", precio: "", id_Categoria: "" })
        setImgNuevo(null)
        setMsgNuevo(null)
        setModalNuevo(true)
    }
    const cerrarNuevo = () => { setModalNuevo(false); setImgNuevo(null); setMsgNuevo(null) }

    const crearPlato = async () => {
        const { nombre, descripcion, precio, id_Categoria } = formNuevo
        if (!nombre.trim() || !precio || !id_Categoria) {
            setMsgNuevo({ ok: false, texto: "Nombre, precio y categoría son obligatorios" })
            return
        }
        setCreando(true)
        try {
            const res = await axios.post(`${API}/api/platos/agregar`, {
                nombre: nombre.trim(),
                descripcion: descripcion.trim() || null,
                precio: Number(precio),
                id_Categoria: Number(id_Categoria),
            })

            const nuevoId = res?.data?.id
            if (nuevoId && imgNuevo) {
                actualizarImgMap({ ...imgMap, [nuevoId]: imgNuevo })
            }
            await cargar()
            setMsgNuevo({ ok: true, texto: "Plato creado correctamente" })
            setTimeout(cerrarNuevo, 1200)
        } catch (err) {
            setMsgNuevo({ ok: false, texto: err.response?.data?.message ?? "Error al crear el plato" })
        } finally { setCreando(false) }
    }

    const filtrados = platos.filter(p =>
        p.NombrePlato.toLowerCase().includes(busqueda.toLowerCase()) &&
        (filtroCat === "todas" || String(p.id_Categoria) === String(filtroCat))
    )

    if (cargando) return <p className="emp-estado-msg">Cargando platos...</p>
    if (error) return <p className="emp-estado-msg emp-error">{error}</p>

    return (
        <div className="emp-contenedor">

            <div className="emp-header" style={{ position: "relative" }}>
                <div>
                    <h1 className="emp-titulo-pagina">Gestión de Platos</h1>
                    <p className="emp-subtitulo">{platos.length} platos registrados</p>
                </div>
                <button onClick={abrirNuevo} title="Agregar nuevo plato" style={{
                    position: "absolute", top: 0, right: 0,
                    width: "40px", height: "40px", borderRadius: "50%",
                    border: `2px solid ${NEON}`, background: "transparent",
                    color: NEON, fontSize: "1.4rem", fontWeight: "700",
                    cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", transition: "background 0.2s, color 0.2s",
                    boxShadow: "0 0 8px rgba(255,23,68,0.55)"
                }}
                    onMouseEnter={e => { e.currentTarget.style.background = NEON; e.currentTarget.style.color = "#000" }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = NEON }}
                >+</button>
            </div>

            <div className="platos-buscador-wrap">
                <input className="platos-buscador" type="text" placeholder="Buscar..."
                    value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>

            <div className="platos-filtros">
                <button className={`platos-filtro-btn ${filtroCat === "todas" ? "activo" : ""}`}
                    onClick={() => setFiltroCat("todas")}>Todos ↓</button>
                {categorias.map(c => (
                    <button key={c.id_Categoria}
                        className={`platos-filtro-btn ${filtroCat === c.id_Categoria ? "activo" : ""}`}
                        onClick={() => setFiltroCat(c.id_Categoria)}>
                        {c.NombreCategoria}
                    </button>
                ))}
            </div>

            {filtrados.length === 0
                ? <p className="emp-estado-msg">No se encontraron platos</p>
                : (
                    <div className="platos-grid">
                        {filtrados.map(plato => (
                            <div key={plato.id_Platos} className="plato-card">
                                <div className="plato-card-img-wrap">
                                    <img src={urlImagen(plato, imgMap)} alt={plato.NombrePlato} className="plato-card-img" />
                                    <span className="plato-card-categoria">{nombreCat(plato.id_Categoria)}</span>
                                </div>
                                <div className="plato-card-body">
                                    <p className="plato-card-nombre">{plato.NombrePlato}</p>
                                    <p className="plato-card-descripcion">{plato.Descripcion}</p>
                                    <p className="plato-card-precio">{fmtPrecio(plato.Precio)}</p>
                                </div>
                                <button className="emp-btn-editar" onClick={() => abrirEdit(plato)}>Editar</button>
                            </div>
                        ))}
                    </div>
                )
            }

            {editando && (
                <div className="emp-modal-overlay" onClick={cerrarEdit}>
                    <div className="emp-modal" onClick={e => e.stopPropagation()}>
                        <div className="emp-modal-header">
                            <h2 className="emp-modal-titulo">EDICIÓN</h2>
                            <p className="emp-modal-nombre">{editando.NombrePlato}</p>
                        </div>
                        <div className="emp-modal-body">
                            <PreviewImagen src={imgEdit} alt={editando.NombrePlato} categoria={nombreCat(editando.id_Categoria)} />

                            <label className="emp-modal-label">Elegir imagen:</label>
                            <PickerImagenes seleccionada={imgEdit} onSeleccionar={setImgEdit} />

                            <label className="emp-modal-label">Descripción:</label>
                            <textarea className="plato-modal-textarea" rows={3}
                                value={formEdit.Descripcion}
                                onChange={e => setFormEdit(p => ({ ...p, Descripcion: e.target.value }))} />

                            <label className="emp-modal-label">Precio:</label>
                            <div className="plato-modal-precio-wrap">
                                <input className="emp-modal-input" type="number" min="0"
                                    value={formEdit.Precio}
                                    onChange={e => setFormEdit(p => ({ ...p, Precio: e.target.value }))} />
                                <span className="plato-modal-cop">COP</span>
                            </div>

                            {msgEdit && <p className={`emp-modal-mensaje ${msgEdit.ok ? "emp-modal-ok" : "emp-modal-err"}`}>{msgEdit.texto}</p>}
                        </div>
                        <div className="emp-modal-footer" style={{ justifyContent: "space-between" }}>
                            <button onClick={eliminarPlato} disabled={guardando} style={{
                                padding: "8px 16px", background: "transparent",
                                border: "1px solid #e24b4a", color: "#e24b4a",
                                borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: "600"
                            }}>Eliminar</button>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <button className="emp-btn-cancelar" onClick={cerrarEdit} disabled={guardando}>Cancelar</button>
                                <button className="emp-btn-guardar" onClick={guardarEdit} disabled={guardando}>
                                    {guardando ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {modalNuevo && (
                <div className="emp-modal-overlay" onClick={cerrarNuevo}>
                    <div className="emp-modal emp-modal-crear" onClick={e => e.stopPropagation()}>
                        <div className="emp-modal-header emp-modal-header-crear">
                            <h2 className="emp-modal-titulo">NUEVO PLATO</h2>
                            <p className="emp-modal-subtitulo">Completa los datos del nuevo plato</p>
                        </div>
                        <div className="emp-modal-body">

                            {imgNuevo
                                ? <PreviewImagen src={imgNuevo} alt="preview" />
                                : <div style={{
                                    width: "100%", height: "80px", background: "rgba(255,255,255,0.03)",
                                    borderRadius: "8px", display: "flex", alignItems: "center",
                                    justifyContent: "center", color: "#555", fontSize: "0.82rem",
                                    border: "1px dashed rgba(255,23,68,0.3)", marginBottom: "8px"
                                  }}>Sin imagen seleccionada</div>
                            }

                            <label className="emp-modal-label">Elegir imagen:</label>
                            <PickerImagenes seleccionada={imgNuevo} onSeleccionar={setImgNuevo} />

                            <label className="emp-modal-label">Nombre:</label>
                            <input className="emp-modal-input" type="text" placeholder="Ej: Bandeja Paisa"
                                value={formNuevo.nombre}
                                onChange={e => setFormNuevo(p => ({ ...p, nombre: e.target.value }))} />

                            <label className="emp-modal-label">Categoría:</label>
                            <select className="emp-modal-select" value={formNuevo.id_Categoria}
                                onChange={e => setFormNuevo(p => ({ ...p, id_Categoria: e.target.value }))}>
                                <option value="">— Selecciona —</option>
                                {categorias.map(c => <option key={c.id_Categoria} value={c.id_Categoria}>{c.NombreCategoria}</option>)}
                            </select>

                            <label className="emp-modal-label">Descripción:</label>
                            <textarea className="plato-modal-textarea" rows={3} placeholder="Breve descripción..."
                                value={formNuevo.descripcion}
                                onChange={e => setFormNuevo(p => ({ ...p, descripcion: e.target.value }))} />

                            <label className="emp-modal-label">Precio:</label>
                            <div className="plato-modal-precio-wrap">
                                <input className="emp-modal-input" type="number" min="0" placeholder="0"
                                    value={formNuevo.precio}
                                    onChange={e => setFormNuevo(p => ({ ...p, precio: e.target.value }))} />
                                <span className="plato-modal-cop">COP</span>
                            </div>

                            {msgNuevo && <p className={`emp-modal-mensaje ${msgNuevo.ok ? "emp-modal-ok" : "emp-modal-err"}`}>{msgNuevo.texto}</p>}
                        </div>
                        <div className="emp-modal-footer">
                            <button className="emp-btn-cancelar" onClick={cerrarNuevo} disabled={creando}>Cancelar</button>
                            <button className="emp-btn-guardar" onClick={crearPlato} disabled={creando}>
                                {creando ? "Creando..." : "Crear Plato"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Platos
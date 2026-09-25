import { useEffect, useState } from "react"
import axios from "axios"
import '../../../Hojas_de_Estilo/Administrador.css'
import '../../App.css'

const API  = "http://localhost:5030"
const NEON = "#ff1744"

// Imagen de respaldo por categoría, para los platos que todavía no
// tienen una foto real subida (ImagenUrl = null).
const IMG_CAT = {
    "1": "/CartaCorriente.png",
    "2": "/CartaComidaRapida.png",
    "3": "/CartaEspecial.png",
    "4": "/CartaBebidas.png",
}

// La imagen real de un plato vive en el backend (Backend/uploads/platos/),
// nunca en la BD ni en localStorage — acá solo armamos la URL completa.
function urlImagen(plato) {
    if (plato.ImagenUrl) return `${API}${plato.ImagenUrl}`
    return IMG_CAT[String(plato.id_Categoria)] ?? "/CartaCorriente.png"
}

function PreviewImagen({ src, alt, categoria }) {
    return (
        <div className="plato-modal-img-wrap">
            <img src={src} alt={alt} className="plato-modal-img" />
            {categoria && <span className="plato-modal-img-label">{categoria}</span>}
        </div>
    )
}

// Botón + input de archivo oculto para elegir una foto desde el
// dispositivo (galería o cámara, según lo que ofrezca el navegador).
function SelectorImagenArchivo({ onArchivo, subiendo }) {
    return (
        <label style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "8px", padding: "10px", margin: "4px 0 12px 0",
            border: `1px dashed ${NEON}`, borderRadius: "8px",
            color: NEON, fontSize: "0.82rem", fontWeight: "600",
            cursor: subiendo ? "default" : "pointer",
            opacity: subiendo ? 0.6 : 1,
            background: "rgba(255,23,68,0.05)"
        }}>
            {subiendo ? "Subiendo..." : "📷 Elegir imagen desde el dispositivo"}
            <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                style={{ display: "none" }}
                disabled={subiendo}
                onChange={e => {
                    const archivo = e.target.files?.[0]
                    if (archivo) onArchivo(archivo)
                    e.target.value = "" // permite volver a elegir el mismo archivo
                }}
            />
        </label>
    )
}

function Platos() {
    const [platos,    setPlatos]    = useState([])
    const [categorias,setCategorias]= useState([])
    const [cargando,  setCargando]  = useState(true)
    const [error,     setError]     = useState(null)
    const [busqueda,  setBusqueda]  = useState("")
    const [filtroCat, setFiltroCat] = useState("todas")

    const [editando, setEditando] = useState(null)
    const [formEdit, setFormEdit] = useState({})
    const [imgEditFile, setImgEditFile] = useState(null)
    const [imgEditPreview, setImgEditPreview] = useState(null)
    const [subiendoImgEdit, setSubiendoImgEdit] = useState(false)
    const [guardando, setGuardando] = useState(false)
    const [msgEdit, setMsgEdit] = useState(null)

    const [modalNuevo, setModalNuevo] = useState(false)
    const [formNuevo, setFormNuevo] = useState({ nombre: "", descripcion: "", precio: "", id_Categoria: "" })
    const [imgNuevoFile, setImgNuevoFile] = useState(null)
    const [imgNuevoPreview, setImgNuevoPreview] = useState(null)
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

    const nombreCat = id => categorias.find(c => String(c.id_Categoria) === String(id))?.NombreCategoria ?? ""
    const fmtPrecio = p  => `$${Number(p).toLocaleString("es-CO")}`

    // Sube la imagen de un plato ya existente (o recién creado) al
    // backend. Solo guarda la URL devuelta en la BD — nunca el archivo.
    const subirImagenPlato = async (idPlato, archivo) => {
        const formData = new FormData()
        formData.append("imagen", archivo)
        // No seteamos Content-Type a mano: axios arma el boundary
        // correcto solo cuando el body es un FormData.
        await axios.post(`${API}/api/platos/${idPlato}/imagen`, formData)
    }

    // ------------------------------------------------------------
    // EDITAR
    // ------------------------------------------------------------

    const abrirEdit = plato => {
        setEditando(plato)
        setFormEdit({ Descripcion: plato.Descripcion ?? "", Precio: plato.Precio })
        setImgEditFile(null)
        setImgEditPreview(plato.ImagenUrl ? `${API}${plato.ImagenUrl}` : null)
        setMsgEdit(null)
    }

    const cerrarEdit = () => {
        if (imgEditFile) URL.revokeObjectURL(imgEditPreview)
        setEditando(null); setImgEditFile(null); setImgEditPreview(null); setMsgEdit(null)
    }

    const elegirImagenEdit = archivo => {
        if (imgEditFile) URL.revokeObjectURL(imgEditPreview)
        setImgEditFile(archivo)
        setImgEditPreview(URL.createObjectURL(archivo))
    }

    const guardarEdit = async () => {
        setGuardando(true)
        try {
            await axios.put(`${API}/api/platos/actualizar/${editando.id_Platos}`, {
                descripcion: formEdit.Descripcion,
                precio:      Number(formEdit.Precio),
            })

            if (imgEditFile) {
                setSubiendoImgEdit(true)
                try {
                    await subirImagenPlato(editando.id_Platos, imgEditFile)
                } catch {
                    setMsgEdit({ ok: false, texto: "Se guardaron los datos, pero la imagen no se pudo subir." })
                    setSubiendoImgEdit(false)
                    setGuardando(false)
                    await cargar()
                    return
                }
                setSubiendoImgEdit(false)
            }

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
            await cargar()
            cerrarEdit()
        } catch { setMsgEdit({ ok: false, texto: "Error al eliminar el plato" }) }
        finally  { setGuardando(false) }
    }

    // ------------------------------------------------------------
    // NUEVO
    // ------------------------------------------------------------

    const abrirNuevo  = () => {
        setFormNuevo({ nombre: "", descripcion: "", precio: "", id_Categoria: "" })
        setImgNuevoFile(null)
        setImgNuevoPreview(null)
        setMsgNuevo(null)
        setModalNuevo(true)
    }
    const cerrarNuevo = () => {
        if (imgNuevoFile) URL.revokeObjectURL(imgNuevoPreview)
        setModalNuevo(false); setImgNuevoFile(null); setImgNuevoPreview(null); setMsgNuevo(null)
    }

    const elegirImagenNuevo = archivo => {
        if (imgNuevoFile) URL.revokeObjectURL(imgNuevoPreview)
        setImgNuevoFile(archivo)
        setImgNuevoPreview(URL.createObjectURL(archivo))
    }

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

            if (nuevoId && imgNuevoFile) {
                try {
                    await subirImagenPlato(nuevoId, imgNuevoFile)
                } catch {
                    setMsgNuevo({ ok: true, texto: "Plato creado, pero la imagen no se pudo subir. Puedes agregarla luego editándolo." })
                    await cargar()
                    setTimeout(cerrarNuevo, 1800)
                    setCreando(false)
                    return
                }
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
                                    <img src={urlImagen(plato)} alt={plato.NombrePlato} className="plato-card-img" />
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
                            {imgEditPreview
                                ? <PreviewImagen src={imgEditPreview} alt={editando.NombrePlato} categoria={nombreCat(editando.id_Categoria)} />
                                : <div style={{
                                    width: "100%", height: "80px", background: "rgba(255,255,255,0.03)",
                                    borderRadius: "8px", display: "flex", alignItems: "center",
                                    justifyContent: "center", color: "#555", fontSize: "0.82rem",
                                    border: "1px dashed rgba(255,23,68,0.3)", marginBottom: "8px"
                                  }}>Sin imagen todavía</div>
                            }

                            <label className="emp-modal-label">Foto del plato:</label>
                            <SelectorImagenArchivo onArchivo={elegirImagenEdit} subiendo={subiendoImgEdit} />

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

                            {imgNuevoPreview
                                ? <PreviewImagen src={imgNuevoPreview} alt="preview" />
                                : <div style={{
                                    width: "100%", height: "80px", background: "rgba(255,255,255,0.03)",
                                    borderRadius: "8px", display: "flex", alignItems: "center",
                                    justifyContent: "center", color: "#555", fontSize: "0.82rem",
                                    border: "1px dashed rgba(255,23,68,0.3)", marginBottom: "8px"
                                  }}>Sin imagen seleccionada</div>
                            }

                            <label className="emp-modal-label">Foto del plato:</label>
                            <SelectorImagenArchivo onArchivo={elegirImagenNuevo} subiendo={false} />

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
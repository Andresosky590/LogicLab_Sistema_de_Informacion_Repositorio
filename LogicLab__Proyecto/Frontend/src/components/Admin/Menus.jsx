import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import '../../../Hojas_de_Estilo/Administrador.css';
import '../../App.css';

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5030";

const ID_BEBIDAS = 4
const IMG_CATEGORIA = { "1": "/CartaCorriente.png", "2": "/CartaComidaRapida.png", "3": "/CartaEspecial.png", "4": "/CartaBebidas.png" }

const fmt = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`
const urlImagen = (p) => (p.ImagenUrl ? `${API}${p.ImagenUrl}` : IMG_CATEGORIA[String(p.id_Categoria)] ?? "/CartaCorriente.png")

// Cada sección necesita una clave estable para React mientras se edita
let contadorClaves = 0
const nuevaSeccion = (nombre = "", platos = []) => ({ key: `s${++contadorClaves}`, nombre, platos })

// Mismas reglas que valida el backend (Menudiacontroller.js)
const validarMenu = (secciones) => {
    if (secciones.length === 0) return "Agrega al menos una sección con el botón +"
    for (const s of secciones) {
        const nombre = s.nombre.trim()
        if (!nombre) return "Todas las secciones necesitan un nombre"
        if (s.platos.length === 0) return `La sección "${nombre}" está vacía: arrastra platos o quítala`
    }
    return null
}

// Tarjeta de las columnas de los lados: se arrastra hacia una sección
function TarjetaPlato({ plato }) {
    const [arrastrando, setArrastrando] = useState(false)
    return (
        <div
            className={`mb-tarjeta ${arrastrando ? "mb-arrastrando" : ""}`}
            draggable
            onDragStart={e => {
                e.dataTransfer.setData("application/json", JSON.stringify({ origen: "paleta", id: plato.id_Platos }))
                e.dataTransfer.effectAllowed = "copy"
                setArrastrando(true)
            }}
            onDragEnd={() => setArrastrando(false)}
        >
            <img src={urlImagen(plato)} alt="" className="mb-tarjeta-img" />
            <div className="mb-tarjeta-info">
                <p className="mb-tarjeta-nombre">{plato.NombrePlato}</p>
                <p className="mb-tarjeta-precio">{fmt(plato.Precio)}</p>
            </div>
        </div>
    )
}

function Menus() {
    const [platos, setPlatos] = useState([])
    const [categorias, setCategorias] = useState([])
    const [secciones, setSecciones] = useState([])
    const [menuActivo, setMenuActivo] = useState(false)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)
    const [aviso, setAviso] = useState(null)          // { tipo: "ok" | "error", texto }
    const [sobreSeccion, setSobreSeccion] = useState(null)
    const [modal, setModal] = useState(null)          // "publicar" | "limpiar" | null
    const [procesando, setProcesando] = useState(false)

    useEffect(() => {
        const cargar = async () => {
            try {
                const [resPlatos, resCategorias, resMenu] = await Promise.all([
                    axios.get(`${API}/api/platos/listar`),
                    axios.get(`${API}/api/categorias/listar`),
                    axios.get(`${API}/api/menu-dia/hoy`)
                ])
                setPlatos(Array.isArray(resPlatos.data) ? resPlatos.data : [])
                setCategorias(Array.isArray(resCategorias.data) ? resCategorias.data : [])
                // Si ya hay menú publicado hoy, se carga completo para editarlo
                if (resMenu.data?.secciones?.length) {
                    setSecciones(resMenu.data.secciones.map(s => nuevaSeccion(s.Nombre, s.platos.map(p => p.id_Platos))))
                    setMenuActivo(true)
                } else {
                    setSecciones([nuevaSeccion("Corriente del día")])
                }
            } catch (err) {
                setError("No se pudo conectar con el servidor")
            } finally {
                setCargando(false)
            }
        }
        cargar()
    }, [])

    const platosPorId = useMemo(() => Object.fromEntries(platos.map(p => [p.id_Platos, p])), [platos])

    // Cartas = categorías con platos, menos Bebidas (que tiene su propia columna)
    const cartas = categorias
        .filter(c => Number(c.id_Categoria) !== ID_BEBIDAS)
        .map(c => ({ ...c, platos: platos.filter(p => Number(p.id_Categoria) === Number(c.id_Categoria)) }))
        .filter(c => c.platos.length > 0)
    const bebidas = platos.filter(p => Number(p.id_Categoria) === ID_BEBIDAS)

    // Cualquier cambio deja el menú "sin publicar" hasta que se vuelva a publicar
    const cambiarSecciones = (fn) => {
        setSecciones(fn)
        setMenuActivo(false)
        setAviso(null)
    }

    const moverSeccion = (indice, direccion) => cambiarSecciones(prev => {
        const destino = indice + direccion
        if (destino < 0 || destino >= prev.length) return prev
        const copia = [...prev]
        ;[copia[indice], copia[destino]] = [copia[destino], copia[indice]]
        return copia
    })

    // ── Soltar un plato sobre una sección (o sobre otro plato, para reordenar) ──
    const soltar = (e, keyDestino, idObjetivo = null) => {
        e.preventDefault()
        e.stopPropagation()
        setSobreSeccion(null)
        let datos
        try { datos = JSON.parse(e.dataTransfer.getData("application/json")) } catch { return }
        if (datos.id === idObjetivo && datos.key === keyDestino) return   // sobre sí mismo

        cambiarSecciones(prev => prev.map(s => {
            // Si viene de otra sección, se saca de allá
            let lista = datos.origen === "seccion" && s.key === datos.key ? s.platos.filter(id => id !== datos.id) : s.platos
            if (s.key !== keyDestino) return { ...s, platos: lista }
            lista = lista.filter(id => id !== datos.id)                     // sin repetidos
            const posicion = idObjetivo === null ? -1 : lista.indexOf(idObjetivo)
            lista.splice(posicion === -1 ? lista.length : posicion, 0, datos.id)
            return { ...s, platos: lista }
        }))
    }

    const quitarPlato = (key, id) =>
        cambiarSecciones(prev => prev.map(s => (s.key === key ? { ...s, platos: s.platos.filter(x => x !== id) } : s)))

    // ── Publicar / limpiar ──
    const abrirPublicar = () => {
        const error = validarMenu(secciones)
        if (error) { setAviso({ tipo: "error", texto: error }); return }
        setModal("publicar")
    }

    const publicar = async () => {
        setProcesando(true)
        try {
            await axios.post(`${API}/api/menu-dia/publicar`, {
                secciones: secciones.map(s => ({ nombre: s.nombre.trim(), platos: s.platos }))
            })
            setMenuActivo(true)
            setAviso({ tipo: "ok", texto: "Menú publicado: ya lo ven clientes y meseros" })
        } catch (err) {
            setAviso({ tipo: "error", texto: err.response?.data?.message || "No se pudo publicar el menú" })
        } finally {
            setProcesando(false)
            setModal(null)
        }
    }

    const limpiar = async () => {
        setProcesando(true)
        try {
            await axios.put(`${API}/api/menu-dia/desactivar`)
            setSecciones([nuevaSeccion("Corriente del día")])
            setMenuActivo(false)
            setAviso({ tipo: "ok", texto: "Menú de hoy retirado" })
        } catch (err) {
            setAviso({ tipo: "error", texto: "No se pudo retirar el menú" })
        } finally {
            setProcesando(false)
            setModal(null)
        }
    }

    if (cargando) return <p className="emp-estado-msg">Cargando menú...</p>
    if (error)    return <p className="emp-estado-msg emp-error">{error}</p>

    return (
        <div className="emp-contenedor">
            <div className="emp-header">
                <h1 className="emp-titulo-pagina">MENÚ HOY</h1>
                <p className="emp-subtitulo">Arrastra los platos de los lados a las secciones del menú</p>
            </div>

            <div className="mb-layout">
                {/* ── Izquierda: las cartas ── */}
                <div className="mb-columna">
                    <h3 className="mb-columna-titulo">Cartas</h3>
                    {cartas.map(c => (
                        <div key={c.id_Categoria} className="mb-grupo">
                            <p className="mb-grupo-titulo">{c.NombreCategoria}</p>
                            {c.platos.map(p => <TarjetaPlato key={p.id_Platos} plato={p} />)}
                        </div>
                    ))}
                </div>

                {/* ── Centro: el menú del día ── */}
                <div className="mb-centro">
                    <div className="mb-centro-header">
                        <h3 className="mb-columna-titulo">Menú del día</h3>
                        {menuActivo && <span className="mb-estado-activo">● Publicado</span>}
                    </div>

                    <div className="mb-agregar">
                        <button onClick={() => cambiarSecciones(prev => [...prev, nuevaSeccion()])}>+ Agregar sección</button>
                    </div>

                    {secciones.length === 0 && <div className="mb-vacio">Agrega una sección para empezar</div>}

                    {secciones.map((s, indice) => (
                        <div
                            key={s.key}
                            className={`mb-seccion ${sobreSeccion === s.key ? "mb-seccion-sobre" : ""}`}
                            onDragOver={e => { e.preventDefault(); setSobreSeccion(s.key) }}
                            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setSobreSeccion(null) }}
                            onDrop={e => soltar(e, s.key)}
                        >
                            <div className="mb-seccion-header">
                                <input
                                    className="mb-input-nombre"
                                    value={s.nombre}
                                    maxLength={60}
                                    placeholder="Nombre de la sección (ej. Comida rápida)"
                                    onChange={e => cambiarSecciones(prev => prev.map(x => (x.key === s.key ? { ...x, nombre: e.target.value } : x)))}
                                />
                                <div className="mb-seccion-acciones">
                                    <button title="Subir" disabled={indice === 0} onClick={() => moverSeccion(indice, -1)}>▲</button>
                                    <button title="Bajar" disabled={indice === secciones.length - 1} onClick={() => moverSeccion(indice, 1)}>▼</button>
                                    <button title="Quitar sección" className="mb-btn-quitar"
                                        onClick={() => cambiarSecciones(prev => prev.filter(x => x.key !== s.key))}>✕</button>
                                </div>
                            </div>

                            {s.platos.length === 0 ? (
                                <p className="mb-seccion-vacia">Arrastra aquí platos y bebidas</p>
                            ) : (
                                s.platos.map(id => {
                                    const plato = platosPorId[id]
                                    return (
                                        <div
                                            key={id}
                                            className="mb-item"
                                            draggable
                                            onDragStart={e => {
                                                e.dataTransfer.setData("application/json", JSON.stringify({ origen: "seccion", key: s.key, id }))
                                                e.dataTransfer.effectAllowed = "move"
                                            }}
                                            onDragOver={e => e.preventDefault()}
                                            onDrop={e => soltar(e, s.key, id)}
                                        >
                                            <span className="mb-item-asa" title="Arrastra para reordenar">⋮⋮</span>
                                            <span className="mb-item-nombre">{plato?.NombrePlato ?? "Plato no disponible"}</span>
                                            <span className="mb-item-precio">{plato ? fmt(plato.Precio) : ""}</span>
                                            <button className="mb-btn-quitar" onClick={() => quitarPlato(s.key, id)}>✕</button>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    ))}

                    {aviso && <p className={`mb-aviso mb-aviso-${aviso.tipo}`}>{aviso.texto}</p>}

                    <div className="mb-botones">
                        <button className="menus-btn-subir" onClick={abrirPublicar}>↑ Publicar menú del día</button>
                        <button className="mb-btn-limpiar" onClick={() => setModal("limpiar")}>Limpiar</button>
                    </div>
                </div>

                {/* ── Derecha: bebidas ── */}
                <div className="mb-columna">
                    <h3 className="mb-columna-titulo">Bebidas</h3>
                    {bebidas.map(p => <TarjetaPlato key={p.id_Platos} plato={p} />)}
                </div>
            </div>

            {modal && (
                <div className="emp-modal-overlay" onClick={() => !procesando && setModal(null)}>
                    <div className="emp-modal emp-modal-confirmar" onClick={e => e.stopPropagation()}>
                        <div className={`emp-modal-header ${modal === "limpiar" ? "emp-modal-header-eliminar" : ""}`}>
                            <h2 className="emp-modal-titulo">{modal === "publicar" ? "PUBLICAR MENÚ" : "RETIRAR MENÚ"}</h2>
                        </div>
                        <div className="emp-modal-body">
                            {modal === "publicar" ? (
                                <ul className="mb-resumen">
                                    {secciones.map(s => (
                                        <li key={s.key}><strong>{s.nombre.trim()}</strong> · {s.platos.length} platos</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="emp-confirmar-texto">El menú de hoy dejará de verse para clientes y meseros. ¿Seguro?</p>
                            )}
                        </div>
                        <div className="emp-modal-footer">
                            <button className="emp-btn-cancelar" disabled={procesando} onClick={() => setModal(null)}>Cancelar</button>
                            {modal === "publicar" ? (
                                <button className="emp-btn-guardar" disabled={procesando} onClick={publicar}>
                                    {procesando ? "Publicando..." : "¡Sí, publicar!"}
                                </button>
                            ) : (
                                <button className="emp-btn-eliminar-modal" disabled={procesando} onClick={limpiar}>
                                    {procesando ? "Retirando..." : "Sí, retirar"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Menus;
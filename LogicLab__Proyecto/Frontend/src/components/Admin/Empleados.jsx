import { useEffect, useState } from "react"
import axios from "axios"
import '../../../Hojas_de_Estilo/Administrador.css';
import '../../App.css';

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5030";

const rolAId = { "Mesero": 1, "Cocinero": 2, "Administrador": 3 }
const idARol  = { 1: "Mesero", 2: "Cocinero", 3: "Administrador" }

function Empleados() {
    const [empleados, setEmpleados] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)
    const [empleadoEditando, setEmpleadoEditando] = useState(null)
    const [formEdicion, setFormEdicion] = useState({ nombre: "", apellido: "", email: "", rol: "", nuevaPassword: "" })
    const [guardando, setGuardando] = useState(false)
    const [mensaje, setMensaje] = useState(null)

    const [empleadoAEliminar, setEmpleadoAEliminar] = useState(null)
    const [eliminando, setEliminando] = useState(false)

    const [rolCreando, setRolCreando] = useState(null)
    const [formNuevo, setFormNuevo] = useState({ nombre: "", apellido: "", email: "", password: "" })
    const [guardandoNuevo, setGuardandoNuevo] = useState(false)
    const [mensajeNuevo, setMensajeNuevo] = useState(null)

    // Solicitudes de registro (empleados nuevos esperando aprobación)
    const [solicitudes, setSolicitudes] = useState([])
    const [rolAprobacion, setRolAprobacion] = useState({})   // { idSolicitud: rolId elegido }
    const [procesandoId, setProcesandoId] = useState(null)
    const [mensajeSolicitudes, setMensajeSolicitudes] = useState(null)
    const [solicitudADescartar, setSolicitudADescartar] = useState(null)

    useEffect(() => {
        obtenerEmpleados()
        obtenerSolicitudes()
    }, [])

    const obtenerEmpleados = async () => {
        try {
            const res = await axios.get(`${API}/api/usuarios/listar`)
            // Sin empleados el backend responde { message } en vez de una lista
            setEmpleados(Array.isArray(res.data) ? res.data : [])
        } catch (err) {
            setError("No se pudo conectar con el servidor")
        } finally {
            setCargando(false)
        }
    }

    const obtenerSolicitudes = async () => {
        try {
            const res = await axios.get(`${API}/api/usuarios/solicitudes`)
            setSolicitudes(Array.isArray(res.data) ? res.data : [])
        } catch (err) {
            setSolicitudes([])
        }
    }

    // Por defecto se aprueba con el rol que pidió el empleado
    const rolElegido = (sol) => rolAprobacion[sol.id_Usuarios_Restaurante] ?? sol.id_Roles_Usuarios

    const aprobarSolicitud = async (sol) => {
        setProcesandoId(sol.id_Usuarios_Restaurante)
        setMensajeSolicitudes(null)
        try {
            await axios.put(`${API}/api/usuarios/solicitudes/${sol.id_Usuarios_Restaurante}/aprobar`, {
                rolId: Number(rolElegido(sol))
            })
            await Promise.all([obtenerSolicitudes(), obtenerEmpleados()])
            setMensajeSolicitudes({ tipo: "ok", texto: `${sol.Nombre} ${sol.Apellido} ya puede iniciar sesión` })
        } catch (err) {
            setMensajeSolicitudes({ tipo: "error", texto: err.response?.data?.message || "Error al aprobar la solicitud" })
        } finally {
            setProcesandoId(null)
        }
    }

    const descartarSolicitud = async () => {
        const sol = solicitudADescartar
        setProcesandoId(sol.id_Usuarios_Restaurante)
        setMensajeSolicitudes(null)
        try {
            await axios.delete(`${API}/api/usuarios/solicitudes/${sol.id_Usuarios_Restaurante}`)
            await obtenerSolicitudes()
        } catch (err) {
            setMensajeSolicitudes({ tipo: "error", texto: err.response?.data?.message || "Error al descartar la solicitud" })
        } finally {
            setProcesandoId(null)
            setSolicitudADescartar(null)
        }
    }

    const abrirCreacion = (rol) => {
        setRolCreando(rol)
        setFormNuevo({ nombre: "", apellido: "", email: "", password: "" })
        setMensajeNuevo(null)
    }

    const cerrarCreacion = () => {
        setRolCreando(null)
        setFormNuevo({ nombre: "", apellido: "", email: "", password: "" })
        setMensajeNuevo(null)
    }

    const crearUsuario = async () => {
        const { nombre, apellido, email, password } = formNuevo
        if (!nombre.trim() || !apellido.trim() || !email.trim() || !password.trim()) {
            setMensajeNuevo({ tipo: "error", texto: "Todos los campos son obligatorios" })
            return
        }
        setGuardandoNuevo(true)
        try {
            await axios.post(`${API}/api/usuarios/registro`, {
                nombre:     nombre.trim(),
                apellido:   apellido.trim(),
                email:      email.trim(),
                password:   password.trim(),
                tipoDocId:  1,
                rolId:      rolAId[rolCreando]
            })
            await obtenerEmpleados()
            setMensajeNuevo({ tipo: "ok", texto: "Usuario creado correctamente" })
            setTimeout(() => cerrarCreacion(), 1400)
        } catch (err) {
            const msg = err.response?.data?.message || "Error al crear el usuario"
            setMensajeNuevo({ tipo: "error", texto: msg })
        } finally {
            setGuardandoNuevo(false)
        }
    }

    const abrirEdicion = (emp) => {
        setEmpleadoEditando(emp)
        setFormEdicion({
            nombre: emp.Nombre,
            apellido: emp.Apellido,
            email: emp.Email,
            rol: idARol[emp.id_Roles_Usuarios] ?? "Mesero",
            nuevaPassword: ""
        })
        setMensaje(null)
    }

    const cerrarEdicion = () => {
        setEmpleadoEditando(null)
        setFormEdicion({ nombre: "", apellido: "", email: "", rol: "", nuevaPassword: "" })
        setMensaje(null)
    }

    const guardarCambios = async () => {
        if (!formEdicion.nombre.trim() || !formEdicion.apellido.trim() || !formEdicion.email.trim()) {
            setMensaje({ tipo: "error", texto: "Nombre, apellido y email son obligatorios" })
            return
        }

        setGuardando(true)
        try {
            const payload = {
                nombre:   formEdicion.nombre.trim(),
                apellido: formEdicion.apellido.trim(),
                email:    formEdicion.email.trim(),
                rolId:    rolAId[formEdicion.rol]
            }

            if (formEdicion.nuevaPassword.trim()) {
                payload.password = formEdicion.nuevaPassword.trim()
            }

            await axios.put(
                `${API}/api/usuarios/actualizar/${empleadoEditando.id_Usuarios_Restaurante}`,
                payload
            )
            await obtenerEmpleados()
            setMensaje({ tipo: "ok", texto: "Empleado actualizado correctamente" })
            setTimeout(() => cerrarEdicion(), 1200)
        } catch (err) {
            const msg = err.response?.data?.message || "Error al guardar los cambios"
            setMensaje({ tipo: "error", texto: msg })
        } finally {
            setGuardando(false)
        }
    }

    const abrirConfirmacion  = (emp) => setEmpleadoAEliminar(emp)
    const cerrarConfirmacion = () => { if (!eliminando) setEmpleadoAEliminar(null) }

    const eliminarEmpleado = async () => {
        setEliminando(true)
        try {
            await axios.delete(`${API}/api/usuarios/eliminar/${empleadoAEliminar.id_Usuarios_Restaurante}`)
            await obtenerEmpleados()
            setEmpleadoAEliminar(null)
        } catch (err) {
            setEmpleadoAEliminar(null)
        } finally {
            setEliminando(false)
        }
    }

    const meseros = empleados.filter(e => e.id_Roles_Usuarios === 1)
    const cocineros = empleados.filter(e => e.id_Roles_Usuarios === 2)
    const administradores = empleados.filter(e => e.id_Roles_Usuarios === 3)

    const GrupoEmpleados = ({ titulo, lista, className, rol }) => (
        <div className={`emp-grupo ${className}`}>
            <h2 className="emp-grupo-titulo">
                {titulo}
                <span className="emp-grupo-count">{lista.length}</span>
                <button className="emp-btn-crear-rol" title={`Crear nuevo ${rol}`}
                    onClick={() => abrirCreacion(rol)}>+</button>
            </h2>

            {lista.length === 0 ? (
                <p className="emp-sin-resultados">Sin empleados en este rol</p>
            ) : (
                <div className="emp-cards-grid">
                    {lista.map(emp => (
                        <div key={emp.id_Usuarios_Restaurante} className="emp-card">
                            <div className="emp-card-avatar">
                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="8" r="4" className="emp-avatar-fill" />
                                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" className="emp-avatar-stroke" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </div>
                            <div className="emp-card-info">
                                <p className="emp-card-nombre">{emp.Nombre} {emp.Apellido}</p>
                                <p className="emp-card-email">{emp.Email}</p>
                                <span className="emp-card-badge">{idARol[emp.id_Roles_Usuarios]}</span>
                            </div>
                            <div className="emp-card-acciones">
                                <button className="emp-btn-editar" onClick={() => abrirEdicion(emp)}>Editar</button>
                                <button className="emp-btn-eliminar" onClick={() => abrirConfirmacion(emp)}>✕</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )

    if (cargando) return <p className="emp-estado-msg">Cargando empleados...</p>
    if (error)    return <p className="emp-estado-msg emp-error">{error}</p>

    return (
        <div className="emp-contenedor">
            <div className="emp-header">
                <h1 className="emp-titulo-pagina">Gestión de Empleados</h1>
                <p className="emp-subtitulo">{empleados.length} empleados registrados</p>
            </div>

            {solicitudes.length > 0 && (
                <div className="emp-grupo grupo-solicitudes">
                    <h2 className="emp-grupo-titulo">
                        SOLICITUDES DE REGISTRO
                        <span className="emp-grupo-count">{solicitudes.length}</span>
                    </h2>

                    {mensajeSolicitudes && (
                        <p className={`emp-modal-mensaje ${mensajeSolicitudes.tipo === "ok" ? "emp-modal-ok" : "emp-modal-err"}`}>
                            {mensajeSolicitudes.texto}
                        </p>
                    )}

                    <div className="emp-cards-grid">
                        {solicitudes.map(sol => (
                            <div key={sol.id_Usuarios_Restaurante} className="emp-card">
                                <div className="emp-card-info">
                                    <p className="emp-card-nombre">{sol.Nombre} {sol.Apellido}</p>
                                    <p className="emp-card-email">{sol.Email}</p>
                                    <p className="emp-card-email">Documento: {sol.Numero_Documento}</p>
                                    <p className="emp-card-email">Solicitada: {String(sol.Fecha_Registro).substring(0, 16)}</p>
                                    <select className="emp-modal-select"
                                        value={rolElegido(sol)}
                                        onChange={e => setRolAprobacion({ ...rolAprobacion, [sol.id_Usuarios_Restaurante]: Number(e.target.value) })}>
                                        <option value={1}>Mesero</option>
                                        <option value={2}>Cocinero</option>
                                    </select>
                                </div>
                                <div className="emp-card-acciones">
                                    <button className="emp-btn-editar"
                                        disabled={procesandoId === sol.id_Usuarios_Restaurante}
                                        onClick={() => aprobarSolicitud(sol)}>
                                        {procesandoId === sol.id_Usuarios_Restaurante ? "..." : "Aprobar"}
                                    </button>
                                    <button className="emp-btn-eliminar" title="Descartar solicitud"
                                        disabled={procesandoId === sol.id_Usuarios_Restaurante}
                                        onClick={() => setSolicitudADescartar(sol)}>✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <GrupoEmpleados titulo="MESEROS" lista={meseros} className="grupo-mesero" rol="Mesero" />
            <GrupoEmpleados titulo="COCINEROS" lista={cocineros} className="grupo-cocinero" rol="Cocinero" />
            <GrupoEmpleados titulo="ADMINISTRADORES"  lista={administradores} className="grupo-admin" rol="Administrador" />

            {rolCreando && (
                <div className="emp-modal-overlay" onClick={cerrarCreacion}>
                    <div className="emp-modal emp-modal-crear" onClick={e => e.stopPropagation()}>
                        <div className={`emp-modal-header emp-modal-header-crear emp-crear-${rolCreando.toLowerCase()}`}>
                            <h2 className="emp-modal-titulo">NUEVO {rolCreando.toUpperCase()}</h2>
                            <p className="emp-modal-subtitulo">Completa los datos del nuevo empleado</p>
                        </div>
                        <div className="emp-modal-body">
                            <label className="emp-modal-label">Nombre:</label>
                            <input className="emp-modal-input" type="text" placeholder="Nombre..."
                                value={formNuevo.nombre} onChange={e => setFormNuevo({ ...formNuevo, nombre: e.target.value })} />

                            <label className="emp-modal-label">Apellido:</label>
                            <input className="emp-modal-input" type="text" placeholder="Apellido..."
                                value={formNuevo.apellido} onChange={e => setFormNuevo({ ...formNuevo, apellido: e.target.value })} />

                            <label className="emp-modal-label">Email:</label>
                            <input className="emp-modal-input" type="email" placeholder="correo@ejemplo.com"
                                value={formNuevo.email} onChange={e => setFormNuevo({ ...formNuevo, email: e.target.value })} />

                            <label className="emp-modal-label">Contraseña:</label>
                            <input className="emp-modal-input" type="password" placeholder="Contraseña segura..."
                                value={formNuevo.password} onChange={e => setFormNuevo({ ...formNuevo, password: e.target.value })} />
                            <p className="emp-modal-hint">Se guardará encriptada automáticamente</p>

                            {mensajeNuevo && (
                                <p className={`emp-modal-mensaje ${mensajeNuevo.tipo === "ok" ? "emp-modal-ok" : "emp-modal-err"}`}>
                                    {mensajeNuevo.texto}
                                </p>
                            )}
                        </div>
                        <div className="emp-modal-footer">
                            <button className="emp-btn-cancelar" onClick={cerrarCreacion} disabled={guardandoNuevo}>Cancelar</button>
                            <button className="emp-btn-guardar" onClick={crearUsuario} disabled={guardandoNuevo}>
                                {guardandoNuevo ? "Creando..." : "Crear Usuario"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {empleadoEditando && (
                <div className="emp-modal-overlay" onClick={cerrarEdicion}>
                    <div className="emp-modal" onClick={e => e.stopPropagation()}>
                        <div className="emp-modal-header">
                            <h2 className="emp-modal-titulo">EDICIÓN</h2>
                            <p className="emp-modal-nombre">{empleadoEditando.Nombre} {empleadoEditando.Apellido}</p>
                        </div>
                        <div className="emp-modal-body">

                            <label className="emp-modal-label">Nombre:</label>
                            <input className="emp-modal-input" type="text"
                                value={formEdicion.nombre}
                                onChange={e => setFormEdicion({ ...formEdicion, nombre: e.target.value })} />

                            <label className="emp-modal-label">Apellido:</label>
                            <input className="emp-modal-input" type="text"
                                value={formEdicion.apellido}
                                onChange={e => setFormEdicion({ ...formEdicion, apellido: e.target.value })} />

                            <label className="emp-modal-label">Email:</label>
                            <input className="emp-modal-input" type="email"
                                value={formEdicion.email}
                                onChange={e => setFormEdicion({ ...formEdicion, email: e.target.value })} />

                            <label className="emp-modal-label">Rol:</label>
                            <select className="emp-modal-select" value={formEdicion.rol}
                                onChange={e => setFormEdicion({ ...formEdicion, rol: e.target.value })}>
                                <option value="Mesero">Mesero</option>
                                <option value="Cocinero">Cocinero</option>
                                <option value="Administrador">Administrador</option>
                            </select>

                            <label className="emp-modal-label">Nueva contraseña (opcional):</label>
                            <input className="emp-modal-input" type="password" placeholder="Dejar vacío para no cambiar"
                                value={formEdicion.nuevaPassword}
                                onChange={e => setFormEdicion({ ...formEdicion, nuevaPassword: e.target.value })} />
                            <p className="emp-modal-hint">Solo completa este campo si deseas cambiar la contraseña</p>

                            {mensaje && (
                                <p className={`emp-modal-mensaje ${mensaje.tipo === "ok" ? "emp-modal-ok" : "emp-modal-err"}`}>
                                    {mensaje.texto}
                                </p>
                            )}
                        </div>
                        <div className="emp-modal-footer">
                            <button className="emp-btn-cancelar" onClick={cerrarEdicion} disabled={guardando}>Cancelar</button>
                            <button className="emp-btn-guardar" onClick={guardarCambios} disabled={guardando}>
                                {guardando ? "Guardando..." : "Guardar Cambios"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {empleadoAEliminar && (
                <div className="emp-modal-overlay" onClick={cerrarConfirmacion}>
                    <div className="emp-modal emp-modal-confirmar" onClick={e => e.stopPropagation()}>
                        <div className="emp-modal-header emp-modal-header-eliminar">
                            <h2 className="emp-modal-titulo">DESACTIVAR EMPLEADO</h2>
                            <p className="emp-modal-nombre">{empleadoAEliminar.Nombre} {empleadoAEliminar.Apellido}</p>
                        </div>
                        <div className="emp-modal-body">
                            <p className="emp-confirmar-texto">
                                ¿Deseas desactivar a <strong>{empleadoAEliminar.Nombre} {empleadoAEliminar.Apellido}</strong>?
                                Ya no podrá iniciar sesión, pero su historial de pedidos se conserva.
                            </p>
                        </div>
                        <div className="emp-modal-footer">
                            <button className="emp-btn-cancelar" onClick={cerrarConfirmacion} disabled={eliminando}>Cancelar</button>
                            <button className="emp-btn-eliminar-modal" onClick={eliminarEmpleado} disabled={eliminando}>
                                {eliminando ? "Desactivando..." : "Sí, desactivar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {solicitudADescartar && (
                <div className="emp-modal-overlay" onClick={() => !procesandoId && setSolicitudADescartar(null)}>
                    <div className="emp-modal emp-modal-confirmar" onClick={e => e.stopPropagation()}>
                        <div className="emp-modal-header emp-modal-header-eliminar">
                            <h2 className="emp-modal-titulo">DESCARTAR SOLICITUD</h2>
                            <p className="emp-modal-nombre">{solicitudADescartar.Nombre} {solicitudADescartar.Apellido}</p>
                        </div>
                        <div className="emp-modal-body">
                            <p className="emp-confirmar-texto">
                                La solicitud se eliminará. Si la persona sí trabaja en el restaurante,
                                tendrá que volver a enviarla o puedes crearla tú desde el botón +.
                            </p>
                        </div>
                        <div className="emp-modal-footer">
                            <button className="emp-btn-cancelar" onClick={() => setSolicitudADescartar(null)} disabled={!!procesandoId}>Cancelar</button>
                            <button className="emp-btn-eliminar-modal" onClick={descartarSolicitud} disabled={!!procesandoId}>
                                {procesandoId ? "Descartando..." : "Sí, descartar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Empleados;
import { useState, useEffect } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import '../../Hojas_de_Estilo/Login.css'
import '../App.css'

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5030"

const FORM_VACIO = {
  nombre: "", apellido: "", email: "", tipoDocId: "",
  numeroDocumento: "", rolId: "", password: "", confirmar: ""
}

// Mismas reglas que valida el backend (userController.js)
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DOC_VALIDO = /^[A-Za-z0-9]{5,20}$/

function SolicitarRegistro() {
  const navigate = useNavigate()
  const [form, setForm] = useState(FORM_VACIO)
  const [tiposDocumento, setTiposDocumento] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [enviada, setEnviada] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  // Solo los tipos de documento activos (Cédula de Ciudadanía y de Extranjería)
  useEffect(() => {
    axios.get(`${API}/api/tipos-documento`)
      .then(res => setTiposDocumento(Array.isArray(res.data) ? res.data : []))
      .catch(() => setMensaje({ tipo: "error", texto: "No se pudieron cargar los tipos de documento" }))
  }, [])

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })

  // Devuelve el primer error encontrado, o null si todo está bien
  const validar = () => {
    const obligatorios = ["nombre", "apellido", "email", "tipoDocId", "numeroDocumento", "rolId", "password"]
    if (obligatorios.some(campo => !String(form[campo]).trim())) return "Todos los campos son obligatorios"
    if (!EMAIL_VALIDO.test(form.email.trim())) return "El correo no tiene un formato válido"
    if (!DOC_VALIDO.test(form.numeroDocumento.trim())) return "El documento debe tener entre 5 y 20 letras o números, sin puntos ni espacios"
    if (form.password.length < 6) return "La contraseña debe tener al menos 6 caracteres"
    if (form.password !== form.confirmar) return "Las contraseñas no coinciden"
    return null
  }

  const enviarSolicitud = async (e) => {
    e.preventDefault()
    const error = validar()
    if (error) {
      setMensaje({ tipo: "error", texto: error })
      return
    }

    setEnviando(true)
    setMensaje(null)
    try {
      const res = await axios.post(`${API}/api/usuarios/solicitud-registro`, {
        nombre:          form.nombre.trim(),
        apellido:        form.apellido.trim(),
        email:           form.email.trim(),
        tipoDocId:       Number(form.tipoDocId),
        numeroDocumento: form.numeroDocumento.trim(),
        rolId:           Number(form.rolId),
        password:        form.password
      })
      setEnviada(true)
      setMensaje({ tipo: "ok", texto: res.data.message })
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.response?.data?.message || "No se pudo conectar con el servidor" })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="login-page-container">
      <div className="login-orb login-orb-red" aria-hidden="true"></div>
      <div className="login-orb login-orb-green" aria-hidden="true"></div>
      <div className="login-orb login-orb-orange" aria-hidden="true"></div>
      <div className="login-orb login-orb-blue" aria-hidden="true"></div>

      <div className="login-content">
        <div className="login-hero">
          <span className="login-eyebrow">Registro de personal · Restaurante</span>
          <h1 className="login-wordmark">MANGATA</h1>
        </div>

        <div className="login-forms-row">
          {enviada ? (
            <div className="login-form-staff login-form-registro">
              <div className="login-card-icon login-card-icon-staff">
                <i className="bi bi-hourglass-split"></i>
              </div>
              <h2 className="login-title-staff">Solicitud enviada</h2>
              <p className="login-card-sub">{mensaje?.texto}</p>
              <button type="button" className="login-button-staff" onClick={() => navigate("/login")}>
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <form className="login-form-staff login-form-registro" onSubmit={enviarSolicitud}>
              <div className="login-card-icon login-card-icon-staff">
                <i className="bi bi-person-plus"></i>
              </div>
              <h2 className="login-title-staff">Solicitar registro</h2>
              <p className="login-card-sub">
                Para empleados nuevos. El administrador debe aprobar tu solicitud antes de que puedas ingresar.
              </p>

              <div className="login-registro-fila">
                <input className="login-input-staff" type="text" placeholder="Nombre"
                  value={form.nombre} onChange={cambiar("nombre")} />
                <input className="login-input-staff" type="text" placeholder="Apellido"
                  value={form.apellido} onChange={cambiar("apellido")} />
              </div>

              <input className="login-input-staff" type="email" placeholder="Correo"
                value={form.email} onChange={cambiar("email")} />

              <div className="login-registro-fila">
                <select className="login-input-staff login-select-staff"
                  value={form.tipoDocId} onChange={cambiar("tipoDocId")}>
                  <option value="">Tipo de documento</option>
                  {tiposDocumento.map(t => (
                    <option key={t.id_Tipo_Documento} value={t.id_Tipo_Documento}>
                      {t.Descripcion_Documento}
                    </option>
                  ))}
                </select>
                <input className="login-input-staff" type="text" placeholder="Número de documento"
                  value={form.numeroDocumento} onChange={cambiar("numeroDocumento")} />
              </div>

              <select className="login-input-staff login-select-staff"
                value={form.rolId} onChange={cambiar("rolId")}>
                <option value="">¿En qué cargo vas a trabajar?</option>
                <option value="1">Mesero</option>
                <option value="2">Cocinero</option>
              </select>

              <input className="login-input-staff" type="password" placeholder="Contraseña (mínimo 6 caracteres)"
                value={form.password} onChange={cambiar("password")} />
              <input className="login-input-staff" type="password" placeholder="Confirmar contraseña"
                value={form.confirmar} onChange={cambiar("confirmar")} />

              {mensaje && (
                <p className={mensaje.tipo === "ok" ? "login-msg-ok" : "login-msg-error"}>{mensaje.texto}</p>
              )}

              <button type="submit" className="login-button-staff" disabled={enviando}>
                {enviando ? "Enviando..." : "Enviar solicitud"}
              </button>

              <p className="login-forgot-pass" onClick={() => navigate("/login")}>
                Ya tengo cuenta, volver al inicio de sesión
              </p>
            </form>
          )}
        </div>

        <p className="login-footer">Restaurante Mangata</p>
      </div>
    </div>
  )
}

export default SolicitarRegistro
import { useState, useEffect } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import '../../Hojas_de_Estilo/Login.css'
import '../../Hojas_de_Estilo/RecuperarPassword.css'

const API = "http://localhost:5030"
const SEGUNDOS_REENVIO = 60

function RecuperarPassword() {
  const navigate = useNavigate()

  // 1 = pedir el código · 2 = código + contraseña nueva · 3 = listo
  const [paso, setPaso] = useState(1)
  const [email, setEmail] = useState("")
  const [form, setForm] = useState({ codigo: "", nueva: "", confirmar: "" })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [espera, setEspera] = useState(0)

  // Cuenta regresiva para poder pedir otro código
  useEffect(() => {
    if (espera <= 0) return
    const t = setTimeout(() => setEspera(e => e - 1), 1000)
    return () => clearTimeout(t)
  }, [espera])

  const solicitarCodigo = async (e) => {
    e?.preventDefault()
    if (!email.trim()) return setError("Ingresa tu correo")

    setCargando(true)
    setError("")
    try {
      const res = await axios.post(`${API}/api/usuarios/solicitar-codigo`, { email: email.trim() })
      setMensaje(res.data.message)
      setPaso(2)
      setEspera(SEGUNDOS_REENVIO)
    } catch (err) {
      setError(err.response?.data?.message || "Error al conectar con el servidor")
    } finally {
      setCargando(false)
    }
  }

  const restablecer = async (e) => {
    e.preventDefault()
    setError("")
    if (!/^\d{6}$/.test(form.codigo)) return setError("El código tiene 6 dígitos")
    if (form.nueva.length < 6) return setError("La contraseña debe tener al menos 6 caracteres")
    if (form.nueva !== form.confirmar) return setError("Las contraseñas no coinciden")

    setCargando(true)
    try {
      const res = await axios.post(`${API}/api/usuarios/restablecer-password`, {
        email: email.trim(),
        codigo: form.codigo,
        nuevaPassword: form.nueva
      })
      setMensaje(res.data.message)
      setPaso(3)
    } catch (err) {
      setError(err.response?.data?.message || "Error al conectar con el servidor")
    } finally {
      setCargando(false)
    }
  }

  const cambiarCorreo = () => {
    setPaso(1)
    setForm({ codigo: "", nueva: "", confirmar: "" })
    setError("")
    setMensaje("")
  }

  return (
    <div className='login-page-container'>
      <div className="login-orb login-orb-red" aria-hidden="true"></div>
      <div className="login-orb login-orb-green" aria-hidden="true"></div>
      <div className="login-orb login-orb-orange" aria-hidden="true"></div>
      <div className="login-orb login-orb-blue" aria-hidden="true"></div>

      <div className="login-content">
        <div className="login-hero">
          <span className="login-eyebrow">Menú digital · Restaurante</span>
          <h1 className="login-wordmark">MANGATA</h1>
        </div>

        <div className="login-forms-row">

          {paso === 1 && (
            <form className="login-form-staff" onSubmit={solicitarCodigo}>
              <div className="login-card-icon login-card-icon-staff">
                <i className="bi bi-envelope-at"></i>
              </div>
              <h2 className="login-title-staff">Recuperar contraseña</h2>
              <p className="login-card-sub">Te enviaremos un código de 6 dígitos a tu correo</p>

              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input-staff"
                autoFocus
              />

              {error && <p className="recuperar-mensaje recuperar-error">{error}</p>}

              <button type="submit" className="login-button-staff" disabled={cargando}>
                {cargando ? "Enviando..." : "Enviar código"}
              </button>
              <p className="login-forgot-pass" onClick={() => navigate("/login")}>← Volver al inicio de sesión</p>
            </form>
          )}

          {paso === 2 && (
            <form className="login-form-staff" onSubmit={restablecer}>
              <div className="login-card-icon login-card-icon-staff">
                <i className="bi bi-shield-lock"></i>
              </div>
              <h2 className="login-title-staff">Verifica tu identidad</h2>
              <p className="login-card-sub">Escribe el código enviado a <strong>{email}</strong> y elige tu nueva contraseña</p>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="Código de 6 dígitos"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value.replace(/\D/g, "") })}
                className="login-input-staff recuperar-input-codigo"
                autoFocus
              />
              <input
                type="password"
                placeholder="Nueva contraseña"
                value={form.nueva}
                onChange={(e) => setForm({ ...form, nueva: e.target.value })}
                className="login-input-staff"
              />
              <input
                type="password"
                placeholder="Confirmar contraseña"
                value={form.confirmar}
                onChange={(e) => setForm({ ...form, confirmar: e.target.value })}
                className="login-input-staff"
              />

              {error && <p className="recuperar-mensaje recuperar-error">{error}</p>}
              {!error && mensaje && <p className="recuperar-mensaje recuperar-ok">{mensaje}</p>}

              <button type="submit" className="login-button-staff" disabled={cargando}>
                {cargando ? "Guardando..." : "Cambiar contraseña"}
              </button>

              <div className="recuperar-acciones">
                <button type="button" className="recuperar-link" onClick={solicitarCodigo} disabled={espera > 0 || cargando}>
                  {espera > 0 ? `Reenviar código (${espera}s)` : "Reenviar código"}
                </button>
                <button type="button" className="recuperar-link" onClick={cambiarCorreo}>Cambiar correo</button>
              </div>
            </form>
          )}

          {paso === 3 && (
            <div className="login-form-staff">
              <div className="login-card-icon login-card-icon-client">
                <i className="bi bi-check2-circle"></i>
              </div>
              <h2 className="login-title-staff">¡Listo!</h2>
              <p className="login-card-sub">{mensaje}. Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <button type="button" className="login-button-staff" onClick={() => navigate("/login")}>
                Ir al inicio de sesión
              </button>
            </div>
          )}

        </div>

        <p className="login-footer">Restaurante Mangata</p>
      </div>
    </div>
  )
}

export default RecuperarPassword

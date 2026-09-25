import { useState, useEffect } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import '../../Hojas_de_Estilo/Login.css'; 
import '../App.css';

const API = "http://localhost:5030"

function Login({ setUsuario }) {
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState({ user: "", pass: "" })
  const [mesas, setMesas] = useState([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await axios.post(`${API}/api/usuarios/login`, {
        email: credentials.user,
        password: credentials.pass
      })

      const usuarioValido = res.data.usuario
      sessionStorage.setItem("usuario", JSON.stringify(usuarioValido))
      localStorage.setItem("idMesero", usuarioValido.id)  
      setUsuario(usuarioValido)

      sessionStorage.setItem("token", res.data.token)
      // Configuramos el header aquí también, porque el login ocurre sin
      // recargar la página — el módulo App.jsx ya se evaluó antes de esto.
      axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`

      if(usuarioValido.rolId === 1) {
        navigate("/mesero")
      } else if (usuarioValido.rolId === 2) {
        navigate("/cocinero")
      } else if (usuarioValido.rolId === 3) {
        navigate("/admin")
      } else {
        alert("Rol no permitido")
      }
    } catch (error) {
      if (error.response?.status === 401) {
        alert("Email o contraseña incorrectos")
      } else {
        alert("Error al conectar con el servidor")
      }
    }
  }

  useEffect(() => {
    const obtenerMesas = async () => {
      try {
        const res = await axios.get("http://localhost:5030/api/mesas/listar");
        setMesas(res.data);
      } catch (error) {
        console.error("Error al traer mesas:", error);
      }
    };
    obtenerMesas();
  }, []);

const handleIngresoCliente = async (e) => {
  e.preventDefault();
  if (!mesaSeleccionada) {
    alert("Por favor, selecciona una mesa primero");
    return;
  }

  try {
    const mesaEncontrada = mesas.find(
      m => m.Numero_mesa.toString() === mesaSeleccionada.toString()
    );

    if (mesaEncontrada) {
      await axios.put(
        `http://localhost:5030/api/mesas/estado/${mesaEncontrada.id_Mesas}`, 
        { estado: "ocupada" }
      );
      
      localStorage.setItem("mesaSeleccionada", mesaSeleccionada);
      navigate("/vistacliente");
    } else {
      alert("No se encontró la información de la mesa seleccionada.");
    }
  } catch (error) {
    console.error("Error al actualizar la mesa:", error);
    alert("No se pudo conectar con el servidor para asignar la mesa. ¡Revisa que tu backend esté encendido!");
  }
};
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

          <form className='login-form-staff' onSubmit={handleSubmit}>
            <div className="login-card-icon login-card-icon-staff">
              <i className="bi bi-shop"></i>
            </div>
            <h2 className='login-title-staff'>Inicio de Sesión</h2>
            <p className="login-card-sub">Acceso para meseros, cocina y administración</p>

            <input
              type="text"
              placeholder="Nombre de usuario"
              value={credentials.user}
              onChange={(e) => setCredentials({...credentials, user: e.target.value})}
              className="login-input-staff"
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={credentials.pass}
              onChange={(e) => setCredentials({...credentials, pass: e.target.value})}
              className="login-input-staff"
            />

            <button type="submit" className="login-button-staff">Ingresar</button>

            <p className="login-forgot-pass" onClick={() => navigate("/recuperar-password")}>
              ¿Olvidaste tu contraseña?
            </p>
          </form>

          <form className="login-form-client" onSubmit={handleIngresoCliente}>
            <div className="login-card-icon login-card-icon-client">
              <i className="bi bi-cup-hot-fill"></i>
            </div>
            <h2 className="login-title-client">Menú Digital</h2>
            <p className="login-card-sub">Elige tu mesa y ordena directo desde aquí</p>

            <select
              value={mesaSeleccionada}
              onChange={(e) => setMesaSeleccionada(e.target.value)}
              className="login-select-client"
            >
              <option value="">— Elige tu mesa —</option>
              {mesas.map((m) => (
                <option
                  key={m.id_Mesas}       
                  value={m.Numero_mesa}  
                  disabled={m.Estado?.toLowerCase() === "ocupada"} 
                >
                  Mesa #{m.Numero_mesa}
                  {
                    m.Estado?.toLowerCase() === "ocupada"
                    ? " (Ocupada)"
                    : ""
                  }
                </option>
              ))}
            </select>

            <button type="submit" className="login-button-client">
              Ver Menú y Ordenar
            </button>
          </form>

        </div>

        <p className="login-footer">Restaurante Mangata</p>
      </div>
    </div>
  )
}

export default Login;
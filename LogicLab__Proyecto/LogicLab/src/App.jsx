import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import axios from "axios"
import Login from './components/Login'
import VistaCliente from './components/VistaCliente'
import Panel_Mesero, { LayoutMesero } from './components/Panel_Mesero'
import Panel_Cocinero from './components/Panel_Cocinero'
import Panel_Administrador, { LayoutAdmin } from './components/Admin/Panel_Administrador'
import Empleados from './components/Admin/Empleados'
import Platos from './components/Admin/Platos'
import Menus from './components/Admin/Menus'
import Reportes from './components/Admin/reportes'
import MenuDia from './components/MenuDia'
import MensajeCliente from './components/MensajeCliente'
import MensajeCocina from './components/MensajeCocina'
import RutaProtegida from './components/RutaProtegida'

const tokenGuardado = sessionStorage.getItem("token")
if (tokenGuardado) {
  axios.defaults.headers.common["Authorization"] = `Bearer ${tokenGuardado}`
}

function App() {
  const [usuario, setUsuario] = useState(null)

  useEffect(() => {
    const usuarioGuardado = JSON.parse(sessionStorage.getItem("usuario") ?? "null")
    if (usuarioGuardado) setUsuario(usuarioGuardado)
  }, [])

  return (
    <Routes>

      {/* ── Rutas públicas ── */}
      <Route path="/login"       element={<Login setUsuario={setUsuario} />} />

      {/* ── Redireccion raíz ── */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* ── Vista cliente (solo verifica que haya sesión de mesa, no de empleado) ── */}
      <Route path="/vistacliente" element={<VistaCliente usuario={usuario} />} />

      {/* ── Mesero (rolId 1) ── */}
      <Route path="/mesero" element={
        <RutaProtegida roles={[1]}>
          <Panel_Mesero usuario={usuario} />
        </RutaProtegida>
      }/>

      <Route path="/menu" element={
        <RutaProtegida roles={[1]}>
          <LayoutMesero paginaActual="menu">
            <MenuDia />
          </LayoutMesero>
        </RutaProtegida>
      }/>

      <Route path="/mensajecliente" element={
        <RutaProtegida roles={[1]}>
          <LayoutMesero paginaActual="mensajecliente">
            <MensajeCliente />
          </LayoutMesero>
        </RutaProtegida>
      }/>

      <Route path="/mensajecocina" element={
        <RutaProtegida roles={[1]}>
          <LayoutMesero paginaActual="mensajecocina">
            <MensajeCocina />
          </LayoutMesero>
        </RutaProtegida>
      }/>

      {/* ── Cocinero (rolId 2) ── */}
      <Route path="/cocinero" element={
        <RutaProtegida roles={[2]}>
          <Panel_Cocinero />
        </RutaProtegida>
      }/>

      {/* ── Admin (rolId 3) ── */}
      <Route path="/admin" element={
        <RutaProtegida roles={[3]}>
          <Panel_Administrador usuario={usuario} />
        </RutaProtegida>
      }/>

      <Route path="/empleados" element={
        <RutaProtegida roles={[3]}>
          <LayoutAdmin usuario={usuario} paginaActual="empleados">
            <Empleados />
          </LayoutAdmin>
        </RutaProtegida>
      }/>

      <Route path="/platos" element={
        <RutaProtegida roles={[3]}>
          <LayoutAdmin usuario={usuario} paginaActual="platos">
            <Platos />
          </LayoutAdmin>
        </RutaProtegida>
      }/>

      <Route path="/menus" element={
        <RutaProtegida roles={[3]}>
          <LayoutAdmin usuario={usuario} paginaActual="menus">
            <Menus />
          </LayoutAdmin>
        </RutaProtegida>
      }/>

      <Route path="/reportes" element={
        <RutaProtegida roles={[3]}>
          <LayoutAdmin usuario={usuario} paginaActual="reportes">
            <Reportes />
          </LayoutAdmin>
        </RutaProtegida>
      }/>

      {/* ── Cualquier ruta desconocida → login ── */}
      <Route path="*" element={<Navigate to="/login" replace />} />

    </Routes>
  )
}

export default App
import { Navigate } from "react-router-dom"

function RutaProtegida({ children, roles }) {
  const usuario = JSON.parse(sessionStorage.getItem("usuario") ?? "null")

  // Sin sesión → siempre al login
  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(usuario.rolId)) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default RutaProtegida
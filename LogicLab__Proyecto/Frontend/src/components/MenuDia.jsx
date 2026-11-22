import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom"
import axios from "axios"
import '../App.css';
import '../../Hojas_de_Estilo/MenuDia.css';

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5030";

const IMG_CATEGORIA = {
  "1": "/CartaCorriente.png",
  "2": "/CartaComidaRapida.png",
  "3": "/CartaEspecial.png",
  "4": "/CartaBebidas.png",
}

// Foto real del plato si el admin ya subió una (HU05); si no, cae a la
// imagen genérica de su categoría.
const urlImagenPlato = (plato) => {
  if (plato.ImagenUrl) return `${API}${plato.ImagenUrl}`;
  return IMG_CATEGORIA[String(plato.id_Categoria)] ?? "/CartaCorriente.png";
}

function MenuDia() {
  const navigate = useNavigate()
  // Menú de hoy por secciones, en el orden que armó el admin
  const [secciones, setSecciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarMenu = async () => {
      try {
        const res = await axios.get(`${API}/api/menu-dia/hoy`);
        setSecciones(Array.isArray(res.data?.secciones) ? res.data.secciones : []);
      } catch (error) {
        console.error("Error cargando el menú del día:", error);
      } finally {
        setCargando(false);
      }
    };
    cargarMenu();
  }, []);

  const totalPlatos = secciones.reduce((n, s) => n + s.platos.length, 0);

  const formatPrecio = (precio) => `$${Number(precio).toLocaleString("es-CO")}`;

  const hoy = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });

  if (cargando) {
    return (
      <div className="menu-container">
        <p style={{ color: "#ccc", marginTop: "4rem" }}>Cargando menú...</p>
      </div>
    );
  }

  return (
    <div className="menu-container">
      <h2 className="menu-title">MENÚ DEL DÍA</h2>
      <span className="menu-fecha-badge">{hoy}</span>

      {secciones.length === 0 ? (
        <div className="menu-vacio">
          <p className="menu-vacio-titulo">No hay menú disponible hoy</p>
          <p className="menu-vacio-subtitulo">El administrador aún no ha armado el menú del día.</p>
        </div>
      ) : (
        <div className="menu-dia-contenido">

          {secciones.map(seccion => (
            <div key={seccion.id_Seccion} className="menu-seccion">
              <h3 className="menu-seccion-titulo">{seccion.Nombre}</h3>
              <div className="menu-cards-grid">
                {seccion.platos.map(plato => (
                  <div key={plato.id_Platos} className="menu-plato-card">
                    <img
                      src={urlImagenPlato(plato)}
                      alt={plato.NombrePlato}
                      className="menu-plato-img"
                    />
                    <div className="menu-plato-info">
                      <p className="menu-plato-nombre">{plato.NombrePlato}</p>
                      <p className="menu-plato-desc">{plato.Descripcion}</p>
                      <p className="menu-plato-precio">
                        {plato.Disponible === "Agotado" ? "Agotado" : formatPrecio(plato.Precio)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Resumen */}
          <div className="menu-resumen">
            <div className="menu-resumen-item">
              <span className="menu-resumen-num">{secciones.length}</span>
              <span className="menu-resumen-label">Secciones</span>
            </div>
            <div className="menu-resumen-item">
              <span className="menu-resumen-num">{totalPlatos}</span>
              <span className="menu-resumen-label">Platos</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default MenuDia;
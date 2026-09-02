import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom"
import '../App.css';
import '../../Hojas_de_Estilo/MenuDia.css';

const IMG_CATEGORIA = {
  "1": "/CartaCorriente.png",
  "2": "/CartaComidaRapida.png",
  "3": "/CartaEspecial.png",
  "4": "/CartaBebidas.png",
}

function MenuDia() {
  const navigate = useNavigate()
  const [menuDelDia, setMenuDelDia] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const menuGuardado = localStorage.getItem("menuDelDia");
    if (menuGuardado) {
      setMenuDelDia(JSON.parse(menuGuardado));
    }
    setCargando(false);
  }, []);

  const menuPlatos = menuDelDia.filter(p => p.CategoriaId !== "4");
  const menuBebidas = menuDelDia.filter(p => p.CategoriaId === "4");

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

      {menuDelDia.length === 0 ? (
        <div className="menu-vacio">
          <p className="menu-vacio-titulo">No hay menú disponible hoy</p>
          <p className="menu-vacio-subtitulo">El administrador aún no ha armado el menú del día.</p>
        </div>
      ) : (
        <div className="menu-dia-contenido">

          {menuPlatos.length > 0 && (
            <div className="menu-seccion">
              <h3 className="menu-seccion-titulo">Platos</h3>
              <div className="menu-cards-grid">
                {menuPlatos.map((plato, i) => (
                  <div key={i} className="menu-plato-card">
                    <img
                      src={IMG_CATEGORIA[plato.CategoriaId] ?? "/CartaCorriente.png"}
                      alt={plato.NombrePlato}
                      className="menu-plato-img"
                    />
                    <div className="menu-plato-info">
                      <p className="menu-plato-nombre">{plato.NombrePlato}</p>
                      <p className="menu-plato-desc">{plato.Descripcion}</p>
                      <p className="menu-plato-precio">{formatPrecio(plato.Precio)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {menuBebidas.length > 0 && (
            <div className="menu-seccion">
              <h3 className="menu-seccion-titulo">Bebidas</h3>
              <div className="menu-cards-grid">
                {menuBebidas.map((plato, i) => (
                  <div key={i} className="menu-plato-card">
                    <img
                      src={IMG_CATEGORIA["4"]}
                      alt={plato.NombrePlato}
                      className="menu-plato-img"
                    />
                    <div className="menu-plato-info">
                      <p className="menu-plato-nombre">{plato.NombrePlato}</p>
                      <p className="menu-plato-desc">{plato.Descripcion}</p>
                      <p className="menu-plato-precio">{formatPrecio(plato.Precio)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resumen */}
          <div className="menu-resumen">
            <div className="menu-resumen-item">
              <span className="menu-resumen-num">{menuPlatos.length}</span>
              <span className="menu-resumen-label">Platos</span>
            </div>
            <div className="menu-resumen-item">
              <span className="menu-resumen-num">{menuBebidas.length}</span>
              <span className="menu-resumen-label">Bebidas</span>
            </div>
            <div className="menu-resumen-item">
              <span className="menu-resumen-num">{menuDelDia.length}</span>
              <span className="menu-resumen-label">Total</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default MenuDia;
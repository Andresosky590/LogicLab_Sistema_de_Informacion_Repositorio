import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"
import "../../Hojas_de_Estilo/MensajeCocina.css";
import "../App.css";
import { inicializarAudio, reproducirNotificacion } from "./utils/audioHelper";

const API = "http://localhost:5030";

function MensajeCocina({ usuario}) {
  const navigate = useNavigate()
  const [pedidosListos, setPedidosListos] = useState([]);
  const [idsRecientes, setIdsRecientes] = useState(new Set());

  // Mismo mecanismo que ya usa Panel_Cocinero.jsx para detectar
  // pedidos nuevos: guardamos qué ids ya se mostraron para poder
  // distinguir "esto ya estaba" de "esto acaba de llegar" en cada
  // vuelta del polling. En la primera carga no se suena nada — esos
  // pedidos ya estaban listos antes de abrir la pantalla.
  const idsAnterioresRef = useRef(null)
  const primeraCargaRef = useRef(true)

  if (!usuario) {
    const usuarioGuardado = JSON.parse(
      sessionStorage.getItem("usuario")
    );

    if (usuarioGuardado) {
      usuario = usuarioGuardado;
    }
  }

  useEffect(() => {
    inicializarAudio();
    cargarNotificacionesCocina();
    // BUGFIX: antes esta pantalla solo cargaba una vez al entrar — si
    // el mesero no la volvía a abrir a mano, nunca se enteraba de que
    // cocina marcó un pedido como listo. Ahora hace polling cada 4s,
    // igual que la cola de cocina.
    const iv = setInterval(cargarNotificacionesCocina, 4000)
    return () => clearInterval(iv)
  }, []);

  const cargarNotificacionesCocina = async () => {
    try {

      const response = await axios.get(
        `${API}/api/pedidos/estado/listo`
      );

      const pedidos = response.data.map(pedido => {

        const platos = pedido.detalles.filter(
          d => Number(d.id_Categoria) !== 4
        );

        const bebidas = pedido.detalles.filter(
          d => Number(d.id_Categoria) === 4
        );

        return {
          ...pedido,
          platos,
          bebidas
        };
      });

      if (primeraCargaRef.current) {
        idsAnterioresRef.current = new Set(pedidos.map(p => p.id_Pedidos))
        primeraCargaRef.current = false
      } else {
        const idsNuevos = pedidos
          .map(p => p.id_Pedidos)
          .filter(id => !idsAnterioresRef.current.has(id))

        if (idsNuevos.length > 0) {
          reproducirNotificacion()
          setIdsRecientes(new Set(idsNuevos))
          setTimeout(() => setIdsRecientes(new Set()), 12000)
        }

        idsAnterioresRef.current = new Set(pedidos.map(p => p.id_Pedidos))
      }

      setPedidosListos(pedidos);

    } catch (error) {
      console.error(
        "Error cargando pedidos listos:",
        error
      );
    }
  };

  const entregarPedido = async (idPedido) => {
    try {

      await axios.put(
        `${API}/api/pedidos/estado/${idPedido}`,
        {
          estado: "entregado"
        }
      );

      alert("¡Pedido entregado en mesa!");

      await cargarNotificacionesCocina();

    } catch (error) {
      console.error(
        "Error al entregar pedido:",
        error
      );
    }
  };

  return (
    <div className="mco-container">

      <header className="mco-header">

        <div className="mco-header-center">

          <h1 className="mco-titulo">
            Avisos de Cocina
          </h1>

          <p className="mco-mesero">
            Mesero: {usuario?.nombre}
          </p>

          <div className="mco-titulo-linea"></div>

        </div>

      </header>

      <div className="mco-lista">

        {pedidosListos.length === 0 ? (

          <div className="mco-vacio">
            <p>
              No hay pedidos listos por entregar.
            </p>
          </div>

        ) : (

          pedidosListos.map(pedido => (

            <div
              key={pedido.id_Pedidos}
              className={`mco-card ${idsRecientes.has(pedido.id_Pedidos) ? "mco-card-reciente" : ""}`}
            >

              <div className="mco-card-header">

                <span className="mco-badge-mesa">
                  MESA {pedido.Numero_mesa}
                </span>

                <span className="mco-badge-listo">
                  ¡LISTO!
                </span>

                {idsRecientes.has(pedido.id_Pedidos) && (
                  <span className="mco-badge-nuevo">
                    NUEVO
                  </span>
                )}

                <span className="mco-total">
                  $
                  {Number(
                    pedido.TotalPagar
                  ).toLocaleString("es-CO")}
                </span>

              </div>

              <div className="mco-card-body">

                {pedido.platos.length > 0 && (

                  <div className="mco-grupo">

                    <p className="mco-grupo-label">
                      Platos
                    </p>

                    {pedido.platos.map((d, i) => (

                      <div
                        key={i}
                        className="mco-detalle-item"
                      >

                        <div className="mco-detalle-info">

                          <span className="mco-detalle-nombre">
                            {d.CantidadPedido}x {d.NombrePlato}
                          </span>

                          {d.NotasEspeciales && (
                            <span className="mco-detalle-nota">
                              {d.NotasEspeciales}
                            </span>
                          )}

                        </div>

                        <span className="mco-detalle-precio">
                          $
                          {Number(
                            d.PrecioFinal
                          ).toLocaleString("es-CO")}
                        </span>

                      </div>

                    ))}

                  </div>

                )}

                {pedido.bebidas.length > 0 && (

                  <div className="mco-grupo">

                    <p className="mco-grupo-label">
                      Bebidas
                    </p>

                    {pedido.bebidas.map((d, i) => (

                      <div
                        key={i}
                        className="mco-detalle-item"
                      >

                        <div className="mco-detalle-info">

                          <span className="mco-detalle-nombre">
                            {d.CantidadPedido}x {d.NombrePlato}
                          </span>

                          {d.NotasEspeciales && (
                            <span className="mco-detalle-nota">
                              {d.NotasEspeciales}
                            </span>
                          )}

                        </div>

                        <span className="mco-detalle-precio">
                          $
                          {Number(
                            d.PrecioFinal
                          ).toLocaleString("es-CO")}
                        </span>

                      </div>

                    ))}

                  </div>

                )}

              </div>

              <div className="mco-card-footer">

                <button
                  className="mco-btn-entregar"
                  onClick={() =>
                    entregarPedido(
                      pedido.id_Pedidos
                    )
                  }
                >
                  Confirmar Entrega en Mesa
                </button>

              </div>

            </div>

          ))

        )}

      </div>
    </div>
  );
}

export default MensajeCocina;
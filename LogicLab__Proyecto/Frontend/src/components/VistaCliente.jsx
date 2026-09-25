import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import "../../Hojas_de_Estilo/Cliente.css";
import "../App.css";
import {
  inicializarAudio,
  reproducirNotificacion,
} from "./utils/audioHelper";

const API = "http://localhost:5030";

const IMG_CATEGORIA = {
  "1": "/CartaCorriente.png",
  "2": "/CartaComidaRapida.png",
  "3": "/CartaEspecial.png",
  "4": "/CartaBebidas.png",
};

// Foto real del plato si el admin ya subió una (HU05); si no, cae a la
// imagen genérica de su categoría. Mismo criterio que ya usa
// Admin/Platos.jsx (urlImagen) — antes esta vista lo ignoraba siempre.
const urlImagenPlato = (plato) => {
  if (plato.ImagenUrl) return `${API}${plato.ImagenUrl}`;
  return (
    IMG_CATEGORIA[String(plato.id_Categoria)] ?? "/CartaCorriente.png"
  );
};

const TarjetaPlato = ({
  plato,
  agregado,
  expandida,
  cantidad,
  peticion,
  onTogglePlato,
  onCambiarCantidad,
  onToggleCarrito,
  onCambiarPeticion,
}) => {
  return (
    <div
      className={`vc-tarjeta ${
        agregado ? "vc-tarjeta-agregada" : ""
      }`}
    >
      <div
        className="vc-tarjeta-fila"
        onClick={() => onTogglePlato(plato)}
      >
        <div className="vc-tarjeta-img-wrap">
          <img
            src={urlImagenPlato(plato)}
            alt={plato.NombrePlato}
            className="vc-tarjeta-img"
          />
        </div>

        <div className="vc-tarjeta-body">
          <p className="vc-tarjeta-nombre">
            {plato.NombrePlato}
          </p>

          <p className="vc-tarjeta-desc">
            {plato.Descripcion}
          </p>

          <p className="vc-tarjeta-precio">
            ${Number(plato.Precio).toLocaleString("es-CO")}
          </p>

          <div className="vc-tarjeta-bottom">
            <div
              className="vc-tarjeta-cantidad"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="vc-cant-btn"
                onClick={() =>
                  onCambiarCantidad(plato.id_Platos, -1)
                }
              >
                −
              </button>

              <span className="vc-cant-num">
                {cantidad}
              </span>

              <button
                className="vc-cant-btn"
                onClick={() =>
                  onCambiarCantidad(plato.id_Platos, 1)
                }
              >
                +
              </button>
            </div>

            <button
              className={`vc-tarjeta-btn ${
                agregado ? "vc-tarjeta-btn-quitar" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleCarrito(plato);
              }}
            >
              {agregado ? "✕" : "+ Agregar al pedido"}
            </button>
          </div>
        </div>
      </div>

      {expandida && (
        <div
          className="vc-tarjeta-peticion-wrap"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            className="vc-tarjeta-peticion-input"
            type="text"
            placeholder="Peticiones: Ej: sin cebolla..."
            value={peticion}
            onChange={(e) =>
              onCambiarPeticion(
                plato.id_Platos,
                e.target.value
              )
            }
          />
        </div>
      )}
    </div>
  );
};

function VistaCliente() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuDelDia, setMenuDelDia] = useState([]);
  const [mesaActiva, setMesaActiva] = useState("");
  const [idMesaActiva, setIdMesaActiva] = useState(null);

  const [cantidades, setCantidades] = useState({});
  const [peticiones, setPeticiones] = useState({});
  const [carrito, setCarrito] = useState([]);

  const [enviando, setEnviando] = useState(false);
  const [platoAbierto, setPlatoAbierto] = useState(null);

  const [pedidoActivo, setPedidoActivo] = useState(null);

  // El pedido que YA se entregó, mientras el cliente no haya decidido
  // "salir" o "ver el menú de nuevo" — dispara la pantalla de cierre
  // (pagar si falta, gracias, PQRSF, salir). Solo se activa para el
  // MISMO pedido que esta sesión venía siguiendo como pedidoActivo,
  // nunca para uno viejo de un cliente anterior en la mesa.
  const [pedidoRecienEntregado, setPedidoRecienEntregado] = useState(null);

  const [carritoAbierto, setCarritoAbierto] =
    useState(false);

  /*
   * =========================================================
   * ESTADOS DE LA PASARELA DE PAGO
   * =========================================================
   */

  const [pantallaPago, setPantallaPago] = useState(false);

  const [idPedidoActual, setIdPedidoActual] =
    useState(null);

  const [metodosPago, setMetodosPago] = useState([]);

  const [metodoSeleccionado, setMetodoSeleccionado] =
    useState(null);

  /*
   * Datos capturados en el formulario de pago.
   *
   * Su forma cambia según el método (Nequi/Daviplata,
   * PSE o Tarjeta), por eso se maneja como un objeto
   * libre que se limpia cada vez que cambia el método.
   */
  const [datosPago, setDatosPago] = useState({});

  const [resultadoPago, setResultadoPago] =
    useState(null);

  /*
   * Motivo puntual del rechazo (viene del backend:
   * celular inválido, tarjeta vencida, CVV incorrecto...).
   */
  const [mensajeRechazo, setMensajeRechazo] =
    useState("");

  const [simulando, setSimulando] = useState(false);

  /*
   * Monto real del pedido que se está pagando desde la pasarela.
   * NO se puede usar `totalPedido` (el que sale del carrito) porque
   * en este flujo el pedido ya existe y el carrito ya está vacío —
   * por eso la pantalla de pago mostraba siempre $0.
   */
  const [totalPagoActual, setTotalPagoActual] = useState(0);

  /*
   * Este ref evita que una consulta del polling que ya estaba
   * ejecutándose cambie la pantalla mientras estamos pagando.
   */
  const pantallaPagoRef = useRef(false);

  /*
   * También utilizamos un ref para recordar el pedido que se
   * está pagando y evitar respuestas antiguas.
   */
  const pedidoPagoRef = useRef(null);

  /*
   * Cuando se paga desde "¡Tu pedido ya llegó!" (pagarPedidoEntregado)
   * hay que salir de ese return temprano para que se vea la pasarela,
   * así que `pedidoRecienEntregado` se pone en null. Pero luego, al
   * terminar el pago, necesitamos volver a esa pantalla de cierre (no
   * al menú) — este ref guarda ese pedido mientras tanto para poder
   * restaurarlo en simularPago.
   */
  const pedidoCierreRef = useRef(null);

  useEffect(() => {
    pantallaPagoRef.current = pantallaPago;
  }, [pantallaPago]);

  useEffect(() => {
    pedidoPagoRef.current = idPedidoActual;
  }, [idPedidoActual]);

  /*
   * =========================================================
   * PQRSF
   * =========================================================
   */

  const [pqrsfAbierto, setPqrsfAbierto] =
    useState(false);

  const [tiposPqrsf, setTiposPqrsf] = useState([]);

  const [pqrsfForm, setPqrsfForm] = useState({
    id_TipoPQRSF: "",
    nombre: "",
    mensaje: "",
  });

  const [enviandoPqrsf, setEnviandoPqrsf] =
    useState(false);

  const [pqrsfMsg, setPqrsfMsg] = useState(null);

  useEffect(() => {
    axios
      .get(`${API}/api/pqrsf/tipos`)
      .then((res) => {
        setTiposPqrsf(res.data);
      })
      .catch(() => {});
  }, []);

  const enviarPqrsf = async () => {
    if (!pqrsfForm.id_TipoPQRSF) {
      setPqrsfMsg({
        ok: false,
        txt: "Selecciona el tipo de solicitud",
      });
      return;
    }

    if (!pqrsfForm.mensaje.trim()) {
      setPqrsfMsg({
        ok: false,
        txt: "Escribe tu mensaje",
      });
      return;
    }

    setEnviandoPqrsf(true);

    try {
      await axios.post(
        `${API}/api/pqrsf/crear`,
        pqrsfForm
      );

      setPqrsfMsg({
        ok: true,
        txt: "¡Enviado correctamente! Gracias por tu mensaje.",
      });

      setPqrsfForm({
        id_TipoPQRSF: "",
        nombre: "",
        mensaje: "",
      });

      setTimeout(() => {
        setPqrsfAbierto(false);
        setPqrsfMsg(null);
      }, 2000);
    } catch (error) {
      console.error(error);

      setPqrsfMsg({
        ok: false,
        txt: "Error al enviar. Inténtalo de nuevo.",
      });
    } finally {
      setEnviandoPqrsf(false);
    }
  };

  /*
   * =========================================================
   * CERRAR SESIÓN
   * =========================================================
   */

  const cerrarSesionCliente = async () => {
    try {
      if (idMesaActiva) {
        await axios.put(
          `${API}/api/mesas/estado/${idMesaActiva}`,
          {
            estado: "disponible",
          }
        );
      }
    } catch (error) {
      console.error(
        "Error al liberar la mesa:",
        error
      );
    } finally {
      localStorage.removeItem("mesaSeleccionada");
      localStorage.removeItem("idMesero");

      navigate("/login");
    }
  };

  /*
   * =========================================================
   * SONIDO
   * =========================================================
   */

  const [sonidoHabilitado, setSonidoHabilitado] =
    useState(true);

  const sonidoRef = useRef(sonidoHabilitado);

  useEffect(() => {
    sonidoRef.current = sonidoHabilitado;
  }, [sonidoHabilitado]);

  const reproducirAlertaListo = () => {
    if (sonidoRef.current) {
      reproducirNotificacion();
    }
  };

  /*
   * =========================================================
   * CONSULTAR PEDIDOS DE LA MESA
   * =========================================================
   */

  const verificarPedidoMesa = async (numeroMesa) => {
    if (!numeroMesa) return;

    /*
     * MUY IMPORTANTE:
     *
     * Si el usuario está en la pasarela NO hacemos nada con
     * la respuesta. Esto evita que una consulta vieja cambie
     * la vista de pago por la pantalla de estado.
     */
    if (pantallaPagoRef.current) {
      return;
    }

    try {
      const res = await axios.get(
        `${API}/api/pedidos/mesa/${numeroMesa}`
      );

      /*
       * Después de recibir la respuesta volvemos a comprobar
       * si el usuario entró a pagar mientras la petición estaba
       * en curso.
       */
      if (pantallaPagoRef.current) {
        return;
      }

      const pedidos = Array.isArray(res.data) ? res.data : [];

      const activo = pedidos.find((p) =>
        [
          "pendiente",
          "preparando",
          "listo",
        ].includes(p.EstadoPedido)
      );

      setPedidoActivo((prevPedido) => {
        // Si aparece un pedido en curso de nuevo (ej. el cliente pidió
        // otra ronda desde "ver el menú de nuevo"), se sale de la
        // pantalla de cierre por si seguía activa.
        if (activo) {
          setPedidoRecienEntregado(null);
        }

        // Si el pedido que veníamos siguiendo ya no está "en curso",
        // se revisa si fue justo porque pasó a "entregado" — nunca se
        // toma un "entregado" cualquiera, solo el MISMO id que ya
        // veníamos rastreando (nunca el de un cliente anterior).
        if (prevPedido && !activo) {
          const esteEntregado = pedidos.find(
            (p) =>
              p.id_Pedidos === prevPedido.id_Pedidos &&
              p.EstadoPedido === "entregado"
          );
          if (esteEntregado) {
            reproducirAlertaListo();
            setCarrito([]);
            setCantidades({});
            setPeticiones({});
            setPedidoRecienEntregado(esteEntregado);
          }
        }

        return activo || null;
      });
    } catch (error) {
      /*
       * No mostramos alertas aquí porque esta función se ejecuta
       * automáticamente cada pocos segundos.
       */
      console.error(
        "Error verificando pedido de la mesa:",
        error
      );
    }
  };

  /*
   * =========================================================
   * CARGA INICIAL
   * =========================================================
   */

  useEffect(() => {
    inicializarAudio();

    // El menú publicado se consulta directo al backend (ya no en
    // localStorage) para que se vea igual en cualquier dispositivo.
    const cargarMenuDia = async () => {
      try {
        const res = await axios.get(`${API}/api/menu-dia/hoy`);
        if (res.data && Array.isArray(res.data.items)) {
          setMenuDelDia(res.data.items);
        }
      } catch (error) {
        console.error("Error leyendo menú:", error);
      }
    };
    cargarMenuDia();

    /*
     * Resolver la mesa: primero por el token del QR en la URL
     * (?mesa=<token>, que es lo que trae el QR que imprime el admin
     * desde la app — HU15), y si no hay o no es válido, por la mesa
     * guardada de una selección manual anterior (flujo de siempre).
     */
    const resolverMesa = async () => {
      /*
       * BUGFIX: esta vista es una sola ruta ("/vistacliente") para
       * cualquier mesa — React Router NO desmonta el componente al
       * pasar de ?mesa=tokenA a ?mesa=tokenB (misma ruta, solo
       * cambia el query string), así que sin este reset seguía
       * mostrando el pedido/carrito de la mesa anterior hasta que
       * se recargaba la página a mano.
       *
       * Se limpia ANTES de resolver el token nuevo para no dejar ver
       * ni un instante los datos de la mesa vieja mientras se
       * resuelve la nueva.
       */
      setPedidoActivo(null);
      setCarrito([]);
      setCantidades({});
      setPeticiones({});
      setPlatoAbierto(null);
      setMesaActiva("");
      setIdMesaActiva(null);

      const tokenQr = new URLSearchParams(
        window.location.search
      ).get("mesa");

      if (tokenQr) {
        try {
          const res = await axios.get(
            `${API}/api/mesas/qr/${tokenQr}`
          );

          const mesa = res.data;

          setMesaActiva(String(mesa.Numero_mesa));
          setIdMesaActiva(mesa.id_Mesas);

          localStorage.setItem(
            "mesaSeleccionada",
            String(mesa.Numero_mesa)
          );

          setTimeout(() => {
            verificarPedidoMesa(
              String(mesa.Numero_mesa)
            );
          }, 300);

          return;
        } catch (error) {
          /*
           * QR inválido/desactivado (por ejemplo, se regeneró y este
           * es el impreso viejo): seguimos con el flujo manual de
           * abajo en vez de dejar al cliente sin poder pedir.
           */
          console.error(
            "Código QR no válido, se usa selección manual:",
            error
          );
        }
      }

      const mesaGuardada =
        localStorage.getItem("mesaSeleccionada");

      if (mesaGuardada) {
        setMesaActiva(mesaGuardada);

        axios
          .get(`${API}/api/mesas/listar`)
          .then((res) => {
            const mesa = res.data.find(
              (m) =>
                String(m.Numero_mesa) ===
                String(mesaGuardada)
            );

            if (mesa) {
              setIdMesaActiva(mesa.id_Mesas);
            }
          })
          .catch((error) => {
            console.error(
              "Error cargando id de mesa:",
              error
            );
          });

        setTimeout(() => {
          verificarPedidoMesa(mesaGuardada);
        }, 300);
      }
    };

    resolverMesa();
    // BUGFIX: antes tenía [] — solo corría al montar el componente,
    // así que si se navegaba de ?mesa=tokenA a ?mesa=tokenB sin una
    // recarga completa de página (misma ruta "/vistacliente"),
    // React Router no remonta el componente y esta función nunca
    // volvía a leer el nuevo token de la URL. Depender de
    // location.search hace que se re-resuelva la mesa cada vez que
    // cambia el query string, sea por recarga o por navegación.
  }, [location.search]);

  /*
   * =========================================================
   * POLLING
   * =========================================================
   */

  useEffect(() => {
    if (!mesaActiva) {
      return;
    }

    /*
     * Mientras se está realizando el pago NO hacemos polling.
     */
    if (pantallaPago) {
      return;
    }

    const intervalo = setInterval(() => {
      /*
       * Segunda barrera.
       */
      if (pantallaPagoRef.current) {
        return;
      }

      verificarPedidoMesa(mesaActiva);
    }, 5000);

    return () => {
      clearInterval(intervalo);
    };
  }, [mesaActiva, pantallaPago]);

  /*
   * =========================================================
   * MENÚ
   * =========================================================
   */

  const platosMenu = menuDelDia.filter(
    (p) => String(p.id_Categoria) !== "4"
  );

  const bebidasMenu = menuDelDia.filter(
    (p) => String(p.id_Categoria) === "4"
  );

  const getCantidad = (id) =>
    cantidades[id] || 1;

  const getPeticion = (id) =>
    peticiones[id] || "";

  const cambiarCantidad = (id, valor) => {
    setCantidades((prev) => ({
      ...prev,
      [id]: Math.max(
        1,
        (prev[id] || 1) + valor
      ),
    }));
  };

  const togglePlato = (plato) => {
    setPlatoAbierto((prev) =>
      prev === plato.id_Platos
        ? null
        : plato.id_Platos
    );
  };

  const enCarrito = (id) =>
    carrito.some(
      (item) =>
        item.plato.id_Platos === id
    );

  const toggleCarrito = (plato) => {
    if (enCarrito(plato.id_Platos)) {
      setCarrito((prev) =>
        prev.filter(
          (item) =>
            item.plato.id_Platos !==
            plato.id_Platos
        )
      );
    } else {
      setCarrito((prev) => [
        ...prev,
        {
          plato,
          cantidad: getCantidad(
            plato.id_Platos
          ),
          peticion: getPeticion(
            plato.id_Platos
          ),
        },
      ]);
    }
  };

  const quitarDelCarrito = (id) => {
    setCarrito((prev) =>
      prev.filter(
        (item) =>
          item.plato.id_Platos !== id
      )
    );
  };

  const cambiarPeticion = (id, valor) => {
    setPeticiones((prev) => ({
      ...prev,
      [id]: valor,
    }));
  };

  const carritoPlatos = carrito.filter(
    (item) =>
      String(item.plato.id_Categoria) !== "4"
  );

  const carritoBebidas = carrito.filter(
    (item) =>
      String(item.plato.id_Categoria) === "4"
  );

  const totalItemsCarrito =
    carrito.reduce(
      (acc, item) =>
        acc + item.cantidad,
      0
    );

  const totalPedido =
    carrito.reduce(
      (acc, item) =>
        acc +
        Number(item.plato.Precio) *
          item.cantidad,
      0
    );

  const formatPrecio = (precio) =>
    `$${Number(precio).toLocaleString(
      "es-CO"
    )}`;

  /*
   * =========================================================
   * MÉTODOS DE PAGO
   * =========================================================
   */

  const iconoMetodoPago = (nombre) => {
    const n = String(nombre).toLowerCase();

    if (
      n.includes("nequi") ||
      n.includes("daviplata")
    ) {
      return "bi-phone";
    }

    if (n.includes("pse")) {
      return "bi-bank";
    }

    if (
      n.includes("crédito") ||
      n.includes("credito")
    ) {
      return "bi-credit-card-fill";
    }

    if (
      n.includes("débito") ||
      n.includes("debito")
    ) {
      return "bi-credit-card-2-back-fill";
    }

    return "bi-wallet2";
  };

  /*
   * =========================================================
   * PASO 1:
   *
   * Crear el pedido y abrir la pantalla de pago.
   *
   * IMPORTANTE:
   *
   * Aquí NO cambiamos pantallaPago hasta que el pedido haya
   * sido creado y tengamos los métodos de pago.
   * =========================================================
   */

  // Deja lista y abre la pasarela para un pedido que YA existe —
  // se usa desde la vista de seguimiento (una vez en cocina) y
  // desde la pantalla de cierre (si llegó a la mesa sin pagar).
  const mostrarPasarelaPara = async (idPedido, total) => {
    pedidoPagoRef.current = idPedido;
    setIdPedidoActual(idPedido);
    setTotalPagoActual(Number(total) || 0);

    const resMetodos = await axios.get(
      `${API}/api/metodo-pago/online`
    );

    if (
      !Array.isArray(resMetodos.data) ||
      resMetodos.data.length === 0
    ) {
      // Si no existen métodos, dejamos que el usuario vuelva
      // al carrito y no dejamos una pantalla rota.
      setIdPedidoActual(null);
      pedidoPagoRef.current = null;

      throw new Error(
        "No existen métodos de pago disponibles."
      );
    }

    setMetodosPago(resMetodos.data);
    setMetodoSeleccionado(null);
    setDatosPago({});
    setResultadoPago(null);
    setMensajeRechazo("");

    // PRIMERO activamos el ref — React actualiza los estados
    // después, y el polling nunca debe ganar esta carrera.
    pantallaPagoRef.current = true;
    setCarritoAbierto(true);
    setPantallaPago(true);
  };

  // Enviar el PRIMER (y único) pedido del cliente — ya no existe la
  // opción de "seguir agregando" desde la app; si el cliente quiere
  // algo más después de enviarlo, eso lo resuelve el mesero desde su
  // propio editor. El pago tampoco pasa por acá — ya no es requisito
  // para mandar a cocina, se paga después (ver pagarPedido).
  const enviarPedido = async () => {
    if (carrito.length === 0) return;

    if (!idMesaActiva) {
      alert(
        "No se pudo identificar la mesa. Vuelve al inicio y selecciona la mesa nuevamente."
      );
      return;
    }

    setEnviando(true);

    try {
      const items = carrito.map(
        (item) => ({
          idPlato:
            item.plato.id_Platos,

          nombrePlato:
            item.plato.NombrePlato,

          cantidadPedido:
            item.cantidad,

          notasEspeciales:
            item.peticion || null,

          precioFinal:
            Number(item.plato.Precio) *
            item.cantidad,

          idCategoria:
            item.plato.id_Categoria,
        })
      );

      const totalGeneral = carrito.reduce(
        (acc, item) =>
          acc +
          Number(item.plato.Precio) *
            item.cantidad,
        0
      );

      /*
       * Crear pedido. El mesero lo manda a cocina sin que nadie haya
       * pagado todavía — el pago pasa después, mientras se prepara.
       */
      await axios.post(`${API}/api/pedidos/crear`, {
        idMesa: idMesaActiva,
        totalPagar: totalGeneral,
        items,
      });

      setCarrito([]);
      setCantidades({});
      setPeticiones({});
      await verificarPedidoMesa(mesaActiva);
    } catch (error) {
      console.error("Error enviando el pedido:", error);
      alert(
        error.response?.data?.message ||
          error.message ||
          "No se pudo enviar el pedido."
      );
    } finally {
      setEnviando(false);
    }
  };

  // Pagar un pedido que YA existe — desde que está "en cocina" (o
  // después). Se usa tanto para el pedido en curso como para el
  // recién entregado que sigue sin pagar (último recurso).
  const pagarPedido = async (idPedido, total) => {
    try {
      await mostrarPasarelaPara(idPedido, total);

      // Esta pantalla ("Estado de tu Orden") tiene un return temprano
      // por `if (pedidoActivo) {...}`. Igual que en pagarPedidoEntregado,
      // hay que salir de ese return para que se renderice el checkout
      // que está más abajo en el componente — si no, pantallaPago queda
      // en true pero la pasarela nunca se ve, y como el polling se
      // detiene mientras pantallaPago es true, el cliente queda
      // congelado ahí (ni ve el formulario de pago ni se entera cuando
      // el mesero le entrega el pedido).
      setPedidoActivo(null);
    } catch (error) {
      console.error("Error iniciando pago:", error);
      alert(
        error.response?.data?.message ||
          error.message ||
          "No se pudo iniciar el pago."
      );
    }
  };

  /*
   * =========================================================
   * PASO 2:
   *
   * Simular pago.
   * =========================================================
   */

  const simularPago = async () => {
    if (!idPedidoActual) {
      alert(
        "No hay un pedido pendiente de pago."
      );
      return;
    }

    if (!metodoSeleccionado) {
      alert(
        "Selecciona un método de pago."
      );
      return;
    }

    setSimulando(true);

    try {
      /*
       * Si el backend rechaza el pago (datos inválidos,
       * tarjeta vencida, etc.) responde con status 400,
       * así que ese caso siempre cae en el catch de abajo,
       * nunca aquí. Si llegamos a este punto es porque el
       * pago quedó aprobado.
       */
      // Guardamos el id antes de limpiar el estado para no perderlo
      // después de aprobar el pago.
      const idPedidoPagado = idPedidoActual;
      // OJO: no se puede usar el estado `pedidoRecienEntregado` acá —
      // pagarPedidoEntregado ya lo dejó en null para poder mostrar la
      // pasarela. Por eso usamos el ref que guarda ese mismo pedido.
      const pagoDesdeCierre =
        pedidoCierreRef.current &&
        pedidoCierreRef.current.id_Pedidos === idPedidoPagado;

      await axios.put(
        `${API}/api/pedidos/simular-pago/${idPedidoPagado}`,
        {
          idMetodoPago:
            metodoSeleccionado,

          datos: datosPago,
        }
      );

      // Si el pago se hizo desde "¡Tu pedido ya llegó!", actualizamos
      // inmediatamente ese pedido en pantalla. Así la vista de cierre
      // pasa de pago pendiente a "¡Gracias por tu visita!" sin quedarse
      // mostrando otra vez el botón de pagar.
      if (pagoDesdeCierre) {
        // Reconstruimos la pantalla de cierre a partir del ref (ya
        // que el estado se había vaciado para poder abrir la pasarela)
        // y la marcamos como pagada, para que se vea directo "¡Gracias
        // por tu visita!" en vez del menú del día.
        setPedidoRecienEntregado({
          ...pedidoCierreRef.current,
          EstadoPago: "aprobado",
        });
        pedidoCierreRef.current = null;
      }

      /*
       * =====================================================
       * PAGO APROBADO
       * =====================================================
       *
       * Ahora sí puede pasar a cocina.
       */

      setCarrito([]);
      setCantidades({});
      setPeticiones({});

      /*
       * Limpiamos el pedido pendiente.
       */
      setIdPedidoActual(null);
      pedidoPagoRef.current = null;

      setMetodoSeleccionado(null);
      setResultadoPago("aprobado");

      /*
       * Quitamos la pantalla de pago.
       *
       * Primero desactivamos el ref para permitir que el polling
       * vuelva a consultar el pedido aprobado.
       */
      pantallaPagoRef.current = false;

      setPantallaPago(false);

      /*
       * Dejamos abierto el panel durante un instante para mostrar
       * el mensaje de éxito.
       */
      setCarritoAbierto(false);

      // Si el pago se hizo desde la pantalla final de pedido entregado,
      // no mostramos otro mensaje intermedio: el cliente pasa directo
      // a "¡Gracias por tu visita!". En un pedido que sigue en cocina
      // sí mostramos la confirmación normal.
      if (!pagoDesdeCierre) {
        alert(
          `¡Pago aprobado!\n\nPedido #${idPedidoPagado} procesado correctamente.\nMesa #${mesaActiva}.`
        );
      }

      /*
       * Consultamos el pedido aprobado. Si veníamos de la pantalla
       * de cierre, el estado local ya fue actualizado arriba y se
       * conserva la vista final de "Gracias por tu visita".
       */
      verificarPedidoMesa(
        mesaActiva
      );
    } catch (error) {
      console.error(
        "Error procesando pago:",
        error
      );

      const mensaje =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "No se pudo procesar el pago.";

      /*
       * El backend responde 400 tanto si faltan datos
       * como si los datos ingresados no pasan su
       * validación (tarjeta vencida, celular inválido,
       * etc). En ese segundo caso viene marcado como
       * "rechazado" y se muestra igual que un rechazo,
       * no como un error genérico.
       */
      if (
        error.response?.data?.estadoPago ===
        "rechazado"
      ) {
        setResultadoPago(
          "rechazado"
        );

        setMensajeRechazo(mensaje);

        setMetodoSeleccionado(null);
        setDatosPago({});

        return;
      }

      alert(mensaje);
    } finally {
      setSimulando(false);
    }
  };

  /*
   * =========================================================
   * VOLVER AL CARRITO
   * =========================================================
   */

  const volverAlCarrito = () => {
    /*
     * Dejamos de considerar que estamos pagando.
     */
    pantallaPagoRef.current = false;

    setPantallaPago(false);

    /*
     * MUY IMPORTANTE:
     *
     * Si el usuario vuelve al carrito, el pedido que ya se creó
     * NO se reutiliza automáticamente.
     *
     * El pedido queda pendiente en BD.
     *
     * Para la sustentación esto evita que el usuario cambie el
     * carrito y después termine pagando un pedido diferente.
     */
    setIdPedidoActual(null);
    pedidoPagoRef.current = null;
    pedidoCierreRef.current = null;

    setResultadoPago(null);
    setMetodoSeleccionado(null);

    setCarritoAbierto(true);
  };

  // Caso poco frecuente: el pedido llegó a la mesa pero sigue sin
  // pagar (ver nota junto a "Paga si ya terminaste" en el render) —
  // abre la pasarela directo para ESE pedido, sin pasar por el
  // carrito.
  const pagarPedidoEntregado = async () => {
    if (!pedidoRecienEntregado) return;
    try {
      await mostrarPasarelaPara(
        pedidoRecienEntregado.id_Pedidos,
        pedidoRecienEntregado.TotalPagar
      );

      // Guardamos el pedido de cierre en un ref ANTES de vaciar el
      // estado: lo necesitamos en simularPago para saber que este pago
      // viene de "¡Tu pedido ya llegó!" y así, al terminar, volver a esa
      // misma pantalla (ya aprobada) en vez de caer en el menú del día.
      pedidoCierreRef.current = pedidoRecienEntregado;

      // Esta pantalla tiene un return temprano para "¡Tu pedido ya llegó!".
      // Al abrir la pasarela debemos salir de ese cierre para que se renderice
      // el checkout que está más abajo en el componente.
      setPedidoRecienEntregado(null);
    } catch (error) {
      console.error("Error iniciando pago:", error);
      alert(
        error.response?.data?.message ||
          error.message ||
          "No se pudo iniciar el pago."
      );
    }
  };

  // El cliente quiere pedir otra ronda — se sale de la pantalla de
  // cierre y vuelve al menú normal.
  const verMenuDeNuevo = () => {
    setPedidoRecienEntregado(null);
  };
  const renderModalPqrsf = () => (
    pqrsfAbierto && (
        <div
          onClick={() =>
            setPqrsfAbierto(false)
          }
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background:
              "rgba(0,0,0,0.7)",
            backdropFilter:
              "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              background: "#111",
              border:
                "1px solid #d43737",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "460px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background:
                  "rgba(212,55,55,0.12)",
                borderBottom:
                  "1px solid rgba(212,55,55,0.3)",
                padding:
                  "20px 24px",
              }}
            >
              <h2
                style={{
                  color: "#d43737",
                  margin:
                    "0 0 4px",
                  fontSize:
                    "1.1rem",
                  letterSpacing:
                    "3px",
                }}
              >
                💬 PQRSF
              </h2>

              <p
                style={{
                  color: "#888",
                  margin: 0,
                  fontSize:
                    "0.85rem",
                }}
              >
                Peticiones, Quejas,
                Reclamos,
                Felicitaciones y
                Sugerencias
              </p>
            </div>

            <div
              style={{
                padding: "24px",
                display: "flex",
                flexDirection:
                  "column",
                gap: "14px",
              }}
            >
              <div>
                <label
                  style={{
                    color: "#bbb",
                    fontSize:
                      "0.85rem",
                    display:
                      "block",
                    marginBottom:
                      "6px",
                  }}
                >
                  Tipo de solicitud *
                </label>

                <select
                  value={
                    pqrsfForm.id_TipoPQRSF
                  }
                  onChange={(e) =>
                    setPqrsfForm(
                      (prev) => ({
                        ...prev,
                        id_TipoPQRSF:
                          e.target.value,
                      })
                    )
                  }
                  style={{
                    width: "100%",
                    padding:
                      "10px 14px",
                    background:
                      "rgba(255,255,255,0.05)",
                    border:
                      "1px solid rgba(255,255,255,0.15)",
                    borderRadius:
                      "8px",
                    color: "#fff",
                    fontSize:
                      "0.95rem",
                    outline:
                      "none",
                  }}
                >
                  <option value="">
                    — Selecciona —
                  </option>

                  {tiposPqrsf.map(
                    (tipo) => (
                      <option
                        key={
                          tipo.id_TipoPQRSF
                        }
                        value={
                          tipo.id_TipoPQRSF
                        }
                        style={{
                          background:
                            "#111",
                        }}
                      >
                        {
                          tipo.TipoPQRSF
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  style={{
                    color: "#bbb",
                    fontSize:
                      "0.85rem",
                    display:
                      "block",
                    marginBottom:
                      "6px",
                  }}
                >
                  Tu nombre (opcional)
                </label>

                <input
                  type="text"
                  placeholder="Anónimo"
                  value={
                    pqrsfForm.nombre
                  }
                  onChange={(e) =>
                    setPqrsfForm(
                      (prev) => ({
                        ...prev,
                        nombre:
                          e.target.value,
                      })
                    )
                  }
                  style={{
                    width: "100%",
                    padding:
                      "10px 14px",
                    background:
                      "rgba(255,255,255,0.05)",
                    border:
                      "1px solid rgba(255,255,255,0.15)",
                    borderRadius:
                      "8px",
                    color: "#fff",
                    fontSize:
                      "0.95rem",
                    outline:
                      "none",
                    boxSizing:
                      "border-box",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    color: "#bbb",
                    fontSize:
                      "0.85rem",
                    display:
                      "block",
                    marginBottom:
                      "6px",
                  }}
                >
                  Mensaje *
                </label>

                <textarea
                  placeholder="Escribe tu mensaje aquí..."
                  value={
                    pqrsfForm.mensaje
                  }
                  onChange={(e) =>
                    setPqrsfForm(
                      (prev) => ({
                        ...prev,
                        mensaje:
                          e.target.value,
                      })
                    )
                  }
                  rows={4}
                  style={{
                    width: "100%",
                    padding:
                      "10px 14px",
                    background:
                      "rgba(255,255,255,0.05)",
                    border:
                      "1px solid rgba(255,255,255,0.15)",
                    borderRadius:
                      "8px",
                    color: "#fff",
                    fontSize:
                      "0.9rem",
                    outline:
                      "none",
                    resize:
                      "vertical",
                    fontFamily:
                      "inherit",
                    boxSizing:
                      "border-box",
                  }}
                />
              </div>

              {pqrsfMsg && (
                <div
                  style={{
                    padding:
                      "10px 14px",
                    borderRadius:
                      "8px",
                    textAlign:
                      "center",
                    fontSize:
                      "0.88rem",
                    background:
                      pqrsfMsg.ok
                        ? "rgba(46,204,113,0.15)"
                        : "rgba(231,76,60,0.15)",
                    color:
                      pqrsfMsg.ok
                        ? "#2ecc71"
                        : "#e74c3c",
                    border: `1px solid ${
                      pqrsfMsg.ok
                        ? "rgba(46,204,113,0.4)"
                        : "rgba(231,76,60,0.4)"
                    }`,
                  }}
                >
                  {pqrsfMsg.txt}
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                padding:
                  "0 24px 24px",
              }}
            >
              <button
                onClick={() =>
                  setPqrsfAbierto(
                    false
                  )
                }
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "none",
                  borderRadius:
                    "8px",
                  background:
                    "rgba(255,255,255,0.08)",
                  color: "#bbb",
                  cursor:
                    "pointer",
                  fontSize:
                    "0.95rem",
                }}
              >
                Cancelar
              </button>

              <button
                onClick={enviarPqrsf}
                disabled={
                  enviandoPqrsf
                }
                style={{
                  flex: 1,
                  padding: "12px",
                  border: "none",
                  borderRadius:
                    "8px",
                  background:
                    enviandoPqrsf
                      ? "#555"
                      : "#d43737",
                  color: "#fff",
                  fontWeight:
                    "700",
                  cursor:
                    enviandoPqrsf
                      ? "not-allowed"
                      : "pointer",
                  fontSize:
                    "0.95rem",
                }}
              >
                {enviandoPqrsf
                  ? "Enviando..."
                  : "Enviar"}
              </button>
            </div>
          </div>
        </div>
    )
  );


  /*
   * =========================================================
   * CANCELAR PEDIDO
   * =========================================================
   */

  const handleCancelarPedido =
    async () => {
      if (!pedidoActivo) {
        return;
      }

      if (
        pedidoActivo.EstadoPedido !==
        "pendiente"
      ) {
        alert(
          "Tu pedido ya está siendo preparado en cocina y no puede cancelarse."
        );
        return;
      }

      const confirmar =
        window.confirm(
          "¿Estás seguro de que deseas cancelar tu pedido?"
        );

      if (!confirmar) {
        return;
      }

      try {
        await axios.put(
          `${API}/api/pedidos/cancelar/${pedidoActivo.id_Pedidos}`,
          {
            motivo:
              "Cancelado por el cliente desde la mesa",
          }
        );

        alert(
          "Tu pedido ha sido cancelado con éxito."
        );

        setPedidoActivo(null);
      } catch (error) {
        console.error(error);

        const mensaje =
          error.response?.data?.message ||
          "Error al intentar cancelar.";

        alert(mensaje);

        /*
         * Solo volvemos a consultar si NO estamos en pago.
         */
        if (!pantallaPagoRef.current) {
          verificarPedidoMesa(
            mesaActiva
          );
        }
      }
    };

  /*
   * =========================================================
   * MENÚ VACÍO
   * =========================================================
   */

  if (menuDelDia.length === 0) {
    return (
      <>
        <div className="vc-container">
          <header className="vc-header">
            <span className="vc-badge-mesa">
              Mesa #{mesaActiva}
            </span>

            <div className="vc-header-center">
              <h1 className="vc-logo">
                Restaurante Mangata
              </h1>
            </div>

            <button
              className="vc-btn-salir"
              onClick={
                cerrarSesionCliente
              }
            >
              SALIR
            </button>
          </header>

          <div className="vc-vacio">
            <p>
              El menú de hoy aún no
              está listo.
            </p>

            <span>
              El administrador lo
              publicará en breve.
            </span>
          </div>
        </div>
      </>
    );
  }

  /*
   * =========================================================
   * PANTALLA DE CIERRE — el pedido ya llegó a la mesa.
   * =========================================================
   */

  if (pedidoRecienEntregado) {
    const sinPagar = pedidoRecienEntregado.EstadoPago !== "aprobado";

    return (
      <>
        <div className="vc-container">
          <header className="vc-header">
            <span className="vc-badge-mesa">Mesa #{mesaActiva}</span>

            <div className="vc-header-center">
              <h1 className="vc-logo">Restaurante Mangata</h1>
            </div>

            <button className="vc-btn-salir" onClick={cerrarSesionCliente}>
              SALIR
            </button>
          </header>

          <div className="vc-cierre">
            {sinPagar ? (
              <>
                <div className="vc-cierre-icono vc-cierre-icono-amarillo">🍽️</div>
                <h2 className="vc-cierre-titulo">¡Tu pedido ya llegó!</h2>
                <p className="vc-cierre-subtitulo">
                  Paga si ya terminaste, o si quieres, paga antes — como prefieras.
                </p>

                <div className="vc-cierre-total-card">
                  <span className="vc-cierre-total-label">TOTAL</span>
                  <span className="vc-cierre-total-valor">
                    {formatPrecio(pedidoRecienEntregado.TotalPagar)}
                  </span>
                </div>

                <button
                  className="vc-cierre-btn-pagar"
                  onClick={pagarPedidoEntregado}
                >
                  Pagar ahora
                </button>
              </>
            ) : (
              <>
                <div className="vc-cierre-icono">💖</div>
                <h2 className="vc-cierre-titulo vc-cierre-titulo-serif">
                  ¡Gracias por tu visita!
                </h2>
                <p className="vc-cierre-marca">
                  MANGATA · EL MEJOR RESTAURANTE DEL PEDAZO
                </p>

                <div className="vc-cierre-tarjeta">
                  <div className="vc-cierre-tarjeta-header vc-cierre-rosa">
                    <span>💬</span> TU OPINIÓN NOS IMPORTA
                  </div>
                  <p className="vc-cierre-tarjeta-texto">
                    ¿Alguna petición, queja, felicitación o sugerencia? Cuéntanos,
                    nos ayuda a mejorar.
                  </p>
                  <button
                    className="vc-cierre-tarjeta-btn vc-cierre-rosa-btn"
                    onClick={() => setPqrsfAbierto(true)}
                  >
                    Dejar un comentario
                  </button>
                </div>

                <div className="vc-cierre-tarjeta">
                  <div className="vc-cierre-tarjeta-header vc-cierre-azul">
                    <span>🍴</span> ¿TE QUEDASTE CON GANAS DE MÁS?
                  </div>
                  <p className="vc-cierre-tarjeta-texto">
                    Vuelve a ver el menú del día y cierra tu visita con algo más.
                  </p>
                  <button
                    className="vc-cierre-tarjeta-btn vc-cierre-azul-btn"
                    onClick={verMenuDeNuevo}
                  >
                    Ver el menú de nuevo
                  </button>
                </div>

                <div className="vc-cierre-salir-nota">
                  <p className="vc-cierre-salir-titulo">¿Ya terminaste?</p>
                  <p className="vc-cierre-salir-texto">
                    No olvides tocar SALIR para dejar la mesa lista para el
                    siguiente cliente.
                  </p>
                  <button
                    className="vc-cierre-btn-salir-grande"
                    onClick={cerrarSesionCliente}
                  >
                    SALIR
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {renderModalPqrsf()}
      </>
    );
  }

  /*
   * =========================================================
   * PEDIDO ACTIVO
   * =========================================================
   */

  if (pedidoActivo) {
    return (
      <>
        <div className="vc-container">
          <header className="vc-header">
            <span className="vc-badge-mesa">
              Mesa #{mesaActiva}
            </span>

            <div className="vc-header-center">
              <h1 className="vc-logo">
                Restaurante Mangata
              </h1>

              <p className="vc-menu-dia-label">
                Estado de tu Orden
              </p>
            </div>

            <button
              className="vc-btn-salir"
              onClick={
                cerrarSesionCliente
              }
            >
              SALIR
            </button>
          </header>

          <div className="vc-sonido-toggle">
            <input
              type="checkbox"
              id="audioToggleCurso"
              checked={
                sonidoHabilitado
              }
              onChange={(e) =>
                setSonidoHabilitado(
                  e.target.checked
                )
              }
            />

            <label
              htmlFor="audioToggleCurso"
              className="vc-sonido-label-grande"
            >
              {sonidoHabilitado
                ? "🔔 Sonido Activado (Te avisaremos cuando esté listo)"
                : "🔕 Sonido Muteado"}
            </label>
          </div>

          <div className="vc-estado-card">
            <h2 className="vc-estado-titulo">
              Tu pedido está:{" "}
              <span
                className={`vc-estado-valor ${pedidoActivo.EstadoPedido}`}
              >
                {
                  pedidoActivo.EstadoPedido
                }
              </span>
            </h2>

            <p className="vc-estado-total">
              Total a Pagar:{" "}
              <strong>
                {formatPrecio(
                  pedidoActivo.TotalPagar
                )}
              </strong>
            </p>

            {pedidoActivo.EstadoPedido ===
            "pendiente" ? (
              <div>
                <p className="vc-estado-aviso">
                  Tu orden aún no ha
                  entrado a la cocina,
                  puedes cancelarla si
                  lo requieres.
                </p>

                <button
                  onClick={
                    handleCancelarPedido
                  }
                  className="vc-btn-cancelar"
                >
                  Cancelar Pedido
                </button>
              </div>
            ) : (
              <p
                className={`vc-estado-mensaje ${
                  pedidoActivo.EstadoPedido ===
                  "listo"
                    ? "listo"
                    : "espera"
                }`}
              >
                {pedidoActivo.EstadoPedido ===
                "listo"
                  ? "🎉 ¡Tu pedido está listo! El mesero se acercará a entregártelo en un momento."
                  : "⚠️ Tu pedido ya se encuentra en preparación, por lo tanto ya no puede ser cancelado."}
              </p>
            )}

            {pedidoActivo.EstadoPedido !== "pendiente" &&
              pedidoActivo.EstadoPago !== "aprobado" && (
                <div className="vc-pagar-en-cocina">
                  <p className="vc-pagar-en-cocina-aviso">
                    💳 Ya puedes pagar mientras esperas
                  </p>
                  <button
                    className="vc-btn-pagar-ahora"
                    onClick={() =>
                      pagarPedido(
                        pedidoActivo.id_Pedidos,
                        pedidoActivo.TotalPagar
                      )
                    }
                  >
                    Pagar {formatPrecio(pedidoActivo.TotalPagar)} ahora
                  </button>
                </div>
              )}

            <button
              onClick={() =>
                verificarPedidoMesa(
                  mesaActiva
                )
              }
              className="vc-btn-actualizar"
            >
              🔄 Actualizar Estado
            </button>
          </div>
        </div>
      </>
    );
  }

  /*
   * =========================================================
   * FORMULARIO DE PAGO
   * =========================================================
   */

  const nombreMetodoSeleccionado =
    metodosPago.find(
      (m) =>
        m.id_MetodoPago ===
        metodoSeleccionado
    )?.NombreMetodo || null;

  const seleccionarMetodo = (id) => {
    setMetodoSeleccionado(id);

    /*
     * Cada método pide datos distintos, así que al
     * cambiar de método se limpia el formulario.
     */
    setDatosPago({});
  };

  const handleDatoPago = (
    campo,
    valor
  ) => {
    setDatosPago(
      (prev) => ({
        ...prev,
        [campo]: valor,
      })
    );
  };

  /*
   * Chequeo simple de "campos llenos" solo para habilitar
   * el botón. La validación real (formato, Luhn, vencimiento,
   * etc.) la hace el backend y sus mensajes se muestran tal
   * cual llegan.
   */
  const formularioPagoCompleto = (() => {
    if (
      nombreMetodoSeleccionado ===
        "Nequi" ||
      nombreMetodoSeleccionado ===
        "Daviplata"
    ) {
      return Boolean(
        datosPago.celular &&
          datosPago.codigo
      );
    }

    if (
      nombreMetodoSeleccionado === "PSE"
    ) {
      return Boolean(
        datosPago.correo &&
          datosPago.documento &&
          datosPago.banco
      );
    }

    if (
      nombreMetodoSeleccionado ===
        "Tarjeta crédito" ||
      nombreMetodoSeleccionado ===
        "Tarjeta débito"
    ) {
      return Boolean(
        datosPago.numero &&
          datosPago.nombre &&
          datosPago.vencimiento &&
          datosPago.cvv
      );
    }

    return false;
  })();

  /*
   * =========================================================
   * VISTA NORMAL DE LA CARTA
   * =========================================================
   */

  return (
    <>
      <div className="vc-container">
        <header className="vc-header">
          <span className="vc-badge-mesa">
            Mesa #{mesaActiva}
          </span>

          <div className="vc-header-center">
            <h1 className="vc-logo">
              Restaurante Mangata
            </h1>

            <p className="vc-menu-dia-label">
              Menú del Día
            </p>
          </div>

          <button
            className="vc-btn-salir"
            onClick={
              cerrarSesionCliente
            }
          >
            SALIR
          </button>
        </header>

        <div className="vc-sonido-toggle">
          <input
            type="checkbox"
            id="audioToggleCarta"
            checked={
              sonidoHabilitado
            }
            onChange={(e) =>
              setSonidoHabilitado(
                e.target.checked
              )
            }
          />

          <label
            htmlFor="audioToggleCarta"
            className="vc-sonido-label"
          >
            {sonidoHabilitado
              ? "🔔 Alertas sonoras activadas"
              : "🔕 Alertas silenciadas"}
          </label>
        </div>

        {platosMenu.length > 0 && (
          <section className="vc-seccion">
            <h2 className="vc-seccion-titulo">
              Platos
            </h2>

            <div className="vc-grid">
              {platosMenu.map(
                (plato) => (
                  <TarjetaPlato
                    key={
                      plato.id_Platos
                    }
                    plato={plato}
                    agregado={enCarrito(
                      plato.id_Platos
                    )}
                    expandida={
                      platoAbierto ===
                      plato.id_Platos
                    }
                    cantidad={getCantidad(
                      plato.id_Platos
                    )}
                    peticion={getPeticion(
                      plato.id_Platos
                    )}
                    onTogglePlato={
                      togglePlato
                    }
                    onCambiarCantidad={
                      cambiarCantidad
                    }
                    onToggleCarrito={
                      toggleCarrito
                    }
                    onCambiarPeticion={
                      cambiarPeticion
                    }
                  />
                )
              )}
            </div>
          </section>
        )}

        {bebidasMenu.length > 0 && (
          <section className="vc-seccion">
            <h2 className="vc-seccion-titulo">
              Bebidas
            </h2>

            <div className="vc-grid">
              {bebidasMenu.map(
                (plato) => (
                  <TarjetaPlato
                    key={
                      plato.id_Platos
                    }
                    plato={plato}
                    agregado={enCarrito(
                      plato.id_Platos
                    )}
                    expandida={
                      platoAbierto ===
                      plato.id_Platos
                    }
                    cantidad={getCantidad(
                      plato.id_Platos
                    )}
                    peticion={getPeticion(
                      plato.id_Platos
                    )}
                    onTogglePlato={
                      togglePlato
                    }
                    onCambiarCantidad={
                      cambiarCantidad
                    }
                    onToggleCarrito={
                      toggleCarrito
                    }
                    onCambiarPeticion={
                      cambiarPeticion
                    }
                  />
                )
              )}
            </div>
          </section>
        )}

        {carrito.length > 0 && (
          <button
            className="vc-fab-carrito"
            onClick={() =>
              setCarritoAbierto(
                true
              )
            }
          >
            <i className="bi bi-cart-fill"></i>

            <span className="vc-fab-badge">
              {totalItemsCarrito}
            </span>
          </button>
        )}

        {carritoAbierto && (
          <div
            className="vc-offcanvas-backdrop"
            onClick={() => {
              /*
               * No permitimos cerrar el carrito haciendo clic
               * afuera mientras se está pagando.
               */
              if (!pantallaPago) {
                setCarritoAbierto(
                  false
                );
              }
            }}
          ></div>
        )}

        <div
          className={`offcanvas offcanvas-end vc-offcanvas ${
            carritoAbierto
              ? "show"
              : ""
          } ${
            pantallaPago
              ? "vc-pago-centro"
              : ""
          }`}
          tabIndex="-1"
        >
          <div className="vc-pedido">
            <div className="vc-pedido-header">
              <h2 className="vc-pedido-titulo">
                {pantallaPago
                  ? "Pago"
                  : "Pedido"}
              </h2>

              <button
                className="vc-pedido-cerrar"
                onClick={() => {
                  if (
                    !pantallaPago
                  ) {
                    setCarritoAbierto(
                      false
                    );
                  }
                }}
                disabled={
                  pantallaPago
                }
                title={
                  pantallaPago
                    ? "Debes terminar o cancelar el proceso de pago"
                    : "Cerrar"
                }
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            {!pantallaPago ? (
              <>
                {carrito.length ===
                0 ? (
                  <p className="vc-pedido-vacio">
                    Tu carrito está
                    vacío.
                  </p>
                ) : (
                  <>
                    {carritoPlatos.length >
                      0 && (
                      <div className="vc-pedido-grupo">
                        <p className="vc-pedido-grupo-label">
                          Platos
                        </p>

                        {carritoPlatos.map(
                          (item) => (
                            <div
                              key={
                                item.plato
                                  .id_Platos
                              }
                              className="vc-pedido-item"
                            >
                              <div className="vc-pedido-item-info">
                                <span className="vc-pedido-nombre">
                                  {
                                    item.cantidad
                                  }
                                  x{" "}
                                  {
                                    item
                                      .plato
                                      .NombrePlato
                                  }
                                </span>

                                {item.peticion && (
                                  <span className="vc-pedido-peticion">
                                    {
                                      item.peticion
                                    }
                                  </span>
                                )}
                              </div>

                              <div className="vc-pedido-item-right">
                                <span className="vc-pedido-precio">
                                  {formatPrecio(
                                    Number(
                                      item
                                        .plato
                                        .Precio
                                    ) *
                                      item.cantidad
                                  )}
                                </span>

                                <button
                                  className="vc-pedido-quitar"
                                  onClick={() =>
                                    quitarDelCarrito(
                                      item
                                        .plato
                                        .id_Platos
                                    )
                                  }
                                >
                                  quitar
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {carritoBebidas.length >
                      0 && (
                      <div className="vc-pedido-grupo">
                        <p className="vc-pedido-grupo-label">
                          Bebidas
                        </p>

                        {carritoBebidas.map(
                          (item) => (
                            <div
                              key={
                                item.plato
                                  .id_Platos
                              }
                              className="vc-pedido-item"
                            >
                              <div className="vc-pedido-item-info">
                                <span className="vc-pedido-nombre">
                                  {
                                    item.cantidad
                                  }
                                  x{" "}
                                  {
                                    item
                                      .plato
                                      .NombrePlato
                                  }
                                </span>

                                {item.peticion && (
                                  <span className="vc-pedido-peticion">
                                    {
                                      item.peticion
                                    }
                                  </span>
                                )}
                              </div>

                              <div className="vc-pedido-item-right">
                                <span className="vc-pedido-precio">
                                  {formatPrecio(
                                    Number(
                                      item
                                        .plato
                                        .Precio
                                    ) *
                                      item.cantidad
                                  )}
                                </span>

                                <button
                                  className="vc-pedido-quitar"
                                  onClick={() =>
                                    quitarDelCarrito(
                                      item
                                        .plato
                                        .id_Platos
                                    )
                                  }
                                >
                                  quitar
                                </button>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    <div className="vc-pedido-total">
                      <span>
                        Total
                      </span>

                      <span className="vc-pedido-total-num">
                        {formatPrecio(
                          totalPedido
                        )}
                      </span>
                    </div>

                    <button
                      className="vc-btn-enviar"
                      onClick={enviarPedido}
                      disabled={
                        enviando ||
                        !idMesaActiva
                      }
                    >
                      {enviando
                        ? "Enviando..."
                        : "Enviar pedido"}
                    </button>
                  </>
                )}
              </>
            ) : (
              /*
               * =================================================
               * PANTALLA DE PAGO
               * =================================================
               */

              <div className="vc-pago">
                <div
                  style={{
                    textAlign:
                      "center",
                    marginBottom:
                      "18px",
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "2.5rem",
                      marginBottom:
                        "8px",
                    }}
                  >
                    💳
                  </div>

                  <h3
                    style={{
                      margin:
                        "0 0 6px",
                      color:
                        "#ffffff",
                    }}
                  >
                    Completa tu pago
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      color:
                        "#999",
                      fontSize:
                        "0.85rem",
                    }}
                  >
                    Pedido #
                    {
                      idPedidoActual
                    }
                  </p>
                </div>

                <div
                  style={{
                    background:
                      "rgba(0,217,255,0.08)",
                    border:
                      "1px solid rgba(0,217,255,0.25)",
                    borderRadius:
                      "12px",
                    padding:
                      "14px",
                    marginBottom:
                      "18px",
                    textAlign:
                      "center",
                  }}
                >
                  <span
                    style={{
                      display:
                        "block",
                      color:
                        "#aaa",
                      fontSize:
                        "0.8rem",
                      marginBottom:
                        "4px",
                    }}
                  >
                    TOTAL A PAGAR
                  </span>

                  <strong
                    style={{
                      color:
                        "#00d9ff",
                      fontSize:
                        "1.6rem",
                    }}
                  >
                    {formatPrecio(
                      totalPagoActual
                    )}
                  </strong>
                </div>

                {resultadoPago ===
                  "rechazado" && (
                  <div
                    style={{
                      background:
                        "rgba(231,76,60,0.12)",
                      border:
                        "1px solid rgba(231,76,60,0.35)",
                      color:
                        "#ff7676",
                      borderRadius:
                        "10px",
                      padding:
                        "12px",
                      marginBottom:
                        "16px",
                      textAlign:
                        "center",
                      fontSize:
                        "0.85rem",
                    }}
                  >
                    <i className="bi bi-x-circle"></i>{" "}
                    {mensajeRechazo ||
                      "El pago fue rechazado."}
                    <br />
                    Verifica los datos
                    e inténtalo
                    nuevamente.
                  </div>
                )}

                <p className="vc-pago-titulo">
                  Selecciona un método
                  de pago
                </p>

                {metodosPago.length ===
                0 ? (
                  <div
                    style={{
                      padding:
                        "20px",
                      textAlign:
                        "center",
                      color:
                        "#999",
                    }}
                  >
                    No hay métodos
                    disponibles.
                  </div>
                ) : (
                  <div className="vc-pago-metodos">
                    {metodosPago.map(
                      (metodo) => (
                        <button
                          key={
                            metodo.id_MetodoPago
                          }
                          type="button"
                          className={`vc-pago-metodo ${
                            metodoSeleccionado ===
                            metodo.id_MetodoPago
                              ? "vc-pago-metodo-activo"
                              : ""
                          }`}
                          onClick={() =>
                            seleccionarMetodo(
                              metodo.id_MetodoPago
                            )
                          }
                          disabled={
                            simulando
                          }
                        >
                          <i
                            className={`bi ${iconoMetodoPago(
                              metodo.NombreMetodo
                            )}`}
                          ></i>

                          <span>
                            {
                              metodo.NombreMetodo
                            }
                          </span>

                          {metodoSeleccionado ===
                            metodo.id_MetodoPago && (
                            <i
                              className="bi bi-check-circle-fill"
                              style={{
                                marginLeft:
                                  "auto",
                              }}
                            ></i>
                          )}
                        </button>
                      )
                    )}
                  </div>
                )}

                {metodoSeleccionado && (
                  <div
                    style={{
                      marginTop:
                        "15px",
                      padding:
                        "12px",
                      borderRadius:
                        "10px",
                      background:
                        "rgba(255,255,255,0.04)",
                      border:
                        "1px solid rgba(255,255,255,0.08)",
                      textAlign:
                        "center",
                      color:
                        "#aaa",
                      fontSize:
                        "0.82rem",
                    }}
                  >
                    Método seleccionado:{" "}
                    <strong
                      style={{
                        color:
                          "#fff",
                      }}
                    >
                      {
                        nombreMetodoSeleccionado
                      }
                    </strong>
                  </div>
                )}

                {(nombreMetodoSeleccionado ===
                  "Nequi" ||
                  nombreMetodoSeleccionado ===
                    "Daviplata") && (
                  <div className="vc-pago-formulario">
                    <label htmlFor="vc-celular">
                      Número de
                      celular
                    </label>
                    <input
                      id="vc-celular"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="3001234567"
                      value={
                        datosPago.celular ||
                        ""
                      }
                      onChange={(e) =>
                        handleDatoPago(
                          "celular",
                          e.target.value.replace(
                            /\D/g,
                            ""
                          )
                        )
                      }
                    />

                    <label htmlFor="vc-codigo">
                      Código de
                      confirmación
                    </label>
                    <input
                      id="vc-codigo"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                      value={
                        datosPago.codigo ||
                        ""
                      }
                      onChange={(e) =>
                        handleDatoPago(
                          "codigo",
                          e.target.value.replace(
                            /\D/g,
                            ""
                          )
                        )
                      }
                    />

                    <p className="vc-pago-ayuda">
                      <i className="bi bi-info-circle"></i>
                      <span>
                        Simulación:
                        cualquier
                        celular que
                        empiece por 3
                        (10 dígitos)
                        y cualquier
                        código de 6
                        dígitos son
                        aceptados.
                      </span>
                    </p>
                  </div>
                )}

                {nombreMetodoSeleccionado ===
                  "PSE" && (
                  <div className="vc-pago-formulario">
                    <label htmlFor="vc-correo">
                      Correo
                      electrónico
                    </label>
                    <input
                      id="vc-correo"
                      type="email"
                      placeholder="tucorreo@ejemplo.com"
                      value={
                        datosPago.correo ||
                        ""
                      }
                      onChange={(e) =>
                        handleDatoPago(
                          "correo",
                          e.target.value
                        )
                      }
                    />

                    <label htmlFor="vc-documento">
                      Número de
                      documento
                    </label>
                    <input
                      id="vc-documento"
                      type="text"
                      inputMode="numeric"
                      placeholder="1234567890"
                      value={
                        datosPago.documento ||
                        ""
                      }
                      onChange={(e) =>
                        handleDatoPago(
                          "documento",
                          e.target.value.replace(
                            /\D/g,
                            ""
                          )
                        )
                      }
                    />

                    <label htmlFor="vc-banco">
                      Banco
                    </label>
                    <select
                      id="vc-banco"
                      value={
                        datosPago.banco ||
                        ""
                      }
                      onChange={(e) =>
                        handleDatoPago(
                          "banco",
                          e.target.value
                        )
                      }
                    >
                      <option value="">
                        Selecciona
                        tu banco
                      </option>
                      <option value="Bancolombia">
                        Bancolombia
                      </option>
                      <option value="Davivienda">
                        Davivienda
                      </option>
                      <option value="BBVA">
                        BBVA
                      </option>
                      <option value="Banco de Bogotá">
                        Banco de
                        Bogotá
                      </option>
                      <option value="Nequi">
                        Nequi
                      </option>
                    </select>
                  </div>
                )}

                {(nombreMetodoSeleccionado ===
                  "Tarjeta crédito" ||
                  nombreMetodoSeleccionado ===
                    "Tarjeta débito") && (
                  <div className="vc-pago-formulario">
                    <label htmlFor="vc-numero">
                      Número de
                      tarjeta
                    </label>
                    <input
                      id="vc-numero"
                      type="text"
                      inputMode="numeric"
                      maxLength={16}
                      placeholder="4111111111111111"
                      value={
                        datosPago.numero ||
                        ""
                      }
                      onChange={(e) =>
                        handleDatoPago(
                          "numero",
                          e.target.value.replace(
                            /\D/g,
                            ""
                          )
                        )
                      }
                    />

                    <label htmlFor="vc-nombre">
                      Nombre del
                      titular
                    </label>
                    <input
                      id="vc-nombre"
                      type="text"
                      placeholder="Como aparece en la tarjeta"
                      value={
                        datosPago.nombre ||
                        ""
                      }
                      onChange={(e) =>
                        handleDatoPago(
                          "nombre",
                          e.target.value
                        )
                      }
                    />

                    <div
                      style={{
                        display:
                          "flex",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                        }}
                      >
                        <label htmlFor="vc-vencimiento">
                          Vencimiento
                          (MM/AA)
                        </label>
                        <input
                          id="vc-vencimiento"
                          type="text"
                          maxLength={5}
                          placeholder="12/28"
                          value={
                            datosPago.vencimiento ||
                            ""
                          }
                          onChange={(e) => {
                            let valor =
                              e.target.value.replace(
                                /[^\d/]/g,
                                ""
                              );

                            if (
                              valor.length ===
                                2 &&
                              !valor.includes(
                                "/"
                              ) &&
                              (datosPago.vencimiento ||
                                "")
                                .length === 1
                            ) {
                              valor += "/";
                            }

                            handleDatoPago(
                              "vencimiento",
                              valor.slice(
                                0,
                                5
                              )
                            );
                          }}
                        />
                      </div>

                      <div
                        style={{
                          flex: 1,
                        }}
                      >
                        <label htmlFor="vc-cvv">
                          CVV
                        </label>
                        <input
                          id="vc-cvv"
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="123"
                          value={
                            datosPago.cvv ||
                            ""
                          }
                          onChange={(e) =>
                            handleDatoPago(
                              "cvv",
                              e.target.value.replace(
                                /\D/g,
                                ""
                              )
                            )
                          }
                        />
                      </div>
                    </div>

                    <p className="vc-pago-ayuda">
                      <i className="bi bi-info-circle"></i>
                      <span>
                        Simulación:
                        usa una fecha
                        futura. El
                        número debe
                        tener 16
                        dígitos
                        válidos
                        (prueba
                        4111111111111111).
                      </span>
                    </p>
                  </div>
                )}

                <div
                  style={{
                    marginTop:
                      "18px",
                    padding:
                      "12px",
                    borderRadius:
                      "10px",
                    background:
                      "rgba(255,255,255,0.03)",
                    color:
                      "#888",
                    fontSize:
                      "0.78rem",
                    textAlign:
                      "center",
                  }}
                >
                  <i className="bi bi-shield-lock"></i>{" "}
                  Simulación académica.
                  No se realiza ningún
                  cobro real.
                </div>

                <button
                  type="button"
                  className="vc-btn-enviar vc-btn-pago-aprobar"
                  onClick={simularPago}
                  disabled={
                    simulando ||
                    !metodoSeleccionado ||
                    !formularioPagoCompleto
                  }
                  style={{
                    marginTop:
                      "18px",
                  }}
                >
                  {simulando
                    ? "Procesando..."
                    : "✓ Confirmar pago"}
                </button>

                <button
                  type="button"
                  className="vc-btn-volver-carrito"
                  onClick={
                    volverAlCarrito
                  }
                  disabled={
                    simulando
                  }
                >
                  ← Volver al carrito
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default VistaCliente;
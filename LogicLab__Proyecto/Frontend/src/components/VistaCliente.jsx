import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
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
            src={
              IMG_CATEGORIA[String(plato.id_Categoria)] ??
              "/CartaCorriente.png"
            }
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

  const [menuDelDia, setMenuDelDia] = useState([]);
  const [mesaActiva, setMesaActiva] = useState("");
  const [idMesaActiva, setIdMesaActiva] = useState(null);

  const [cantidades, setCantidades] = useState({});
  const [peticiones, setPeticiones] = useState({});
  const [carrito, setCarrito] = useState([]);

  const [enviando, setEnviando] = useState(false);
  const [platoAbierto, setPlatoAbierto] = useState(null);

  const [pedidoActivo, setPedidoActivo] = useState(null);

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
   * Este ref evita que una consulta del polling que ya estaba
   * ejecutándose cambie la pantalla mientras estamos pagando.
   */
  const pantallaPagoRef = useRef(false);

  /*
   * También utilizamos un ref para recordar el pedido que se
   * está pagando y evitar respuestas antiguas.
   */
  const pedidoPagoRef = useRef(null);

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

      const pedidos = Array.isArray(res.data)
        ? res.data.filter(
            (p) =>
              !p.EstadoPago ||
              p.EstadoPago === "aprobado"
          )
        : [];

      const activo = pedidos.find((p) =>
        [
          "pendiente",
          "preparando",
          "listo",
        ].includes(p.EstadoPedido)
      );

      const entregado = pedidos.find(
        (p) => p.EstadoPedido === "entregado"
      );

      setPedidoActivo((prevPedido) => {
        if (
          prevPedido &&
          !activo &&
          entregado
        ) {
          reproducirAlertaListo();

          setCarrito([]);
          setCantidades({});
          setPeticiones({});
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
  }, []);

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

  const irAPago = async () => {
    if (carrito.length === 0) {
      return;
    }

    if (!idMesaActiva) {
      alert(
        "No se pudo identificar la mesa. Vuelve al inicio y selecciona la mesa nuevamente."
      );
      return;
    }

    /*
     * Si ya tenemos un pedido pendiente de este intento,
     * solamente mostramos la pasarela.
     */
    if (idPedidoActual) {
      pantallaPagoRef.current = true;
      setPantallaPago(true);
      setCarritoAbierto(true);
      return;
    }

    setEnviando(true);

    try {
      const totalGeneral =
        carrito.reduce(
          (acc, item) =>
            acc +
            Number(item.plato.Precio) *
              item.cantidad,
          0
        );

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

      /*
       * Crear pedido.
       *
       * El backend debe dejar este pedido como:
       *
       * EstadoPago = "pendiente"
       *
       * Por lo tanto cocina NO debe recibirlo todavía.
       */
      const resPedido = await axios.post(
        `${API}/api/pedidos/crear`,
        {
          idMesa: idMesaActiva,
          totalPagar: totalGeneral,
          items,
        }
      );

      const nuevoIdPedido =
        resPedido.data.idPedido;

      if (!nuevoIdPedido) {
        throw new Error(
          "El backend no devolvió el id del pedido."
        );
      }

      /*
       * Guardamos el ID inmediatamente en los refs y estados.
       */
      pedidoPagoRef.current =
        nuevoIdPedido;

      setIdPedidoActual(
        nuevoIdPedido
      );

      /*
       * Obtener métodos online.
       */
      const resMetodos = await axios.get(
        `${API}/api/metodo-pago/online`
      );

      if (
        !Array.isArray(resMetodos.data) ||
        resMetodos.data.length === 0
      ) {
        /*
         * Si no existen métodos, dejamos que el usuario vuelva
         * al carrito y no dejamos una pantalla rota.
         */
        setIdPedidoActual(null);
        pedidoPagoRef.current = null;

        throw new Error(
          "No existen métodos de pago disponibles."
        );
      }

      setMetodosPago(
        resMetodos.data
      );

      setMetodoSeleccionado(null);
      setDatosPago({});
      setResultadoPago(null);
      setMensajeRechazo("");

      /*
       * PRIMERO activamos el ref.
       *
       * Esto es importante porque React actualiza los estados
       * después. El polling nunca debe ganar esta carrera.
       */
      pantallaPagoRef.current = true;

      /*
       * Mantener abierto el carrito/offcanvas.
       */
      setCarritoAbierto(true);

      /*
       * Finalmente mostramos la pasarela.
       */
      setPantallaPago(true);
    } catch (error) {
      console.error(
        "Error iniciando pago:",
        error
      );

      const mensaje =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "No se pudo iniciar el pago.";

      alert(mensaje);
    } finally {
      setEnviando(false);
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
      await axios.put(
        `${API}/api/pedidos/simular-pago/${idPedidoActual}`,
        {
          idMetodoPago:
            metodoSeleccionado,

          datos: datosPago,
        }
      );

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

      alert(
        `¡Pago aprobado!\n\nPedido #${idPedidoActual} enviado a cocina.\nMesa #${mesaActiva}.`
      );

      /*
       * Consultamos el pedido aprobado.
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

    setResultadoPago(null);
    setMetodoSeleccionado(null);

    setCarritoAbierto(true);
  };

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
   * PQRSF BOTÓN + MODAL
   * =========================================================
   */

  const btnYModalPQRSF = (
    <>
      <button
        onClick={() => {
          setPqrsfAbierto(true);
          setPqrsfMsg(null);
        }}
        style={{
          position: "fixed",
          bottom: "24px",
          left: "24px",
          zIndex: 900,
          background:
            "linear-gradient(135deg, #d43737, #ff6b6b)",
          border: "none",
          borderRadius: "50px",
          padding: "14px 22px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: "#fff",
          fontWeight: "700",
          fontSize: "0.88rem",
          cursor: "pointer",
          letterSpacing: "1px",
          boxShadow:
            "0 4px 20px rgba(212,55,55,0.5)",
          animation:
            "pqrsfPulse 2.5s ease-in-out infinite",
        }}
      >
        <span
          style={{
            fontSize: "1.1rem",
          }}
        >
          💬
        </span>

        PQRSF
      </button>

      {pqrsfAbierto && (
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
      )}

      <style>
        {`
          @keyframes pqrsfPulse {
            0%, 100% {
              box-shadow:
                0 4px 20px rgba(212,55,55,0.5);
            }

            50% {
              box-shadow:
                0 4px 32px rgba(212,55,55,0.8),
                0 0 0 6px rgba(212,55,55,0.15);
            }
          }
        `}
      </style>
    </>
  );

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

        {btnYModalPQRSF}
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

        {btnYModalPQRSF}
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
                      onClick={irAPago}
                      disabled={
                        enviando ||
                        !idMesaActiva
                      }
                    >
                      {enviando
                        ? "Preparando pago..."
                        : "Continuar al pago"}
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
                      totalPedido
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

      {btnYModalPQRSF}
    </>
  );
}

export default VistaCliente;
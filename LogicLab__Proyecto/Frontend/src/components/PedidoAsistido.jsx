import { useEffect, useState } from "react"
import axios from "axios"
import { LayoutMesero } from "./Panel_Mesero"
import '../../Hojas_de_Estilo/Mesero.css'

const API = "http://localhost:5030"

const fmt = n =>
    `$${Number(n || 0).toLocaleString("es-CO")}`

function PedidoAsistido() {

    const [mesas, setMesas] = useState([])
    const [platos, setPlatos] = useState([])
    const [categorias, setCategorias] = useState([])
    const [metodosPago, setMetodosPago] = useState([])
    const [menuDelDia, setMenuDelDia] = useState([])

    const [mesaSeleccionada, setMesaSeleccionada] = useState(null)
    const [carrito, setCarrito] = useState([])
    const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState(null)

    const [enviando, setEnviando] = useState(false)
    const [cargando, setCargando] = useState(true)

    // ─────────────────────────────────────────────
    // CARGAR DATOS
    // ─────────────────────────────────────────────

    useEffect(() => {

        const cargarDatos = async () => {

            try {

                const [resMesas, resPlatos, resCategorias, resMetodos, resMenuDia] =
                    await Promise.all([
                        axios.get(`${API}/api/mesas/listar`),
                        axios.get(`${API}/api/platos/listar`),
                        axios.get(`${API}/api/categorias/listar`),
                        axios.get(`${API}/api/metodo-pago/listar`),
                        axios.get(`${API}/api/menu-dia/hoy`)
                    ])

                setMesas(resMesas.data)

                setPlatos(
                    resPlatos.data.filter(p => p.Disponible === "Disponible")
                )

                setCategorias(resCategorias.data)

                setMetodosPago(resMetodos.data)

                if (resMenuDia.data && Array.isArray(resMenuDia.data.items)) {
                    setMenuDelDia(resMenuDia.data.items)
                }

            } catch (error) {

                console.error(
                    "Error cargando datos para pedido asistido:",
                    error
                )

            } finally {

                setCargando(false)

            }
        }

        cargarDatos()

    }, [])


    // ─────────────────────────────────────────────
    // MENÚ DEL DÍA
    // ─────────────────────────────────────────────

    /*
       El menú publicado se trae del backend (GET /api/menu-dia/hoy)
       junto con el resto de los datos, en el mismo useEffect de arriba.

       De esta manera Pedido Asistido muestra exactamente
       los mismos platos que aparecen en Menú del Día, sin
       depender de localStorage (que no se comparte entre
       dispositivos/navegadores).
    */

    // Solo dejamos platos disponibles que además
    // pertenecen al menú publicado.
    const platosDelMenu = menuDelDia.filter(menuItem => {

        return platos.some(
            plato =>
                plato.id_Platos === menuItem.id_Platos
        )

    })


    // ─────────────────────────────────────────────
    // CATEGORÍA
    // ─────────────────────────────────────────────

    const nombreCategoria = (idCategoria) => {

        const categoria = categorias.find(
            c =>
                String(c.id_Categoria) ===
                String(idCategoria)
        )

        if (categoria) {
            return categoria.NombreCategoria
        }

        // Para "Corriente del Día"
        if (String(idCategoria) === "1") {
            return "Carta Corriente"
        }

        return "Otros"
    }


    // ─────────────────────────────────────────────
    // AGRUPAR PLATOS
    // ─────────────────────────────────────────────

    const platosPorCategoria = platosDelMenu.reduce(
        (acc, plato) => {

            const categoria =
                nombreCategoria(plato.id_Categoria)

            if (!acc[categoria]) {
                acc[categoria] = []
            }

            acc[categoria].push(plato)

            return acc

        },
        {}
    )


    // ─────────────────────────────────────────────
    // AGREGAR AL PEDIDO
    // ─────────────────────────────────────────────

    const agregarAlCarrito = (plato) => {

        setCarrito(prev => {

            const existente = prev.find(
                item =>
                    item.plato.id_Platos ===
                    plato.id_Platos
            )

            if (existente) {

                return prev.map(item =>

                    item.plato.id_Platos ===
                    plato.id_Platos

                        ? {
                            ...item,
                            cantidad:
                                item.cantidad + 1
                        }

                        : item
                )
            }

            return [
                ...prev,
                {
                    plato,
                    cantidad: 1
                }
            ]
        })
    }


    // ─────────────────────────────────────────────
    // QUITAR DEL PEDIDO
    // ─────────────────────────────────────────────

    const quitarDelCarrito = (idPlato) => {

        setCarrito(prev =>

            prev
                .map(item =>

                    item.plato.id_Platos === idPlato

                        ? {
                            ...item,
                            cantidad:
                                item.cantidad - 1
                        }

                        : item
                )
                .filter(item =>
                    item.cantidad > 0
                )
        )
    }


    // ─────────────────────────────────────────────
    // ELIMINAR DEL PEDIDO (sin importar la cantidad)
    // ─────────────────────────────────────────────

    const eliminarDelCarrito = (idPlato) => {

        setCarrito(prev =>

            prev.filter(item =>
                item.plato.id_Platos !== idPlato
            )
        )
    }


    // ─────────────────────────────────────────────
    // TOTAL
    // ─────────────────────────────────────────────

    const totalCarrito = carrito.reduce(
        (total, item) =>
            total +
            Number(item.plato.Precio) *
            item.cantidad,
        0
    )


    // ─────────────────────────────────────────────
    // SELECCIÓN / DESELECCIÓN DE MESA
    // ─────────────────────────────────────────────

    const seleccionarMesa = (mesa) => {

        setMesaSeleccionada(actual => {

            // Si vuelve a tocar la misma mesa,
            // se deselecciona.
            if (
                actual &&
                actual.id_Mesas === mesa.id_Mesas
            ) {
                return null
            }

            return mesa
        })
    }


    // ─────────────────────────────────────────────
    // ENVIAR PEDIDO
    // ─────────────────────────────────────────────

    const enviarPedido = async () => {

        if (!mesaSeleccionada) {

            alert(
                "Selecciona primero la mesa del cliente."
            )

            return
        }

        if (carrito.length === 0) {

            alert(
                "Agrega al menos un plato al pedido."
            )

            return
        }

        if (!metodoPagoSeleccionado) {

            alert(
                "Selecciona con qué método pagó el cliente."
            )

            return
        }

        setEnviando(true)

        try {

            const items = carrito.map(item => ({

                idPlato:
                    item.plato.id_Platos,

                nombrePlato:
                    item.plato.NombrePlato,

                cantidadPedido:
                    item.cantidad,

                notasEspeciales:
                    null,

                precioFinal:
                    item.plato.Precio *
                    item.cantidad,

                idCategoria:
                    item.plato.id_Categoria
            }))


            await axios.post(
                `${API}/api/pedidos/crear`,
                {
                    idMesa:
                        mesaSeleccionada.id_Mesas,

                    totalPagar:
                        totalCarrito,

                    items,

                    idMetodoPago:
                        metodoPagoSeleccionado
                }
            )


            alert(
                `Pedido enviado para la Mesa #${mesaSeleccionada.Numero_mesa}.`
            )


            setCarrito([])

            setMesaSeleccionada(null)

            setMetodoPagoSeleccionado(null)


            const resMesas =
                await axios.get(
                    `${API}/api/mesas/listar`
                )

            setMesas(resMesas.data)

        } catch (error) {

            console.error(
                "Error creando pedido asistido:",
                error
            )

            const mensaje =
                error.response?.data?.message ||
                error.response?.data?.error ||
                "No se pudo enviar el pedido. Intenta de nuevo."

            alert(mensaje)

        } finally {

            setEnviando(false)

        }
    }


    // ─────────────────────────────────────────────
    // CARGANDO
    // ─────────────────────────────────────────────

    if (cargando) {

        return (
            <LayoutMesero paginaActual="pedidoasistido">

                <div className="pedido-asistido-loading">

                    <span>
                        Cargando menú...
                    </span>

                </div>

            </LayoutMesero>
        )
    }


    // ─────────────────────────────────────────────
    // VISTA
    // ─────────────────────────────────────────────

    return (

        <LayoutMesero paginaActual="pedidoasistido">

            <div className="pedido-asistido">

                {/* HEADER */}

                <div className="pedido-asistido-header">

                    <h1 className="mesero-titulo-seccion">
                        Pedidos asistidos
                    </h1>

                    <p>
                        Arma el pedido en nombre de un cliente
                        que se encuentra en su mesa.
                    </p>

                </div>


                {/* ───────────────────────────────
                    SELECCIÓN DE MESA
                ─────────────────────────────── */}

                <section className="pedido-mesas">

                    <div className="pedido-mesas-header">

                        <div>

                            <span className="pedido-label">
                                PEDIDO PARA
                            </span>

                            <h2>

                                {mesaSeleccionada ? (

                                    <>
                                        Mesa #
                                        <strong>
                                            {mesaSeleccionada.Numero_mesa}
                                        </strong>
                                    </>

                                ) : (

                                    <span className="mesa-sin-seleccionar">
                                        Selecciona una mesa
                                    </span>

                                )}

                            </h2>

                        </div>


                        {mesaSeleccionada && (

                            <button
                                className="pedido-quitar-mesa"
                                onClick={() =>
                                    setMesaSeleccionada(null)
                                }
                            >
                                Quitar mesa
                            </button>

                        )}

                    </div>


                    <div className="pedido-mesas-grid">

                        {mesas.map(mesa => {

                            const activa =
                                mesaSeleccionada?.id_Mesas ===
                                mesa.id_Mesas

                            return (

                                <button
                                    key={mesa.id_Mesas}
                                    className={
                                        `pedido-mesa-btn
                                        ${activa
                                            ? "pedido-mesa-activa"
                                            : ""}`
                                    }
                                    onClick={() =>
                                        seleccionarMesa(mesa)
                                    }
                                >

                                    <span>
                                        {mesa.Numero_mesa}
                                    </span>

                                    {activa && (
                                        <small>
                                            ✓
                                        </small>
                                    )}

                                </button>
                            )
                        })}

                    </div>

                </section>


                {/* ───────────────────────────────
                    CONTENIDO: MENÚ + PEDIDO
                ─────────────────────────────── */}

                <div className="pedido-asistido-grid">


                    {/* ─────────────────────────
                        MENÚ DEL DÍA
                    ───────────────────────── */}

                    <section className="pedido-menu">

                        <div className="pedido-menu-header">

                            <div>

                                <span>
                                    MENÚ DEL DÍA
                                </span>

                                <h2>
                                    Selecciona los platos
                                </h2>

                            </div>

                            <span className="pedido-menu-contador">

                                {platosDelMenu.length}{" "}
                                {platosDelMenu.length === 1
                                    ? "plato"
                                    : "platos"}

                            </span>

                        </div>


                        {platosDelMenu.length === 0 ? (

                            <div className="pedido-menu-vacio">

                                <div>
                                    🍽️
                                </div>

                                <h3>
                                    No hay menú publicado
                                </h3>

                                <p>
                                    El administrador todavía
                                    no ha publicado el menú del día.
                                </p>

                            </div>

                        ) : (

                            <div className="pedido-categorias">

                                {Object.entries(
                                    platosPorCategoria
                                ).map(
                                    ([categoria, lista]) => (

                                        <div
                                            className="pedido-categoria"
                                            key={categoria}
                                        >

                                            <div className="pedido-categoria-titulo">

                                                <span>
                                                    {categoria}
                                                </span>

                                            </div>


                                            <div className="pedido-platos-grid">

                                                {lista.map(plato => {

                                                    const cantidad =
                                                        carrito.find(
                                                            item =>
                                                                item.plato.id_Platos ===
                                                                plato.id_Platos
                                                        )?.cantidad || 0

                                                    return (

                                                        <button
                                                            key={plato.id_Platos}
                                                            className={
                                                                `pedido-plato-card
                                                                ${cantidad > 0
                                                                    ? "pedido-plato-seleccionado"
                                                                    : ""}`
                                                            }
                                                            onClick={() =>
                                                                agregarAlCarrito(plato)
                                                            }
                                                        >

                                                            <div className="pedido-plato-info">

                                                                <h3>
                                                                    {plato.NombrePlato}
                                                                </h3>

                                                                {plato.Descripcion && (

                                                                    <p>
                                                                        {plato.Descripcion}
                                                                    </p>

                                                                )}

                                                            </div>


                                                            <div className="pedido-plato-footer">

                                                                <strong>
                                                                    {fmt(plato.Precio)}
                                                                </strong>

                                                                {cantidad > 0 && (

                                                                    <span className="pedido-plato-cantidad">

                                                                        {cantidad}

                                                                    </span>

                                                                )}

                                                            </div>

                                                        </button>

                                                    )
                                                })}

                                            </div>

                                        </div>
                                    )
                                )}

                            </div>

                        )}

                    </section>


                    {/* ─────────────────────────
                        PEDIDO ACTUAL
                    ───────────────────────── */}

                    <aside className="pedido-resumen">

                        <div className="pedido-resumen-header">

                            <div>

                                <span>
                                    PEDIDO
                                </span>

                                <h2>
                                    Pedido actual
                                </h2>

                            </div>

                            <div className="pedido-resumen-icono">
                                🛒
                            </div>

                        </div>


                        {!mesaSeleccionada && (

                            <div className="pedido-aviso-mesa">

                                <span>
                                    🪑
                                </span>

                                <p>
                                    Selecciona una mesa
                                    para comenzar.
                                </p>

                            </div>

                        )}


                        {carrito.length === 0 ? (

                            <div className="pedido-vacio">

                                <div className="pedido-vacio-icono">
                                    🍽️
                                </div>

                                <h3>
                                    Pedido vacío
                                </h3>

                                <p>
                                    Selecciona un plato
                                    del menú para agregarlo.
                                </p>

                            </div>

                        ) : (

                            <div className="pedido-items">

                                {carrito.map(item => (

                                    <div
                                        className="pedido-item"
                                        key={item.plato.id_Platos}
                                    >

                                        <div className="pedido-item-info">

                                            <strong>
                                                {item.plato.NombrePlato}
                                            </strong>

                                            <span>
                                                {fmt(item.plato.Precio)}
                                                {" "}×{" "}
                                                {item.cantidad}
                                            </span>

                                        </div>


                                        <div className="pedido-item-control">

                                            <button
                                                onClick={() =>
                                                    quitarDelCarrito(
                                                        item.plato.id_Platos
                                                    )
                                                }
                                            >
                                                −
                                            </button>

                                            <span>
                                                {item.cantidad}
                                            </span>

                                            <button
                                                onClick={() =>
                                                    agregarAlCarrito(
                                                        item.plato
                                                    )
                                                }
                                            >
                                                +
                                            </button>

                                            <button
                                                className="pedido-item-quitar"
                                                title="Quitar del pedido"
                                                onClick={() =>
                                                    eliminarDelCarrito(
                                                        item.plato.id_Platos
                                                    )
                                                }
                                            >
                                                ✕
                                            </button>

                                        </div>


                                    </div>

                                ))}

                            </div>

                        )}


                        {/* MÉTODO DE PAGO */}

                        {carrito.length > 0 && (

                            <div className="pedido-metodo-pago">

                                <span className="pedido-label">
                                    ¿CON QUÉ PAGÓ EL CLIENTE?
                                </span>

                                <div className="pedido-metodos-grid">

                                    {metodosPago.map(metodo => (

                                        <button
                                            key={metodo.id_MetodoPago}
                                            type="button"
                                            className={
                                                `pedido-mesa-btn pedido-metodo-btn
                                                ${metodoPagoSeleccionado === metodo.id_MetodoPago
                                                    ? "pedido-mesa-activa"
                                                    : ""}`
                                            }
                                            onClick={() =>
                                                setMetodoPagoSeleccionado(
                                                    metodoPagoSeleccionado === metodo.id_MetodoPago
                                                        ? null
                                                        : metodo.id_MetodoPago
                                                )
                                            }
                                        >
                                            {metodo.NombreMetodo}
                                        </button>

                                    ))}

                                </div>

                            </div>

                        )}


                        {/* TOTAL */}

                        <div className="pedido-total">

                            <span>
                                Total
                            </span>

                            <strong>
                                {fmt(totalCarrito)}
                            </strong>

                        </div>


                        {/* BOTÓN */}

                        <button
                            className="pedido-enviar-btn"
                            onClick={enviarPedido}
                            disabled={
                                enviando ||
                                !mesaSeleccionada ||
                                carrito.length === 0 ||
                                !metodoPagoSeleccionado
                            }
                        >

                            {enviando
                                ? "Enviando pedido..."
                                : "Enviar pedido"}

                        </button>


                        <p className="pedido-ayuda">

                            {!mesaSeleccionada
                                ? "Selecciona una mesa para continuar"
                                : !metodoPagoSeleccionado && carrito.length > 0
                                    ? "Selecciona el método de pago para continuar"
                                    : `Pedido para Mesa #${mesaSeleccionada.Numero_mesa}`}

                        </p>

                    </aside>

                </div>

            </div>

        </LayoutMesero>
    )
}

export default PedidoAsistido
"use client"

import {
  ActionIcon,
  Button,
  Flex,
  Paper,
  Title,
  Group,
  Box,
  Text,
  TextInput,
  Select,
  NumberInput,
  Table,
  ScrollArea,
  Badge,
  Divider,
  Alert,
  LoadingOverlay,
  Tooltip,
  Kbd,
  Tabs,
  Radio,
  Switch,
} from "@mantine/core"
import {
  IconArrowLeft,
  IconShoppingBag,
  IconTrash,
  IconReceipt,
  IconUser,
  IconCalendar,
  IconSearch,
  IconCheck,
  IconAlertCircle,
  IconBarcode,
  IconCash,
  IconPercentage,
  IconPackage,
  IconReceipt2,
  IconUserCircle,
  IconEdit,
  IconCurrencyDollar,
} from "@tabler/icons-react"
import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { DateInput } from "@mantine/dates"
import { obtenerClientes } from "../services/ClienteService"
import { obtenerProductos } from "../services/ProductoService"
import { crearVenta } from "../services/VentaService"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { supabase } from "../../supabase/client"
import { getBase64ImageFromUrl } from "../services/GolbalService"
import Swal from "sweetalert2"

// Extend jsPDF to include lastAutoTable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: { finalY: number }
  }
}

interface DetalleVentaForm {
  IdProducto: number
  CodigoProducto: string
  DescripcionProducto: string
  CategoriaProducto: string
  MedidaProducto: string
  PrecioVenta: number
  PrecioOriginal: number // Solo para uso interno, no se guarda en BD
  Cantidad: number
  DescuentoP: number // Cambiado a number para facilitar cálculos
  SubTotal: number
  PrecioModificado: boolean // Solo para uso interno, no se guarda en BD
  DescuentoMonto: number // Nuevo campo para guardar el monto del descuento
}

// Interfaz para la venta según la estructura de la tabla VENTA
interface VentaForm {
  numeroDocumento: string
  fechaRegistro: Date
  usuarioRegistro: string
  documentoCliente: string
  nombreCliente: string
  cantidadProductos: number
  montoTotal: number
  pagoCon: string
  cambio: number
  comentario: string
  estatus: string
  porcentaje: number
  iva: number
  numEmpleado: string
  empleado: string
  metodoPago: "EFECTIVO" | "TARJETA" | "CREDITO" | "EFECTIVO/TARJETA"
}

// Interfaz para el cliente con los nuevos campos
interface ClienteForm {
  IdCliente: number
  Nombre: string
  Iva: boolean
  EmpleadoRequerido: boolean
  RequiereNumeroEmpleado: boolean
}

export function NuevaVenta() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loadingClientes, setLoadingClientes] = useState(true)
  const [loadingProductos, setLoadingProductos] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [clientes, setClientes] = useState<ClienteForm[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [productosFiltrados, setProductosFiltrados] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [barcodeScannerActive, setBarcodeScannerActive] = useState(false)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const [empresa, setEmpresa] = useState<any>(null)
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteForm | null>(null)

  // Estado para el precio modificado
  const [precioModificado, setPrecioModificado] = useState<number | "">("")
  const [editandoPrecio, setEditandoPrecio] = useState(false)

  // Estado para el formulario de venta
  const [venta, setVenta] = useState<VentaForm>({
    numeroDocumento: "",
    fechaRegistro: new Date(),
    usuarioRegistro: "",
    documentoCliente: "",
    nombreCliente: "",
    cantidadProductos: 0,
    montoTotal: 0,
    pagoCon: "",
    cambio: 0,
    comentario: "",
    estatus: "COMPLETADO",
    porcentaje: 0,
    iva: 0,
    numEmpleado: "",
    empleado: "",
    metodoPago: "EFECTIVO",
  })

  // Estado para el producto seleccionado actualmente
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null)
  const [cantidad, setCantidad] = useState<number | "">(1)
  const [descuento, setDescuento] = useState<number | "">(0)

  // Estado para la lista de productos en la venta
  const [detallesVenta, setDetallesVenta] = useState<DetalleVentaForm[]>([])

  // Cargar datos de la empresa
  useEffect(() => {
    const cargarDatosEmpresa = async () => {
      try {
        const { data, error } = await supabase.from("empresas").select("*").limit(1)

        if (error) {
          console.error("Error al cargar datos de empresa:", error)
          return
        }

        if (data && data.length > 0) {
          setEmpresa(data[0])
        }
      } catch (err) {
        console.error("Error inesperado al cargar datos de empresa:", err)
      }
    }

    cargarDatosEmpresa()
  }, [])

  // Cargar clientes
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const data = await obtenerClientes()
        const mappedData = data.map((cliente) => ({
          ...cliente,
          Iva: cliente.Iva || false,
          EmpleadoRequerido: cliente.EmpleadoRequerido || false,
          RequiereNumeroEmpleado: cliente.RequiereNumeroEmpleado || false,
        }))
        setClientes(mappedData)
      } catch (error) {
        console.error("Error al obtener clientes:", error)
        setError("No se pudieron cargar los clientes")
      } finally {
        setLoadingClientes(false)
      }
    }

    fetchClientes()
  }, [])

  // Cargar productos
  useEffect(() => {
    const fetchProductos = async () => {
      setLoadingProductos(true)
      try {
        const data = await obtenerProductos()
        setProductos(data)
        setProductosFiltrados(data)
      } catch (error) {
        console.error("Error al obtener productos:", error)
        setError("No se pudieron cargar los productos")
      } finally {
        setLoadingProductos(false)
      }
    }

    fetchProductos()
  }, [])

  // Filtrar productos según término de búsqueda (insensible a mayúsculas/minúsculas)
  useEffect(() => {
    if (searchTerm.trim() !== "") {
      const filtered = productos.filter(
        (producto) =>
          producto.Codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          producto.Descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
          producto.Categoria.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setProductosFiltrados(filtered)
    } else {
      setProductosFiltrados(productos)
    }
  }, [searchTerm, productos])

  // Opciones para el select de clientes
  const opcionesClientes = clientes.map((cliente) => ({
    value: cliente.IdCliente.toString(),
    label: cliente.Nombre,
  }))

  // Manejar cambio de cliente
  const handleClienteChange = (value: string | null) => {
    if (value) {
      const cliente = clientes.find((c) => c.IdCliente.toString() === value)
      // Si el cliente requiere número de empleado, establecer método de pago a CREDITO
      const metodoPago = cliente?.RequiereNumeroEmpleado ? "CREDITO" : venta.metodoPago
      if (cliente) {
        setClienteSeleccionado(cliente)
        setVenta({
          ...venta,
          documentoCliente: cliente.IdCliente.toString(),
          nombreCliente: cliente.Nombre,
          // Si el cliente tiene IVA activado, establecer el IVA predeterminado (por ejemplo, 16%)
          iva: cliente.Iva ? 16 : 0,
          metodoPago,
        })
      }
    } else {
      setClienteSeleccionado(null)
      setVenta({
        ...venta,
        documentoCliente: "",
        nombreCliente: "",
        iva: 0,
        metodoPago: "EFECTIVO",
      })
    }
  }

  // Manejar selección de producto
  const handleProductoSeleccionado = (producto: any) => {
    setProductoSeleccionado(producto)
    setCantidad(1)
    setDescuento(0)
    setPrecioModificado("")
    setEditandoPrecio(false)
  }

  // Calcular subtotal y descuento según las reglas
  const calcularSubtotalYDescuento = (
    precio: number,
    cantidad: number,
    descuentoPorcentaje: number,
    precioModificado: boolean,
  ) => {
    const subtotalSinDescuento = precio * cantidad

    // Si el precio fue modificado, no aplicar descuento por producto
    if (precioModificado) {
      return {
        subtotal: subtotalSinDescuento,
        descuentoMonto: 0,
      }
    }

    // Calcular el monto del descuento
    const descuentoMonto = (subtotalSinDescuento * descuentoPorcentaje) / 100

    return {
      subtotal: subtotalSinDescuento - descuentoMonto,
      descuentoMonto: descuentoMonto,
    }
  }

  // Agregar producto a la venta
  const agregarProducto = () => {
    if (!productoSeleccionado) {
      setError("Debe seleccionar un producto")
      return
    }

    if (!cantidad || cantidad <= 0) {
      setError("La cantidad debe ser mayor a 0")
      return
    }

    // Verificar stock disponible
    if (cantidad > Number(productoSeleccionado.Stock)) {
      setError(`Stock insuficiente. Solo hay ${productoSeleccionado.Stock} unidades disponibles.`)
      return
    }

    const descuentoPorcentaje = descuento || 0
    const isPrecioModificado = precioModificado !== ""
    const precioVentaFinal = isPrecioModificado
      ? Number(precioModificado)
      : Number.parseFloat(productoSeleccionado.PrecioVenta)

    // Si el precio está modificado, no permitir descuento
    if (isPrecioModificado && descuentoPorcentaje > 0) {
      setError(
        "No se puede aplicar descuento a un producto con precio modificado. Por favor, elija solo una opción: modificar precio o aplicar descuento.",
      )
      return
    }

    // Verificar si el producto ya está en la lista con el mismo precio y descuento
    const productoExistente = detallesVenta.find(
      (detalle) =>
        detalle.IdProducto === productoSeleccionado.Id_producto &&
        ((isPrecioModificado && detalle.PrecioModificado && detalle.PrecioVenta === precioVentaFinal) ||
          (!isPrecioModificado && !detalle.PrecioModificado && detalle.DescuentoP === descuentoPorcentaje)),
    )

    if (productoExistente) {
      // Verificar que la nueva cantidad total no exceda el stock
      const nuevaCantidad = productoExistente.Cantidad + (cantidad as number)
      if (nuevaCantidad > Number(productoSeleccionado.Stock)) {
        setError(
          `Stock insuficiente. Solo hay ${productoSeleccionado.Stock} unidades disponibles y ya tiene ${productoExistente.Cantidad} en el carrito.`,
        )
        return
      }

      // Actualizar cantidad si ya existe con el mismo precio y descuento
      const nuevosDetalles = detallesVenta.map((detalle) => {
        if (detalle === productoExistente) {
          const { subtotal, descuentoMonto } = calcularSubtotalYDescuento(
            detalle.PrecioVenta,
            nuevaCantidad,
            detalle.DescuentoP,
            detalle.PrecioModificado,
          )

          return {
            ...detalle,
            Cantidad: nuevaCantidad,
            SubTotal: subtotal,
            DescuentoMonto: descuentoMonto,
          }
        }
        return detalle
      })
      setDetallesVenta(nuevosDetalles)
    } else {
      // Verificar stock total para este producto
      const cantidadTotalEnCarrito = detallesVenta
        .filter((detalle) => detalle.IdProducto === productoSeleccionado.Id_producto)
        .reduce((total, detalle) => total + detalle.Cantidad, 0)

      if (cantidadTotalEnCarrito + (cantidad as number) > Number(productoSeleccionado.Stock)) {
        setError(
          `Stock insuficiente. Solo hay ${productoSeleccionado.Stock} unidades disponibles y ya tiene ${cantidadTotalEnCarrito} en el carrito.`,
        )
        return
      }

      // Agregar nuevo producto
      const precioOriginal = Number.parseFloat(productoSeleccionado.PrecioVenta)
      const { subtotal, descuentoMonto } = calcularSubtotalYDescuento(
        precioVentaFinal,
        cantidad as number,
        isPrecioModificado ? 0 : descuentoPorcentaje,
        isPrecioModificado,
      )

      const nuevoDetalle: DetalleVentaForm = {
        IdProducto: productoSeleccionado.Id_producto,
        CodigoProducto: productoSeleccionado.Codigo,
        DescripcionProducto: productoSeleccionado.Descripcion,
        CategoriaProducto: productoSeleccionado.Categoria,
        MedidaProducto: productoSeleccionado.Medida,
        PrecioVenta: precioVentaFinal,
        PrecioOriginal: precioOriginal,
        Cantidad: cantidad as number,
        DescuentoP: isPrecioModificado ? 0 : descuentoPorcentaje,
        SubTotal: subtotal,
        PrecioModificado: isPrecioModificado,
        DescuentoMonto: descuentoMonto,
      }
      setDetallesVenta([...detallesVenta, nuevoDetalle])
    }

    // Limpiar selección
    setProductoSeleccionado(null)
    setCantidad(1)
    setDescuento(0)
    setPrecioModificado("")
    setEditandoPrecio(false)
    setSearchTerm("")
    setError("")
  }

  const formatearFecha = (fecha: string | Date) => {
    const date = new Date(fecha)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  // Agregar la función para generar marca de agua en PDF cuando se cancela una venta
  // Agregar después de la función calcularCambio()

  // Agregar marca de agua "CANCELADO" al PDF
  const agregarMarcaDeAguaCancelado = (doc: jsPDF) => {
    // Configurar estilo de la marca de agua - más claro
    doc.setTextColor(255, 100, 100) // Rojo más intenso para que se vea a través de la tabla
    doc.setFontSize(100) // Tamaño más grande
    doc.setFont("helvetica", "bold")

    // Posicionar y rotar el texto en el centro de la página
    doc.text("CANCELADO", 140, 240, {
      align: "center",
      angle: 45, // Rotación de 45 grados
    })

    // Restaurar color de texto para el resto del documento
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
  }

  // Modificar la función imprimirComprobante para agregar la marca de agua si es necesario
  // Buscar en la función imprimirComprobante y agregar esta línea después de la configuración de la empresa:
  // Agregar marca de agua si está cancelada

  // Modificar la función imprimirComprobante para mostrar correctamente los precios originales y descuentos
  const imprimirComprobante = async (ventaData: any, detallesData: any ,RequiereEmpelado: boolean) => {
    if (!ventaData || !detallesData.length) return

    try {
      const doc = new jsPDF()

      // Configuración de la empresa
      const empresaInfo = {
        nombre: empresa?.nombre || "Mi Empresa",
        logo: empresa?.logo || "/logo.png",
        direccion: empresa?.direccion || "Dirección de la empresa",
        telefono: empresa?.telefono || "123-456-7890",
      }

      // Título
      doc.setFontSize(18)
      doc.text("Comprobante de Venta", 105, 15, { align: "center" })

      // Logo de la empresa
      let logoBase64 = ""
      if (empresaInfo.logo) {
        try {
          logoBase64 = await getBase64ImageFromUrl(empresaInfo.logo)
          doc.addImage(logoBase64, "PNG", 20, 1, 30, 30)
        } catch (error) {
          console.error("Error al cargar el logo:", error)
        }
      }

      // Agregar marca de agua si está cancelada
      if (ventaData.Estatus === "CANCELADO") {
        agregarMarcaDeAguaCancelado(doc)
      }

      // Información de la empresa
      doc.setFontSize(10)
      doc.text(empresaInfo.nombre, 160, 20)
      doc.text(empresaInfo.direccion, 160, 25)
      doc.text(`Tel: ${empresaInfo.telefono}`, 160, 30)

      // Información de la venta
      doc.setFontSize(12)
      doc.text(`Venta: ${ventaData.NumeroDocumento || "N/A"}`, 14, 40)
      doc.text(`Fecha: ${ventaData.FechaRegistro ? formatearFecha(ventaData.FechaRegistro) : "N/A"}`, 14, 48)
      doc.text(`Usuario: ${ventaData.UsuarioRegistro || "Admin"}`, 14, 56)
      if(RequiereEmpelado) {
        doc.text(`Empleado: ${ventaData.Empleado || "N/A"}`, 14, 64)
      }

      doc.text(`Cliente: ${ventaData.NombreCliente || "N/A"}`, 120, 40)
      doc.text(`ID Cliente: ${ventaData.DocumentoCliente || "N/A"}`, 120, 48)
      doc.text(`Productos: ${detallesData.length || 0}`, 120, 56)
      doc.text(`IVA: ${ventaData.Iva || 0}%`, 120, 64)

      // Calcular subtotal (suma de todos los productos)
      const subtotal = detallesData.reduce(
        (total: number, detalle: any) => total + Number.parseFloat(detalle.SubTotal || 0),
        0,
      )

      // Calcular descuento general si existe
      let descuentoGeneral = 0
      let mostrarDescuentoGeneral = true

      if (Number(ventaData.Porcentaje) > 0) {
        // Calcular el total de productos sin precio modificado y sin descuento individual
        const totalSinPrecioModificadoYSinDescuento = detallesData
          .filter((detalle: any) => !detalle.PrecioModificado && Number(detalle.DescuentoP) === 0)
          .reduce((total: number, detalle: any) => total + Number.parseFloat(detalle.SubTotal || 0), 0)

        descuentoGeneral = (totalSinPrecioModificadoYSinDescuento * Number(ventaData.Porcentaje)) / 100

        // Si no hay productos sin precio modificado y sin descuento individual, no mostrar descuento general
        if (totalSinPrecioModificadoYSinDescuento === 0) {
          mostrarDescuentoGeneral = false
        }
      } else {
        mostrarDescuentoGeneral = false
      }

      // Calcular subtotal con descuento
      const subtotalConDescuento = mostrarDescuentoGeneral ? subtotal - descuentoGeneral : subtotal

      // Calcular IVA sobre el subtotal con descuento
      const iva = (subtotalConDescuento * Number(ventaData.Iva || 0)) / 100

      // Calcular total final (subtotal con descuento + IVA)
      const totalFinal = subtotalConDescuento + iva

      // Tabla de productos
      const tableColumn = ["Código", "Descripción", "Precio", "Cantidad", "Descuento", "Subtotal"]

      // Filas de productos
      const tableRows = detallesData.map((detalle: any) => {
        if (Number(detalle.DescuentoP) > 0 && !detalle.PrecioModificado) {
          const precioOriginal = Number.parseFloat(detalle.PrecioOriginal || detalle.PrecioVenta)
          const descuentoMonto = (precioOriginal * Number(detalle.DescuentoP)) / 100
          const precioConDescuento = precioOriginal - descuentoMonto

          return [
            detalle.CodigoProducto || "N/A",
            detalle.DescripcionProducto || "N/A",
            `$ ${precioOriginal.toFixed(2)} (-${detalle.DescuentoP}%)`,
            detalle.Cantidad || 0,
            `$ ${descuentoMonto.toFixed(2)}`,
            `$ ${Number.parseFloat(detalle.SubTotal || 0).toFixed(2)}`,
          ]
        } else {
          return [
            detalle.CodigoProducto || "N/A",
            detalle.DescripcionProducto || "N/A",
            `$ ${Number.parseFloat(detalle.PrecioVenta || 0).toFixed(2)}${detalle.PrecioModificado ? "*" : ""}`,
            detalle.Cantidad || 0,
            `${detalle.DescuentoP || 0}%`,
            `$ ${Number.parseFloat(detalle.SubTotal || 0).toFixed(2)}`,
          ]
        }
      })

      // Filas de totales
      const totalRows = [["", "", "", "", "Subtotal:", `$ ${subtotal.toFixed(2)}`]]

      // Agregar fila de descuento si aplica
      if (mostrarDescuentoGeneral && descuentoGeneral > 0) {
        totalRows.push(["", "", "", "", `Descuento (${ventaData.Porcentaje}%):`, `- $ ${descuentoGeneral.toFixed(2)}`])
        totalRows.push(["", "", "", "", "Subtotal con descuento:", `$ ${subtotalConDescuento.toFixed(2)}`])
      }

      // Agregar fila de IVA si aplica
      if (Number(ventaData.Iva) > 0) {
        totalRows.push(["", "", "", "", `IVA (${ventaData.Iva}%):`, `$ ${iva.toFixed(2)}`])
      }

      // Agregar fila de total (ahora incluye IVA)
      totalRows.push(["", "", "", "", "Total:", `$ ${totalFinal.toFixed(2)}`])

      // Renderizar tabla de productos
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 72,
        theme: "grid",
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: { fillColor: [66, 139, 202] },
      })

      const finalY = doc.lastAutoTable?.finalY || 70

      // Renderizar tabla de totales
      autoTable(doc, {
        body: totalRows,
        startY: finalY + 5,
        theme: "plain",
        styles: {
          fontSize: 10,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 60 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 30, halign: "right", fontStyle: "bold" },
          5: { cellWidth: 30, halign: "right", fontStyle: "bold" },
        },
        margin: { left: 15 },
      })

      const finalTotalsY = doc.lastAutoTable?.finalY || finalY + 5

      // Método de pago
      doc.setFontSize(11)
      doc.text(
        `Método de pago: ${
          ventaData.TPago === "TARJETA" ? "Tarjeta" : ventaData.TPago === "EFECTIVO" ? "Efectivo" : ventaData.TPago === "CREDITO" ? "Credito" : "Efectivo/Tarjeta"
        }`,
        14,
        finalTotalsY + 15,
      )

      // Información de pago (si es efectivo)
      if (ventaData.TPago === "EFECTIVO" && ventaData.PagoCon) {
        doc.text(`Pagó con: $ ${Number.parseFloat(ventaData.PagoCon).toFixed(2)} MXN`, 14, finalTotalsY + 25)
        doc.text(`Cambio: $ ${Number.parseFloat(ventaData.Cambio).toFixed(2)} MXN`, 14, finalTotalsY + 35)
      }

      // Estado de la venta
      doc.text(`Estado: ${ventaData.Estatus}`, 14, finalTotalsY + 50)

      // Pie de página
      doc.setFontSize(10)
      doc.text(`Documento generado el ${new Date().toLocaleString()}`, 105, 280, { align: "center" })

      // Habilitar impresión automática
      doc.autoPrint()

      // Abrir en nueva ventana para imprimir
      const pdfBlob = doc.output("blob")
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, "_blank")

      // Liberar memoria
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 100)
    } catch (error) {
      console.error("Error al generar PDF para imprimir:", error)
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo generar el comprobante para impresión",
      })
    }
  }

  // Eliminar producto de la venta
  const eliminarProducto = (index: number) => {
    setDetallesVenta(detallesVenta.filter((_, i) => i !== index))
  }

  // Agregar una nueva función para modificar la cantidad de un producto ya agregado
  const modificarCantidadProducto = (index: number, nuevaCantidad: number) => {
    // Obtener el producto actual
    const producto = detallesVenta[index]

    // Verificar stock disponible
    const productoOriginal = productos.find((p) => p.Id_producto === producto.IdProducto)

    if (!productoOriginal) {
      setError("No se encontró información del producto")
      return
    }

    // Verificar que la nueva cantidad no exceda el stock
    if (nuevaCantidad > Number(productoOriginal.Stock)) {
      setError(`Stock insuficiente. Solo hay ${productoOriginal.Stock} unidades disponibles.`)
      return
    }

    // Si la cantidad es 0, preguntar si desea eliminar el producto
    if (nuevaCantidad === 0) {
      Swal.fire({
        title: "¿Eliminar producto?",
        text: `¿Desea eliminar ${producto.DescripcionProducto} del carrito?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "No, mantener",
      }).then((result) => {
        if (result.isConfirmed) {
          eliminarProducto(index)
        }
      })
      return
    }

    // Actualizar la cantidad y recalcular el subtotal
    const nuevosDetalles = [...detallesVenta]
    const { subtotal, descuentoMonto } = calcularSubtotalYDescuento(
      producto.PrecioVenta,
      nuevaCantidad,
      producto.DescuentoP,
      producto.PrecioModificado,
    )

    nuevosDetalles[index] = {
      ...producto,
      Cantidad: nuevaCantidad,
      SubTotal: subtotal,
      DescuentoMonto: descuentoMonto,
    }

    setDetallesVenta(nuevosDetalles)
  }

  // Calcular total de la venta
  const totalVenta = detallesVenta.reduce((total, detalle) => total + detalle.SubTotal, 0)

  // Calcular total con descuento general y IVA
  // Modificar la función calcularTotalSinPrecioModificado para excluir productos con descuento individual
  const calcularTotalSinPrecioModificado = () => {
    return detallesVenta
      .filter((detalle) => !detalle.PrecioModificado && detalle.DescuentoP === 0)
      .reduce((total, detalle) => total + detalle.SubTotal, 0)
  }

  // Modificar la función calcularSubtotalSinDescuentos para calcular el subtotal total before descuento general
  const calcularSubtotalSinDescuentos = () => {
    return detallesVenta.reduce((total, detalle) => total + detalle.SubTotal, 0)
  }

  // Modificar la función calcularDescuentoGeneral para aplicar solo a productos sin descuento individual
  const calcularDescuentoGeneral = () => {
    if (venta.porcentaje <= 0) return 0

    const totalSinModificarYSinDescuento = calcularTotalSinPrecioModificado()
    return (totalSinModificarYSinDescuento * venta.porcentaje) / 100
  }

  const calcularSubtotalConDescuento = () => {
    const subtotal = calcularSubtotalSinDescuentos()
    const descuento = calcularDescuentoGeneral()
    return subtotal - descuento
  }

  const calcularIVA = () => {
    const subtotalConDescuento = calcularSubtotalConDescuento()
    return (subtotalConDescuento * venta.iva) / 100
  }

  const calcularTotalConDescuentoGeneral = () => {
    const subtotalConDescuento = calcularSubtotalConDescuento()
    const iva = calcularIVA()
    return subtotalConDescuento + iva
  }

  // Métodos adicionales para mostrar en el desglose
  const getDesglosePrecios = () => {
    const subtotal = calcularSubtotalSinDescuentos()
    const descuento = calcularDescuentoGeneral()
    const subtotalConDescuento = calcularSubtotalConDescuento()
    const iva = calcularIVA()
    const total = calcularTotalConDescuentoGeneral()

    return {
      subtotal,
      descuento,
      subtotalConDescuento,
      iva,
      total,
    }
  }

  // Calcular cambio
  const calcularCambio = () => {
    if (!venta.pagoCon || venta.metodoPago !== "EFECTIVO") return 0
    const pagoCon = Number.parseFloat(venta.pagoCon)
    const totalFinal = calcularTotalConDescuentoGeneral()
    return Math.max(0, pagoCon - totalFinal)
  }

  // Guardar venta
  const guardarVenta = async () => {
    if (!venta.nombreCliente) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "El nombre del cliente es requerido",
        confirmButtonColor: "#3085d6",
        timer: 1500,
      })
      return
    }

    if (detallesVenta.length === 0) {
      setError("Debe agregar al menos un producto a la venta")
      return
    }

    // Validar si se requiere empleado
    if (clienteSeleccionado?.EmpleadoRequerido && !venta.empleado) {
      setError("Este cliente requiere un empleado asignado")
      return
    }

    // Validar si se requiere número de empleado
    if (clienteSeleccionado?.RequiereNumeroEmpleado && !venta.numEmpleado) {
      setError("Este cliente requiere un número de empleado")
      return
    }

    const totalFinal = calcularTotalConDescuentoGeneral()

    // Validación diferente para crédito
    if (venta.metodoPago === "EFECTIVO" && (!venta.pagoCon || Number.parseFloat(venta.pagoCon) < totalFinal)) {
      setError("El monto pagado debe ser igual o mayor al total de la venta")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Preparar datos para el servicio
      const cambio = calcularCambio().toString()
      const cproductos = detallesVenta.reduce((acc, detalle) => {
        return acc + Number(detalle.Cantidad);
      }, 0);
      const ventaData = {
        NumeroDocumento: venta.numeroDocumento,
        FechaRegistro: venta.fechaRegistro.toISOString(),
        UsuarioRegistro: venta.usuarioRegistro,
        DocumentoCliente: venta.documentoCliente,
        NombreCliente: venta.nombreCliente,
        CantidadProductos: cproductos,
        MontoTotal: totalFinal.toString(),
        PagoCon: venta.pagoCon || "0",
        Cambio: cambio,
        Comentario: venta.comentario || "",
        Estatus: venta.estatus,
        Porcentaje: venta.porcentaje.toString(),
        Iva: venta.iva.toString(),
        NumEmpleado: venta.numEmpleado,
        Empleado: venta.empleado,
        TPago: venta.metodoPago,
      }

      // Preparar detalles para el servicio - adaptando al esquema de la BD
      const detallesData = detallesVenta.map((detalle) => ({
        IdProducto: detalle.IdProducto,
        CodigoProducto: detalle.CodigoProducto,
        DescripcionProducto: detalle.DescripcionProducto,
        CategoriaProducto: detalle.CategoriaProducto,
        MedidaProducto: detalle.MedidaProducto,
        PrecioVenta: detalle.PrecioVenta.toString(),
        Cantidad: detalle.Cantidad,
        SubTotal: detalle.SubTotal.toString(),
        DescuentoP: detalle.DescuentoP, // Guardar el monto del descuento
        PrecioModificado: detalle.PrecioModificado,
        // Campos internos para el comprobante pero no para la BD
        //PrecioOriginal: detalle.PrecioOriginal.toString(),
      }))

      // Llamar al servicio para crear la venta
      await crearVenta(ventaData, detallesData)

      setSuccess(true)

      // Imprimir comprobante después de guardar
      if (venta.estatus === "COMPLETADO") {
        await imprimirComprobante(ventaData, detallesData, !!clienteSeleccionado?.EmpleadoRequerido)
      }

      // Redirigir después de un breve retraso
      setTimeout(() => {
        navigate("/ventas")
      }, 1500)
    } catch (error: any) {
      console.error("Error al guardar venta:", error)
      setError(error.message || "Ocurrió un error al guardar la venta")
    } finally {
      setLoading(false)
    }
  }

  // Función para procesar el código de barras escaneado (insensible a mayúsculas/minúsculas)
  const procesarCodigoBarras = (codigo: string) => {
    // Buscar el producto por código de barras (insensible a mayúsculas/minúsculas)
    const productoEncontrado = productos.find((p) => p.Codigo.toLowerCase() === codigo.toLowerCase())

    if (productoEncontrado) {
      // Verificar stock disponible
      if (Number(productoEncontrado.Stock) <= 0) {
        Swal.fire({
          icon: "error",
          title: "Sin stock",
          text: `El producto ${productoEncontrado.Descripcion} no tiene stock disponible`,
          confirmButtonColor: "#3085d6",
        })
        return
      }

      // Verificar si el producto ya está en la lista con precio normal (sin modificar y sin descuento)
      const productoExistente = detallesVenta.find(
        (d) => d.IdProducto === productoEncontrado.Id_producto && !d.PrecioModificado && d.DescuentoP === 0,
      )

      if (productoExistente) {
        // Verificar que la nueva cantidad no exceda el stock
        if (productoExistente.Cantidad + 1 > Number(productoEncontrado.Stock)) {
          Swal.fire({
            icon: "error",
            title: "Stock insuficiente",
            text: `Solo hay ${productoEncontrado.Stock} unidades disponibles y ya tiene ${productoExistente.Cantidad} en el carrito`,
            confirmButtonColor: "#3085d6",
          })
          return
        }

        // Actualizar cantidad si ya existe con precio normal
        const nuevosDetalles = detallesVenta.map((detalle) => {
          if (detalle === productoExistente) {
            const nuevaCantidad = detalle.Cantidad + 1
            const { subtotal, descuentoMonto } = calcularSubtotalYDescuento(
              detalle.PrecioVenta,
              nuevaCantidad,
              detalle.DescuentoP,
              detalle.PrecioModificado,
            )
            return {
              ...detalle,
              Cantidad: nuevaCantidad,
              SubTotal: subtotal,
              DescuentoMonto: descuentoMonto,
            }
          }
          return detalle
        })
        setDetallesVenta(nuevosDetalles)
      } else {
        // Verificar stock total para este producto
        const cantidadTotalEnCarrito = detallesVenta
          .filter((detalle) => detalle.IdProducto === productoEncontrado.Id_producto)
          .reduce((total, detalle) => total + detalle.Cantidad, 0)

        if (cantidadTotalEnCarrito + 1 > Number(productoEncontrado.Stock)) {
          Swal.fire({
            icon: "error",
            title: "Stock insuficiente",
            text: `Solo hay ${productoEncontrado.Stock} unidades disponibles y ya tiene ${cantidadTotalEnCarrito} en el carrito`,
            confirmButtonColor: "#3085d6",
          })
          return
        }

        // Agregar nuevo producto
        const precioVenta = Number.parseFloat(productoEncontrado.PrecioVenta)
        const { subtotal, descuentoMonto } = calcularSubtotalYDescuento(precioVenta, 1, 0, false)

        const nuevoDetalle: DetalleVentaForm = {
          IdProducto: productoEncontrado.Id_producto,
          CodigoProducto: productoEncontrado.Codigo,
          DescripcionProducto: productoEncontrado.Descripcion,
          CategoriaProducto: productoEncontrado.Categoria,
          MedidaProducto: productoEncontrado.Medida,
          PrecioVenta: precioVenta,
          PrecioOriginal: precioVenta,
          Cantidad: 1,
          DescuentoP: 0,
          SubTotal: subtotal,
          PrecioModificado: false,
          DescuentoMonto: descuentoMonto,
        }
        setDetallesVenta([...detallesVenta, nuevoDetalle])

        Swal.fire({
          position: "top-end",
          icon: "success",
          title: `Producto agregado`,
          text: productoEncontrado.Descripcion,
          showConfirmButton: false,
          timer: 1000,
          toast: true,
        })
      }
    } else {
      Swal.fire({
        icon: "error",
        title: "Producto no encontrado",
        text: `No se encontró ningún producto con el código: ${codigo}`,
        confirmButtonColor: "#3085d6",
      })
    }
  }

  // Manejador de eventos para el escáner de código de barras
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Solo procesar si el escáner está activo
      if (!barcodeScannerActive) return

      // Si es Enter, procesar el código de barras
      if (e.key === "Enter") {
        e.preventDefault()

        // Obtener el valor del input del escáner
        const codigo = barcodeInputRef.current?.value.trim()

        if (codigo && codigo.length > 0) {
          procesarCodigoBarras(codigo)

          // Limpiar el input después de procesar
          if (barcodeInputRef.current) {
            barcodeInputRef.current.value = ""
          }
        }
      }
      // Desactivar el escáner con Escape
      else if (e.key === "Escape") {
        setBarcodeScannerActive(false)
        if (barcodeInputRef.current) {
          barcodeInputRef.current.value = ""
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [barcodeScannerActive, productos, detallesVenta])

  // Activar/desactivar el escáner de código de barras
  const toggleBarcodeScanner = () => {
    const nuevoEstado = !barcodeScannerActive
    setBarcodeScannerActive(nuevoEstado)

    if (nuevoEstado) {
      // Enfocar el input cuando se activa el escáner
      setTimeout(() => {
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus()
          barcodeInputRef.current.value = "" // Limpiar el input al activar
        }
      }, 100)

      Swal.fire({
        position: "top-end",
        icon: "info",
        title: "Escáner activado",
        text: "Listo para escanear códigos de barras",
        showConfirmButton: false,
        timer: 1000,
        toast: true,
      })
    } else {
      Swal.fire({
        position: "top-end",
        icon: "info",
        title: "Escáner desactivado",
        showConfirmButton: false,
        timer: 1000,
        toast: true,
      })
    }
  }

  // Función para editar el precio de un producto en la lista
  const editarPrecioProducto = (index: number) => {
    const producto = detallesVenta[index]
    if (!producto) return

    // Si el producto tiene descuento, mostrar advertencia pero permitir continuar
    if (producto.DescuentoP > 0) {
      Swal.fire({
        icon: "warning",
        title: "Advertencia",
        text: "Este producto tiene un descuento aplicado. Si modifica el precio, se eliminará el descuento.",
        showCancelButton: true,
        confirmButtonText: "Continuar",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          mostrarDialogoEditarPrecio(producto, index)
        }
      })
    } else {
      mostrarDialogoEditarPrecio(producto, index)
    }
  }

  // Nueva función para mostrar el diálogo de edición de precio
  const mostrarDialogoEditarPrecio = (producto: DetalleVentaForm, index: number) => {
    Swal.fire({
      title: "Modificar precio",
      text: `Producto: ${producto.DescripcionProducto}`,
      input: "number",
      inputLabel: "Nuevo precio",
      inputValue: producto.PrecioVenta,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      inputValidator: (value) => {
        if (!value || Number(value) <= 0) {
          return "Debe ingresar un precio válido mayor a 0"
        }
        return null
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const nuevoPrecio = Number(result.value)

        // Actualizar el precio del producto SOLO para el índice específico
        const nuevosDetalles = [...detallesVenta]
        const subtotal = nuevoPrecio * producto.Cantidad

        nuevosDetalles[index] = {
          ...producto,
          PrecioVenta: nuevoPrecio,
          DescuentoP: 0, // Eliminar cualquier descuento existente
          SubTotal: subtotal,
          PrecioModificado: true,
          DescuentoMonto: 0,
        }

        setDetallesVenta(nuevosDetalles)

        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Precio modificado",
          text: `Nuevo precio: ${nuevoPrecio.toFixed(2)}`,
          showConfirmButton: false,
          timer: 1500,
          toast: true,
        })
      }
    })
  }

  // Agregar función para editar el porcentaje de descuento de un producto
  const editarDescuentoProducto = (index: number) => {
    const producto = detallesVenta[index]
    if (!producto) return

    // Si el producto tiene precio modificado, mostrar advertencia pero permitir continuar
    if (producto.PrecioModificado) {
      Swal.fire({
        icon: "warning",
        title: "Advertencia",
        text: "Este producto tiene un precio modificado. Si aplica un descuento, se usará el precio original.",
        showCancelButton: true,
        confirmButtonText: "Continuar",
        cancelButtonText: "Cancelar",
      }).then((result) => {
        if (result.isConfirmed) {
          mostrarDialogoEditarDescuento(producto, index)
        }
      })
    } else {
      mostrarDialogoEditarDescuento(producto, index)
    }
  }

  // Nueva función para mostrar el diálogo de edición de descuento
  const mostrarDialogoEditarDescuento = (producto: DetalleVentaForm, index: number) => {
    Swal.fire({
      title: "Modificar descuento",
      text: `Producto: ${producto.DescripcionProducto}`,
      input: "number",
      inputLabel: "Porcentaje de descuento",
      inputValue: producto.DescuentoP,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      inputValidator: (value) => {
        if (value === null || value === undefined || value === "") {
          return "Debe ingresar un valor"
        }
        const numValue = Number(value)
        if (isNaN(numValue) || numValue < 0 || numValue > 100) {
          return "El descuento debe estar entre 0 y 100%"
        }
        return null
      },
    }).then((result) => {
      if (result.isConfirmed) {
        const nuevoDescuento = Number(result.value)

        // Actualizar el descuento del producto SOLO para el índice específico
        const nuevosDetalles = [...detallesVenta]

        // Si tenía precio modificado, restaurar al precio original
        const precioAUsar = producto.PrecioModificado ? producto.PrecioOriginal : producto.PrecioVenta
        const { subtotal, descuentoMonto } = calcularSubtotalYDescuento(
          precioAUsar,
          producto.Cantidad,
          nuevoDescuento,
          false, // Ya no tiene precio modificado
        )

        nuevosDetalles[index] = {
          ...producto,
          PrecioVenta: precioAUsar,
          DescuentoP: nuevoDescuento,
          SubTotal: subtotal,
          PrecioModificado: false,
          DescuentoMonto: descuentoMonto,
        }

        setDetallesVenta(nuevosDetalles)

        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Descuento modificado",
          text: `Nuevo descuento: ${nuevoDescuento}%`,
          showConfirmButton: false,
          timer: 1500,
          toast: true,
        })
      }
    })
  }

  return (
    <Paper shadow="xs" p="xl" radius="md" w="100%" h="100%" pos="relative">
      <LoadingOverlay visible={loading} overlayBlur={2} />

      <Flex direction="column" h="100%" gap="xl">
        {/* Header */}
        <Flex w="100%" align="center" justify="space-between">
          <Group>
            <ActionIcon color="blue" size="lg" variant="light" onClick={() => navigate(-1)} radius="xl">
              <IconArrowLeft size="1.2rem" />
            </ActionIcon>
            <Title
              order={2}
              sx={(theme) => ({
                fontSize: "calc(1.1rem + 0.5vw)",
                color: theme.colors.blue[7],
              })}
            >
              Nueva Venta
            </Title>
          </Group>
          <IconShoppingBag size={28} color="#228be6" />
        </Flex>

        {success && (
          <Alert
            icon={<IconCheck size={16} />}
            title="¡Venta registrada con éxito!"
            color="green"
            withCloseButton
            onClose={() => setSuccess(false)}
          >
            La venta ha sido registrada correctamente.
          </Alert>
        )}

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error"
            color="red"
            withCloseButton
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}

        {/* Formulario de Venta */}
        <Paper p="md" radius="md" withBorder>
          <Title order={4} mb="md">
            Información de la Venta
          </Title>

          <Group grow mb="md">
            <TextInput
              label="Número de Documento"
              placeholder="Factura, Boleta, etc."
              value={venta.numeroDocumento}
              onChange={(e) => setVenta({ ...venta, numeroDocumento: e.target.value })}
              icon={<IconReceipt size={16} />}
            />

            <DateInput
              label="Fecha"
              placeholder="Seleccione fecha"
              value={venta.fechaRegistro}
              onChange={(date) => date && setVenta({ ...venta, fechaRegistro: date })}
              icon={<IconCalendar size={16} />}
              required
            />
          </Group>

          <Select
            label="Cliente"
            placeholder="Seleccione un cliente"
            data={opcionesClientes}
            value={venta.documentoCliente}
            onChange={handleClienteChange}
            icon={<IconUser size={16} />}
            searchable
            nothingFound="No se encontraron clientes"
            required
            disabled={loadingClientes}
            mb="md"
          />

          {/* Campos de empleado condicionados por el cliente seleccionado */}
          {clienteSeleccionado?.EmpleadoRequerido && (
            <Group grow mb="md">
              {clienteSeleccionado.RequiereNumeroEmpleado && (
                <TextInput
                  label="Número de Empleado"
                  placeholder="Ingrese el número de empleado"
                  value={venta.numEmpleado}
                  onChange={(e) => setVenta({ ...venta, numEmpleado: e.target.value })}
                  icon={<IconUserCircle size={16} />}
                  required
                />
              )}
              <TextInput
                label="Nombre del Empleado"
                placeholder="Ingrese el nombre del empleado"
                value={venta.empleado}
                onChange={(e) => setVenta({ ...venta, empleado: e.target.value })}
                icon={<IconUser size={16} />}
                required
              />
            </Group>
          )}

          <Group grow mb="md">
            <Radio.Group
              label="Método de Pago"
              value={venta.metodoPago}
              onChange={(value: "EFECTIVO" | "TARJETA" | "CREDITO") => {
                // Solo permitir cambiar si no es un cliente que requiere número de empleado
                if (!clienteSeleccionado?.RequiereNumeroEmpleado) {
                  setVenta({ ...venta, metodoPago: value })
                }
              }}
              required
            >
              <Group mt="xs">
                <Radio value="EFECTIVO" label="Efectivo" disabled={clienteSeleccionado?.RequiereNumeroEmpleado} />
                <Radio value="TARJETA" label="Tarjeta" disabled={clienteSeleccionado?.RequiereNumeroEmpleado} />
                <Radio value="EFECTIVO/TARJETA" label="Efectivo/Tarjeta" disabled={clienteSeleccionado?.RequiereNumeroEmpleado} />
                <Radio value="CREDITO" label="Crédito" />
              </Group>
            </Radio.Group>

            {venta.metodoPago === "EFECTIVO" && (
              <NumberInput
                label="Pagó con"
                placeholder="Monto recibido"
                value={venta.pagoCon === "" ? "" : Number(venta.pagoCon)}
                onChange={(val) =>
                  setVenta({
                    ...venta,
                    pagoCon: val === "" ? "" : val.toString(),
                  })
                }
                min={0}
                precision={2}
                step={10}
                icon={<IconCash size={16} />}
                required
              />
            )}
          </Group>

          <Group grow mb="md">
            <NumberInput
              label="IVA (%)"
              placeholder="Porcentaje de IVA"
              value={venta.iva}
              onChange={(val) =>
                setVenta({
                  ...venta,
                  iva: val === "" ? 0 : Math.round(Number(val)),
                })
              }
              min={0}
              max={100}
              precision={0} // Cambiado de 2 a 0 para no mostrar decimales
              step={1}
              icon={<IconReceipt2 size={16} />}
              disabled={clienteSeleccionado?.Iva}
            />

            {/* Modificar la función NumberInput para el descuento general para permitir descuentos individuales */}
            <NumberInput
              label="Descuento General (%)"
              placeholder="Porcentaje de descuento"
              value={venta.porcentaje}
              onChange={(val) => {
                const nuevoValor = val === "" ? 0 : Number(val)
                // Ya no mostrar advertencia si hay productos con descuento individual
                setVenta({ ...venta, porcentaje: nuevoValor })
              }}
              min={0}
              max={100}
              precision={2}
              step={5}
              icon={<IconPercentage size={16} />}
            />
          </Group>

          {venta.metodoPago === "EFECTIVO" &&
            venta.pagoCon &&
            Number(venta.pagoCon) >= calcularTotalConDescuentoGeneral() && (
              <Group position="right" mb="md">
                <Text>Cambio: </Text>
                <Badge size="lg" color="green">
                  $ {calcularCambio().toFixed(2)} MXN
                </Badge>
              </Group>
            )}

          <TextInput
            label="Comentarios"
            placeholder="Comentarios adicionales sobre la venta"
            value={venta.comentario}
            onChange={(e) => setVenta({ ...venta, comentario: e.target.value })}
            mb="md"
          />

          <Select
            label="Estado"
            placeholder="Seleccione el estado de la venta"
            data={[
              { value: "COMPLETADO", label: "Completado" },
              { value: "PENDIENTE", label: "Pendiente" },
              { value: "CANCELADO", label: "Cancelado" },
            ]}
            value={venta.estatus}
            onChange={(value) => value && setVenta({ ...venta, estatus: value })}
            mb="md"
          />
        </Paper>

        {/* Selección de Productos */}
        <Paper p="md" radius="md" withBorder>
          <Group position="apart" mb="md">
            <Title order={4}>Agregar Productos</Title>
            <Group>
              <Button
                variant={barcodeScannerActive ? "filled" : "light"}
                color={barcodeScannerActive ? "green" : "blue"}
                leftIcon={<IconBarcode size={16} />}
                onClick={toggleBarcodeScanner}
              >
                {barcodeScannerActive ? "Escáner Activo" : "Activar Escáner"}
              </Button>
              {barcodeScannerActive && (
                <Text size="sm" color="dimmed">
                  Escanee un código de barras o presione <Kbd>Esc</Kbd> para desactivar
                </Text>
              )}
            </Group>
          </Group>

          {/* Input oculto para el escáner de código de barras */}
          <TextInput
            ref={barcodeInputRef}
            type="text"
            style={{
              position: "absolute",
              opacity: 0,
              height: 0,
              width: 0,
              padding: 0,
              border: "none",
            }}
            onBlur={() => {
              if (barcodeScannerActive && barcodeInputRef.current) {
                barcodeInputRef.current.focus()
              }
            }}
          />

          <Group mb="md">
            <TextInput
              placeholder="Buscar producto por código o descripción"
              icon={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1 }}
            />
          </Group>

          <Tabs defaultValue="disponibles">
            <Tabs.List mb="md">
              <Tabs.Tab value="disponibles" icon={<IconCheck size={14} />}>
                Productos con Stock
              </Tabs.Tab>
              <Tabs.Tab value="todos" icon={<IconPackage size={14} />}>
                Todos los Productos
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="disponibles">
              <ScrollArea h={200} mb="md">
                <Table striped highlightOnHover>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th>Categoría</th>
                      <th>Precio</th>
                      <th>Stock</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingProductos ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center" }}>
                          Cargando productos...
                        </td>
                      </tr>
                    ) : productosFiltrados.filter((p) => Number(p.Stock) > 0).length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center" }}>
                          No se encontraron productos con stock disponible
                        </td>
                      </tr>
                    ) : (
                      productosFiltrados
                        .filter((p) => Number(p.Stock) > 0)
                        .map((producto) => (
                          <tr
                            key={producto.Id_producto}
                            style={{
                              backgroundColor:
                                productoSeleccionado?.Id_producto === producto.Id_producto
                                  ? "rgba(34, 139, 230, 0.1)"
                                  : undefined,
                              cursor: "pointer",
                            }}
                            onClick={() => handleProductoSeleccionado(producto)}
                          >
                            <td>{producto.Codigo}</td>
                            <td>{producto.Descripcion}</td>
                            <td>
                              <Badge color="teal" variant="light">
                                {producto.Categoria}
                              </Badge>
                            </td>
                            <td>$ {Number.parseFloat(producto.PrecioVenta).toFixed(2)}</td>
                            <td>
                              <Badge color={Number.parseInt(producto.Stock) <= 5 ? "orange" : "green"} variant="light">
                                {producto.Stock}
                              </Badge>
                            </td>
                            <td>
                              <Button
                                compact
                                variant="light"
                                color="blue"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleProductoSeleccionado(producto)
                                }}
                              >
                                Seleccionar
                              </Button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </Table>
              </ScrollArea>
            </Tabs.Panel>

            <Tabs.Panel value="todos">
              <ScrollArea h={200} mb="md">
                <Table striped highlightOnHover>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th>Categoría</th>
                      <th>Precio</th>
                      <th>Stock</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingProductos ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center" }}>
                          Cargando productos...
                        </td>
                      </tr>
                    ) : productosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: "center" }}>
                          No se encontraron productos
                        </td>
                      </tr>
                    ) : (
                      productosFiltrados.map((producto) => (
                        <tr
                          key={producto.Id_producto}
                          style={{
                            backgroundColor:
                              productoSeleccionado?.Id_producto === producto.Id_producto
                                ? "rgba(34, 139, 230, 0.1)"
                                : undefined,
                            cursor: "pointer",
                            opacity: Number(producto.Stock) <= 0 ? 0.5 : 1,
                          }}
                          onClick={() => handleProductoSeleccionado(producto)}
                        >
                          <td>{producto.Codigo}</td>
                          <td>{producto.Descripcion}</td>
                          <td>
                            <Badge color="teal" variant="light">
                              {producto.Categoria}
                            </Badge>
                          </td>
                          <td>$ {Number.parseFloat(producto.PrecioVenta).toFixed(2)}</td>
                          <td>
                            <Badge
                              color={
                                Number.parseInt(producto.Stock) <= 0
                                  ? "red"
                                  : Number.parseInt(producto.Stock) <= 10
                                    ? "orange"
                                    : "green"
                              }
                              variant="light"
                            >
                              {producto.Stock}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              compact
                              variant="light"
                              color="blue"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleProductoSeleccionado(producto)
                              }}
                              disabled={Number(producto.Stock) <= 0}
                            >
                              Seleccionar
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </ScrollArea>
            </Tabs.Panel>
          </Tabs>

          {productoSeleccionado && (
            <Box
              mb="md"
              p="md"
              sx={{
                backgroundColor: "rgba(34, 139, 230, 0.1)",
                borderRadius: "8px",
              }}
            >
              <Group position="apart" mb="xs">
                <Text weight={500}>Producto seleccionado: {productoSeleccionado.Descripcion}</Text>
                <Badge color="blue">
                  {productoSeleccionado.Codigo} - {productoSeleccionado.Medida}
                </Badge>
              </Group>

              <Group grow mb="md">
                <NumberInput
                  label="Cantidad"
                  value={cantidad}
                  onChange={setCantidad}
                  min={1}
                  max={Number(productoSeleccionado.Stock)}
                  step={1}
                  required
                />

                <Switch
                  label="Modificar precio"
                  checked={editandoPrecio}
                  onChange={(event) => {
                    setEditandoPrecio(event.currentTarget.checked)
                    if (!event.currentTarget.checked) {
                      setPrecioModificado("")
                      setDescuento(0)
                    } else {
                      setDescuento(0)
                    }
                  }}
                />
              </Group>

              <Group grow>
                {editandoPrecio ? (
                  <NumberInput
                    label="Precio modificado"
                    value={precioModificado}
                    onChange={setPrecioModificado}
                    min={0.01}
                    precision={2}
                    step={1}
                    icon={<IconCurrencyDollar size={16} />}
                    required
                  />
                ) : (
                  <NumberInput
                    label="Descuento (%)"
                    value={descuento}
                    onChange={setDescuento}
                    min={0}
                    max={100}
                    step={5}
                    icon={<IconPercentage size={16} />}
                  />
                )}

                <Group position="right" mt="md">
                  <Button
                    variant="light"
                    color="red"
                    onClick={() => {
                      setProductoSeleccionado(null)
                      setCantidad(1)
                      setDescuento(0)
                      setPrecioModificado("")
                      setEditandoPrecio(false)
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button color="blue" onClick={agregarProducto}>
                    Agregar a la venta
                  </Button>
                </Group>
              </Group>
            </Box>
          )}
        </Paper>

        {/* Detalle de la Venta */}
        <Paper p="md" radius="md" withBorder>
          <Title order={4} mb="md">
            Detalle de la Venta
          </Title>

          {detallesVenta.length === 0 ? (
            <Text color="dimmed" align="center" py="xl">
              No hay productos agregados a la venta
            </Text>
          ) : (
            <>
              <ScrollArea h={200} mb="md">
                {/* Modificar la tabla de productos para mostrar mejor la información de descuentos */}
                <Table striped highlightOnHover>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th>Precio</th>
                      <th>Cantidad</th>
                      <th>Descuento</th>
                      <th>Precio Final</th>
                      <th>Subtotal</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detallesVenta.map((detalle, index) => (
                      <tr key={`${detalle.IdProducto}-${index}`}>
                        <td>{detalle.CodigoProducto}</td>
                        <td>{detalle.DescripcionProducto}</td>
                        <td>$ {detalle.PrecioOriginal.toFixed(2)}</td>
                        <td>
                          <Group spacing={5} noWrap>
                            <ActionIcon
                              size="xs"
                              color="red"
                              variant="light"
                              onClick={() => modificarCantidadProducto(index, Math.max(0, detalle.Cantidad - 1))}
                            >
                              -
                            </ActionIcon>
                            <Text>{detalle.Cantidad}</Text>
                            <ActionIcon
                              size="xs"
                              color="green"
                              variant="light"
                              onClick={() => modificarCantidadProducto(index, detalle.Cantidad + 1)}
                            >
                              +
                            </ActionIcon>
                          </Group>
                        </td>
                        <td>
                          {detalle.PrecioModificado ? (
                            <Badge color="yellow" size="xs">
                              Modificado
                            </Badge>
                          ) : detalle.DescuentoP > 0 ? (
                            <Badge color="orange" size="xs">
                              {detalle.DescuentoP}%
                            </Badge>
                          ) : (
                            <Text size="xs" color="dimmed">
                              Sin descuento
                            </Text>
                          )}
                        </td>
                        <td>$ {detalle.PrecioModificado ? (detalle.SubTotal.toFixed(2)) : (((detalle.PrecioVenta * detalle.Cantidad) * (detalle.DescuentoP / 100)).toFixed(2))}</td>
                        <td>$ {detalle.SubTotal.toFixed(2)}</td>
                        <td>
                          <Group spacing={5} noWrap>
                            <Tooltip label="Editar precio">
                              <ActionIcon
                                size="xs"
                                color="blue"
                                variant="light"
                                onClick={() => editarPrecioProducto(index)}
                              >
                                <IconEdit size="0.8rem" />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Editar descuento">
                              <ActionIcon
                                size="xs"
                                color="blue"
                                variant="light"
                                onClick={() => editarDescuentoProducto(index)}
                              >
                                <IconPercentage size="0.8rem" />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Eliminar producto">
                              <ActionIcon size="xs" color="red" variant="light" onClick={() => eliminarProducto(index)}>
                                <IconTrash size="0.8rem" />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </ScrollArea>

              {/* Modificar el desglose de precios para mostrar la información correcta */}
              <Divider mb="md" />

              <Box mb="md">
                <Group position="apart" mb="xs">
                  <Text>Subtotal:</Text>
                  <Text>$ {calcularSubtotalSinDescuentos().toFixed(2)}</Text>
                </Group>

                {venta.porcentaje > 0 && calcularDescuentoGeneral() > 0 && (
                  <>
                    <Group position="apart" mb="xs">
                      <Text>Descuento general ({venta.porcentaje}%):</Text>
                      <Text color="red">- $ {calcularDescuentoGeneral().toFixed(2)}</Text>
                    </Group>
                    <Group position="apart" mb="xs">
                      <Text>Subtotal con descuento:</Text>
                      <Text>$ {calcularSubtotalConDescuento().toFixed(2)}</Text>
                    </Group>
                  </>
                )}

                {venta.iva > 0 && (
                  <Group position="apart" mb="xs">
                    <Text>IVA ({venta.iva}%):</Text>
                    <Text>$ {calcularIVA().toFixed(2)}</Text>
                  </Group>
                )}

                <Group position="apart">
                  <Text weight={700}>Total:</Text>
                  <Text weight={700} size="lg">
                    $ {calcularTotalConDescuentoGeneral().toFixed(2)}
                  </Text>
                </Group>
              </Box>

              <Group position="right">
                <Button variant="outline" color="red" onClick={() => navigate(-1)}>
                  Cancelar
                </Button>
                <Button color="blue" onClick={guardarVenta}>
                  Guardar Venta
                </Button>
              </Group>
            </>
          )}
        </Paper>
      </Flex>
    </Paper>
  )
}

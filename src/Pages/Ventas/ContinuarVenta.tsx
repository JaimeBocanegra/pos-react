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
  IconDiscount,
  IconPercentage,
  IconPackage,
  IconReceipt2,
  IconUserCircle,
  IconEdit,
  IconCurrencyDollar,
  IconBan,
} from "@tabler/icons-react"
import { useState, useEffect, useRef } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { DateInput } from "@mantine/dates"
import { obtenerClientes } from "../services/ClienteService"
import { obtenerProductos } from "../services/ProductoService"
import {
  actualizarVenta,
  cancelarVenta,
  obtenerVentaPorId,
  obtenerDetallesVenta,
  type DetalleVenta as DetalleVentaType,
} from "../services/VentaService"
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
  PrecioOriginal: number
  Cantidad: number
  DescuentoP: string
  SubTotal: number
  PrecioModificado: boolean
}

interface VentaForm {
  IdVenta: number
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
  metodoPago: "EFECTIVO" | "TARJETA" | "CREDITO"
}

interface ClienteForm {
  IdCliente: number
  Nombre: string
  Iva: boolean
  EmpleadoRequerido: boolean
  RequiereNumeroEmpleado: boolean
}

export function ContinuarVenta() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
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
  const [precioModificado, setPrecioModificado] = useState<number | "">("")
  const [editandoPrecio, setEditandoPrecio] = useState(false)
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null)
  const [cantidad, setCantidad] = useState<number | "">(1)
  const [descuento, setDescuento] = useState<number | "">(0)
  const [detallesVenta, setDetallesVenta] = useState<DetalleVentaForm[]>([])

  const [venta, setVenta] = useState<VentaForm>({
    IdVenta: 0,
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
    estatus: "PENDIENTE",
    porcentaje: 0,
    iva: 0,
    numEmpleado: "",
    empleado: "",
    metodoPago: "EFECTIVO",
  })

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        setLoading(true)

        // Cargar datos de la empresa
        const { data: empresaData } = await supabase.from("empresas").select("*").limit(1).single()
        if (empresaData) setEmpresa(empresaData)

        // Cargar clientes
        const clientesData = await obtenerClientes()
        setClientes(
          clientesData.map((cliente) => ({
            ...cliente,
            Iva: cliente.Iva || false,
            EmpleadoRequerido: cliente.EmpleadoRequerido || false,
            RequiereNumeroEmpleado: cliente.RequiereNumeroEmpleado || false,
          })),
        )
        setLoadingClientes(false)

        // Cargar productos
        const productosData = await obtenerProductos()
        setProductos(productosData)
        setProductosFiltrados(productosData)
        setLoadingProductos(false)

        // Cargar venta pendiente
        if (id) {
          const ventaData = await obtenerVentaPorId(Number.parseInt(id))

          if (ventaData && ventaData.Estatus === "PENDIENTE") {
            // Formatear datos de la venta
            setVenta({
              IdVenta: ventaData.IdVenta,
              numeroDocumento: ventaData.NumeroDocumento || "",
              fechaRegistro: new Date(ventaData.FechaRegistro),
              usuarioRegistro: ventaData.UsuarioRegistro || "",
              documentoCliente: ventaData.DocumentoCliente || "",
              nombreCliente: ventaData.NombreCliente || "",
              cantidadProductos: Number.parseInt(ventaData.CantidadProductos) || 0,
              montoTotal: Number.parseFloat(ventaData.MontoTotal) || 0,
              pagoCon: ventaData.PagoCon || "",
              cambio: Number.parseFloat(ventaData.Cambio) || 0,
              comentario: ventaData.Comentario || "",
              estatus: ventaData.Estatus || "PENDIENTE",
              porcentaje: Number.parseFloat(ventaData.Porcentaje) || 0,
              iva: Number.parseFloat(ventaData.Iva) || 0,
              numEmpleado: ventaData.NumEmpleado || "",
              empleado: ventaData.Empleado || "",
              metodoPago: (ventaData.TPago as "EFECTIVO" | "TARJETA" | "CREDITO") || "EFECTIVO",
            })

            // Obtener detalles de la venta
            const detallesData = await obtenerDetallesVenta(ventaData.IdVenta)

            // Formatear detalles de la venta
            if (detallesData && detallesData.length > 0) {
              const detallesFormateados = detallesData.map((detalle: DetalleVentaType) => ({
                IdProducto: detalle.IdProducto,
                CodigoProducto: detalle.CodigoProducto,
                DescripcionProducto: detalle.DescripcionProducto,
                CategoriaProducto: detalle.CategoriaProducto,
                MedidaProducto: detalle.MedidaProducto,
                PrecioVenta: Number.parseFloat(detalle.PrecioVenta),
                PrecioOriginal: Number.parseFloat(detalle.PrecioVenta), // Asumimos que no hay precio modificado en ventas pendientes
                Cantidad: detalle.Cantidad,
                DescuentoP: detalle.DescuentoP || "0",
                SubTotal: Number.parseFloat(detalle.SubTotal),
                PrecioModificado: false, // Inicialmente asumimos que no hay precios modificados
              }))
              setDetallesVenta(detallesFormateados)
            }

            // Establecer cliente seleccionado si existe
            if (ventaData.DocumentoCliente) {
              const cliente = clientesData.find((c) => c.IdCliente.toString() === ventaData.DocumentoCliente)
              if (cliente) {
                setClienteSeleccionado({
                  ...cliente,
                  Iva: cliente.Iva || false,
                  EmpleadoRequerido: cliente.EmpleadoRequerido || false,
                  RequiereNumeroEmpleado: cliente.RequiereNumeroEmpleado || false,
                })
              }
            }
          } else {
            navigate("/ventas", { replace: true })
          }
        }
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error)
        setError("No se pudieron cargar los datos de la venta pendiente")
        navigate("/ventas", { replace: true })
      } finally {
        setLoading(false)
      }
    }

    cargarDatosIniciales()
  }, [id])

  // Filtrar productos según término de búsqueda
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

  // Calcular subtotal con descuento
  // Calcular subtotal (suma de todos los productos)
  const calcularSubtotal = () => {
    return detallesVenta.reduce((total, detalle) => total + detalle.SubTotal, 0)
  }

  // Calcular descuento general (solo aplicable a productos sin precio modificado)
  const calcularDescuentoGeneral = () => {
    if (venta.porcentaje <= 0) return 0

    const totalSinPrecioModificado = detallesVenta
      .filter((detalle) => !detalle.PrecioModificado)
      .reduce((total, detalle) => total + detalle.SubTotal, 0)

    return (totalSinPrecioModificado * venta.porcentaje) / 100
  }

  // Calcular subtotal con descuento aplicado
  const calcularSubtotalConDescuento = () => {
    const subtotal = calcularSubtotal() // Replace with appropriate values if needed
    const descuento = calcularDescuentoGeneral()
    return subtotal - descuento
  }

  // Calcular IVA (sobre el subtotal con descuento)
  const calcularIVA = () => {
    const subtotalConDescuento = calcularSubtotalConDescuento()
    return (subtotalConDescuento * venta.iva) / 100
  }

  // Calcular total final (subtotal con descuento + IVA)
  const calcularTotalFinal = () => {
    const subtotalConDescuento = calcularSubtotalConDescuento()
    const iva = calcularIVA()
    return subtotalConDescuento + iva
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
      setError("No se puede aplicar descuento a un producto con precio modificado")
      return
    }

    // Si hay descuento general y se intenta aplicar descuento por producto
    if (venta.porcentaje > 0 && descuentoPorcentaje > 0) {
      setError("No se puede aplicar descuento por producto cuando hay descuento general")
      return
    }

    // Verificar si el producto ya está en la lista con el mismo precio y descuento
    const productoExistente = detallesVenta.find(
      (detalle) =>
        detalle.IdProducto === productoSeleccionado.Id_producto &&
        ((isPrecioModificado && detalle.PrecioModificado && detalle.PrecioVenta === precioVentaFinal) ||
          (!isPrecioModificado && !detalle.PrecioModificado && detalle.DescuentoP === descuentoPorcentaje.toString())),
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
          const subtotal = calcularSubtotal()

          return {
            ...detalle,
            Cantidad: nuevaCantidad,
            SubTotal: subtotal,
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
      const subtotal = calcularSubtotal()

      const nuevoDetalle: DetalleVentaForm = {
        IdProducto: productoSeleccionado.Id_producto,
        CodigoProducto: productoSeleccionado.Codigo,
        DescripcionProducto: productoSeleccionado.Descripcion,
        CategoriaProducto: productoSeleccionado.Categoria,
        MedidaProducto: productoSeleccionado.Medida,
        PrecioVenta: precioVentaFinal,
        PrecioOriginal: precioOriginal,
        Cantidad: cantidad as number,
        DescuentoP: isPrecioModificado ? "0" : descuentoPorcentaje.toString(),
        SubTotal: subtotal,
        PrecioModificado: isPrecioModificado,
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

  // Función para imprimir comprobante
  const imprimirComprobante = async (ventaData: any, detallesData: any) => {
      if (!ventaData || !detallesData.length) return;
  
      try {
        const doc = new jsPDF();
  
        // Configuración de la empresa
        const empresaInfo = {
          nombre: empresa?.nombre || "Mi Empresa",
          logo: empresa?.logo || "/logo.png",
          direccion: empresa?.direccion || "Dirección de la empresa",
          telefono: empresa?.telefono || "123-456-7890",
        };
        // Agregar marca de agua si está cancelada (antes del contenido para que quede detrás)
        if (venta.estatus === "CANCELADO") {
          agregarMarcaDeAguaCancelado(doc);
        }
  
        // Título
        doc.setFontSize(18);
        doc.text("Comprobante de Venta", 105, 15, { align: "center" });
  
        // Logo de la empresa
        let logoBase64 = "";
        if (empresaInfo.logo) {
          try {
            logoBase64 = await getBase64ImageFromUrl(empresaInfo.logo);
            doc.addImage(logoBase64, "PNG", 20, 1, 30, 30);
          } catch (error) {
            console.error("Error al cargar el logo:", error);
          }
        }
  
        // Información de la empresa
        doc.setFontSize(10);
        doc.text(empresaInfo.nombre, 160, 20);
        doc.text(empresaInfo.direccion, 160, 25);
        doc.text(`Tel: ${empresaInfo.telefono}`, 160, 30);
  
        // Información de la venta
        doc.setFontSize(12);
        doc.text(`Venta: ${ventaData.IdVenta || "N/A"}`, 14, 40);
        doc.text(
          `Fecha: ${
            ventaData.fechaRegistro
              ? formatearFecha(ventaData.fechaRegistro)
              : "N/A"
          }`,
          14,
          48
        );
        doc.text(`Usuario: ${ventaData.usuarioRegistro || "Admin"}`, 14, 56);
        doc.text(`Empleado: ${ventaData.empleado || "N/A"}`, 14, 64);
  
        doc.text(`Cliente: ${ventaData.nombreCliente || "N/A"}`, 120, 40);
        doc.text(`ID Cliente: ${ventaData.documentoCliente || "N/A"}`, 120, 48);
        doc.text(`Productos: ${detallesData.length || 0}`, 120, 56);
        doc.text(`IVA: ${ventaData.iva || 0}%`, 120, 64);
  
        // Calcular subtotal (suma de todos los productos)
        const subtotal = detallesData.reduce(
          (total: number, detalle: any) =>
            total + Number.parseFloat(detalle.SubTotal || 0),
          0
        );
  
        // Calcular descuento general si existe
        let descuentoGeneral = 0;
        let mostrarDescuentoGeneral = true;
  
        if (Number(ventaData.porcentaje) > 0) {
          // Si solo hay un producto y tiene precio modificado, no mostrar descuento
          if (detallesData.length === 1 && detallesData[0].PrecioModificado) {
            mostrarDescuentoGeneral = false;
          } else {
            // Calcular el total de productos sin precio modificado
            const totalSinPrecioModificado = detallesData
              .filter((detalle: any) => !detalle.PrecioModificado)
              .reduce(
                (total: number, detalle: any) =>
                  total + Number.parseFloat(detalle.SubTotal || 0),
                0
              );
  
            descuentoGeneral =
              (totalSinPrecioModificado * Number(ventaData.porcentaje)) / 100;
  
            // Si no hay productos sin precio modificado, no mostrar descuento
            if (totalSinPrecioModificado === 0) {
              mostrarDescuentoGeneral = false;
            }
          }
        } else {
          mostrarDescuentoGeneral = false;
        }
  
        // Calcular subtotal con descuento
        const subtotalConDescuento = mostrarDescuentoGeneral
          ? subtotal - descuentoGeneral
          : subtotal;
  
        // Calcular IVA sobre el subtotal con descuento
        const iva = Math.round(
          (subtotalConDescuento * Number(ventaData.iva || 0)) / 100
        );
  
        // Calcular total final (subtotal con descuento + IVA)
        const totalFinal = subtotalConDescuento + iva;
  
        // Tabla de productos
        const tableColumn = [
          "Código",
          "Descripción",
          "Precio",
          "Cantidad",
          "Descuento",
          "Subtotal",
        ];
  
        // Filas de productos
        const tableRows = detallesData.map((detalle: any) => {
          if (Number(detalle.DescuentoP) > 0 && !detalle.PrecioModificado) {
            const precioOriginal = Number.parseFloat(
              detalle.PrecioOriginal || detalle.PrecioVenta
            );
            const descuentoMonto =
              (precioOriginal * Number(detalle.DescuentoP)) / 100;
            const precioConDescuento = precioOriginal - descuentoMonto;
  
            return [
              detalle.CodigoProducto || "N/A",
              detalle.DescripcionProducto || "N/A",
              `$ ${precioOriginal.toFixed(2)} (-${detalle.DescuentoP}%)`,
              detalle.Cantidad || 0,
              `$ ${descuentoMonto.toFixed(2)}`,
              `$ ${Number.parseFloat(detalle.SubTotal || 0).toFixed(2)}`,
            ];
          } else {
            return [
              detalle.CodigoProducto || "N/A",
              detalle.DescripcionProducto || "N/A",
              `$ ${Number.parseFloat(detalle.PrecioVenta || 0).toFixed(2)}${
                detalle.PrecioModificado ? "*" : ""
              }`,
              detalle.Cantidad || 0,
              `${detalle.DescuentoP || 0}%`,
              `$ ${Number.parseFloat(detalle.SubTotal || 0).toFixed(2)}`,
            ];
          }
        });
  
        // Filas de totales
        const totalRows = [
          ["", "", "", "", "Subtotal:", `$ ${subtotal.toFixed(2)}`],
        ];
  
        // Agregar fila de descuento si aplica
        if (mostrarDescuentoGeneral && descuentoGeneral > 0) {
          totalRows.push([
            "",
            "",
            "",
            "",
            `Descuento (${ventaData.porcentaje}%):`,
            `- $ ${descuentoGeneral.toFixed(2)}`,
          ]);
          totalRows.push([
            "",
            "",
            "",
            "",
            "Subtotal con descuento:",
            `$ ${subtotalConDescuento.toFixed(2)}`,
          ]);
        }
  
        // Agregar fila de IVA si aplica
        if (Number(ventaData.iva) > 0) {
          totalRows.push([
            "",
            "",
            "",
            "",
            `IVA (${ventaData.iva}%):`,
            `$ ${iva.toFixed(2)}`,
          ]);
        }
  
        // Agregar fila de total (ahora incluye IVA)
        totalRows.push(["", "", "", "", "Total:", `$ ${totalFinal.toFixed(2)}`]);
  
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
        });
  
        const finalY = doc.lastAutoTable?.finalY || 70;
  
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
        });
  
        const finalTotalsY = doc.lastAutoTable?.finalY || finalY + 5;
  
        // Método de pago
        doc.setFontSize(11);
        doc.text(
          `Método de pago: ${
            ventaData.metodoPago === "TARJETA"
              ? "Tarjeta"
              : ventaData.metodoPago === "EFECTIVO"
              ? "Efectivo"
              : "Credito"
          }`,
          14,
          finalTotalsY + 15
        );
  
        // Información de pago (si es efectivo)
        if (ventaData.metodoPago === "EFECTIVO" && ventaData.pagoCon) {
          doc.text(
            `Pagó con: $ ${Number.parseFloat(ventaData.pagoCon).toFixed(2)} MXN`,
            14,
            finalTotalsY + 25
          );
          doc.text(
            `Cambio: $ ${Number.parseFloat(ventaData.cambio).toFixed(2)} MXN`,
            14,
            finalTotalsY + 35
          );
        }
  
        // Estado de la venta
        doc.text(`Estado: ${ventaData.estatus}`, 14, finalTotalsY + 50);
  
        // Pie de página
        doc.setFontSize(10);
        doc.text(
          `Documento generado el ${new Date().toLocaleString()}`,
          105,
          280,
          { align: "center" }
        );
  
        // Habilitar impresión automática
        doc.autoPrint();
  
        // Abrir en nueva ventana para imprimir
        const pdfBlob = doc.output("blob");
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, "_blank");
  
        // Liberar memoria
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
      } catch (error) {
        console.error("Error al generar PDF para imprimir:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudo generar el comprobante para impresión",
        });
      }
    };

  // Eliminar producto de la venta
  const eliminarProducto = (idProducto: number) => {
    setDetallesVenta(detallesVenta.filter((detalle) => detalle.IdProducto !== idProducto))
  }

  // Calcular total de la venta
  const totalVenta = detallesVenta.reduce((total, detalle) => total + detalle.SubTotal, 0)

  // Calcular total con descuento general
  const calcularTotalConDescuentoGeneral = () => {
    // 1. Calcular subtotal total (suma de todos los productos)
    const subtotal = detallesVenta.reduce((total, detalle) => total + detalle.SubTotal, 0)

    // 2. Si no hay descuento general, retornar el subtotal + IVA
    if (venta.porcentaje <= 0) {
      return subtotal + (subtotal * venta.iva) / 100
    }

    // 3. Calcular total de productos sin precio modificado
    const totalSinPrecioModificado = detallesVenta
      .filter((detalle) => !detalle.PrecioModificado)
      .reduce((total, detalle) => total + detalle.SubTotal, 0)

    // 4. Calcular total de productos con precio modificado
    const totalConPrecioModificado = detallesVenta
      .filter((detalle) => detalle.PrecioModificado)
      .reduce((total, detalle) => total + detalle.SubTotal, 0)

    // 5. Calcular descuento solo sobre productos sin modificar
    const descuento = (totalSinPrecioModificado * venta.porcentaje) / 100

    // 6. Calcular subtotal con descuento aplicado
    const subtotalConDescuento = totalSinPrecioModificado - descuento + totalConPrecioModificado

    // 7. Calcular IVA sobre el subtotal con descuento
    const iva = (subtotalConDescuento * venta.iva) / 100

    // 8. Retornar total final (subtotal con descuento + IVA)
    return subtotalConDescuento + iva
  }
  // Calcular cambio
  const calcularCambio = () => {
    if (!venta.pagoCon || venta.metodoPago !== "EFECTIVO") return 0
    const pagoCon = Number.parseFloat(venta.pagoCon)
    const totalFinal = calcularTotalConDescuentoGeneral()
    return Math.max(0, pagoCon - totalFinal)
  }

  // Función para procesar el código de barras escaneado
  const procesarCodigoBarras = (codigo: string) => {
    // Buscar el producto por código de barras
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

      // Verificar si el producto ya está en la lista
      // Verificar si el producto ya está en la lista con precio normal (sin modificar y sin descuento)
      const productoExistente = detallesVenta.find(
        (d) => d.IdProducto === productoEncontrado.Id_producto && !d.PrecioModificado && d.DescuentoP === "0",
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
            const subtotal = calcularSubtotal()
            return {
              ...detalle,
              Cantidad: nuevaCantidad,
              SubTotal: subtotal,
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
        const subtotal = calcularSubtotal()

        const nuevoDetalle: DetalleVentaForm = {
          IdProducto: productoEncontrado.Id_producto,
          CodigoProducto: productoEncontrado.Codigo,
          DescripcionProducto: productoEncontrado.Descripcion,
          CategoriaProducto: productoEncontrado.Categoria,
          MedidaProducto: productoEncontrado.Medida,
          PrecioVenta: precioVenta,
          PrecioOriginal: precioVenta,
          Cantidad: 1,
          DescuentoP: "0",
          SubTotal: subtotal,
          PrecioModificado: false,
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
  const editarPrecioProducto = (idProducto: number) => {
    const producto = detallesVenta.find((detalle) => detalle.IdProducto === idProducto)
    if (!producto) return

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

        // Actualizar el precio del producto
        const nuevosDetalles = detallesVenta.map((detalle) => {
          if (detalle.IdProducto === idProducto) {
            const subtotal = nuevoPrecio * detalle.Cantidad
            return {
              ...detalle,
              PrecioVenta: nuevoPrecio,
              DescuentoP: "0", // Eliminar cualquier descuento existente
              SubTotal: subtotal,
              PrecioModificado: true,
            }
          }
          return detalle
        })

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

  // Función para cancelar la venta pendiente
  const handleCancelarVenta = async () => {
    Swal.fire({
      title: "¿Estás seguro de cancelar esta venta pendiente?",
      text: "Esta acción no se puede deshacer y restaurará el stock de los productos",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "No, mantener",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          setLoading(true)
          await cancelarVenta(venta.IdVenta, true)
          venta.estatus = "CANCELADO"
          imprimirComprobante(venta, detallesVenta)

          Swal.fire({
            title: "Venta cancelada",
            text: "La venta pendiente ha sido cancelada correctamente",
            icon: "success",
          })

          navigate("/ventas")
        } catch (error) {
          console.error("Error al cancelar venta:", error)
          setError("No se pudo cancelar la venta pendiente")
        } finally {
          setLoading(false)
        }
      }
    })
  }

  // Función para guardar los cambios en la venta pendiente
  const guardarVenta = async (estatus: "COMPLETADO" | "PENDIENTE" = "COMPLETADO") => {
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

    // Validaciones de empleado
    if (clienteSeleccionado?.EmpleadoRequerido && !venta.empleado) {
      setError("Este cliente requiere un empleado asignado")
      return
    }

    if (clienteSeleccionado?.RequiereNumeroEmpleado && !venta.numEmpleado) {
      setError("Este cliente requiere un número de empleado")
      return
    }

    const totalFinal = calcularTotalConDescuentoGeneral()

    if (
      venta.metodoPago === "EFECTIVO" &&
      estatus === "COMPLETADO" &&
      (!venta.pagoCon || Number.parseFloat(venta.pagoCon) < totalFinal)
    ) {
      setError("El monto pagado debe ser igual o mayor al total de la venta")
      return
    }

    setLoading(true)
    setError("")

    try {
      const cambio = calcularCambio().toString()

      // Preparar datos para el servicio
      const ventaData = {
        NumeroDocumento: venta.numeroDocumento,
        FechaRegistro: venta.fechaRegistro.toISOString(),
        UsuarioRegistro: venta.usuarioRegistro,
        DocumentoCliente: venta.documentoCliente,
        NombreCliente: venta.nombreCliente,
        CantidadProductos: detallesVenta.length.toString(),
        MontoTotal: totalFinal.toString(),
        PagoCon: venta.pagoCon || "0",
        Cambio: cambio,
        Comentario: venta.comentario || "",
        Estatus: estatus,
        Porcentaje: venta.porcentaje.toString(),
        Iva: venta.iva.toString(),
        NumEmpleado: venta.numEmpleado,
        Empleado: venta.empleado,
        TPago: venta.metodoPago,
      }

      // Preparar detalles para el servicio
      const detallesData = detallesVenta.map((detalle) => ({
        IdProducto: detalle.IdProducto,
        CodigoProducto: detalle.CodigoProducto,
        DescripcionProducto: detalle.DescripcionProducto,
        CategoriaProducto: detalle.CategoriaProducto,
        MedidaProducto: detalle.MedidaProducto,
        PrecioVenta: detalle.PrecioVenta.toString(),
        Cantidad: detalle.Cantidad,
        SubTotal: detalle.SubTotal.toString(),
        DescuentoP: detalle.DescuentoP,
      }))

      // Llamar al servicio para actualizar la venta
      await actualizarVenta(venta.IdVenta, ventaData, detallesData)

      setSuccess(true)

      if (estatus === "COMPLETADO") {
        // Imprimir comprobante solo si se completa la venta
        await imprimirComprobante(ventaData, detallesData)
      }

      // Redirigir después de un breve retraso
      setTimeout(() => {
        navigate("/ventas")
      }, 1500)
    } catch (error: any) {
      console.error("Error al actualizar venta:", error)
      setError(error.message || "Ocurrió un error al actualizar la venta")
    } finally {
      setLoading(false)
    }
  }

  // Función para guardar como pendiente
  const guardarComoPendiente = async () => {
    await guardarVenta("PENDIENTE")
  }

  // Función para completar la venta
  const completarVenta = async () => {
    await guardarVenta("COMPLETADO")
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
              Continuar Venta Pendiente
            </Title>
            <Badge color="yellow" variant="filled" size="lg">
              Folio: {venta.IdVenta}
            </Badge>
          </Group>
          <IconShoppingBag size={28} color="#228be6" />
        </Flex>

        {success && (
          <Alert
            icon={<IconCheck size={16} />}
            title={`¡Venta ${venta.estatus === "COMPLETADO" ? "completada" : "guardada"} con éxito!`}
            color="green"
            withCloseButton
            onClose={() => setSuccess(false)}
          >
            La venta ha sido {venta.estatus === "COMPLETADO" ? "completada" : "guardada como pendiente"} correctamente.
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
              onChange={(val) => setVenta({ ...venta, iva: val === "" ? 0 : Number(val) })}
              min={0}
              max={100}
              precision={2}
              step={1}
              icon={<IconReceipt2 size={16} />}
              disabled={clienteSeleccionado?.Iva} // Deshabilitar si el cliente tiene IVA automático
            />

            <NumberInput
              label="Descuento General (%)"
              placeholder="Porcentaje de descuento"
              value={venta.porcentaje}
              onChange={(val) => {
                const nuevoValor = val === "" ? 0 : Number(val)
                // Si hay productos con descuento por producto y se intenta aplicar descuento general
                if (nuevoValor > 0 && detallesVenta.some((d) => Number(d.DescuentoP) > 0)) {
                  Swal.fire({
                    icon: "warning",
                    title: "Advertencia",
                    text: "Hay productos con descuento individual. Si aplica descuento general, se ignorarán los descuentos por producto.",
                    showCancelButton: true,
                    confirmButtonText: "Continuar",
                    cancelButtonText: "Cancelar",
                  }).then((result) => {
                    if (result.isConfirmed) {
                      setVenta({ ...venta, porcentaje: nuevoValor })
                    }
                  })
                } else {
                  setVenta({ ...venta, porcentaje: nuevoValor })
                }
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
                              <Badge color={Number.parseInt(producto.Stock) <= 10 ? "orange" : "green"} variant="light">
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
                    disabled={venta.porcentaje > 0}
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
                <Table striped highlightOnHover>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th>Precio</th>
                      <th>Cantidad</th>
                      <th>Descuento</th>
                      <th>Subtotal</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detallesVenta.map((detalle) => (
                      <tr key={detalle.IdProducto}>
                        <td>{detalle.CodigoProducto}</td>
                        <td>{detalle.DescripcionProducto}</td>
                        <td>
                          $ {detalle.PrecioVenta.toFixed(2)}
                          {detalle.PrecioModificado && (
                            <Badge color="yellow" size="xs" ml={5}>
                              Modificado
                            </Badge>
                          )}
                        </td>
                        <td>{detalle.Cantidad}</td>
                        <td>
                          {Number(detalle.DescuentoP) > 0 && (
                            <Badge color="orange" variant="light" leftSection={<IconDiscount size={12} />}>
                              {detalle.DescuentoP}%
                            </Badge>
                          )}
                        </td>
                        <td>$ {detalle.SubTotal.toFixed(2)}</td>
                        <td>
                          <Group spacing={5}>
                            <Tooltip label="Editar precio">
                              <ActionIcon
                                color="blue"
                                variant="light"
                                onClick={() => editarPrecioProducto(detalle.IdProducto)}
                              >
                                <IconEdit size="1rem" />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Eliminar producto">
                              <ActionIcon
                                color="red"
                                variant="light"
                                onClick={() => eliminarProducto(detalle.IdProducto)}
                              >
                                <IconTrash size="1rem" />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </ScrollArea>

              <Divider my="md" />

              {/* Subtotal */}
              <Group position="apart">
                <Text size="lg" weight={700}>
                  Subtotal:
                </Text>
                <Text size="lg" weight={700}>
                  $ {calcularSubtotal().toFixed(2)} MXN
                </Text>
              </Group>

              {/* Descuento general si aplica */}
              {venta.porcentaje > 0 && (
                <>
                  <Group position="apart">
                    <Text size="md">Descuento general ({venta.porcentaje}%):</Text>
                    <Text size="md" color="red">
                      - $ {calcularDescuentoGeneral().toFixed(2)} MXN
                    </Text>
                  </Group>
                  <Group position="apart">
                    <Text size="md" weight={600}>
                      Subtotal con descuento:
                    </Text>
                    <Text size="md" weight={600}>
                      $ {calcularSubtotalConDescuento().toFixed(2)} MXN
                    </Text>
                  </Group>
                </>
              )}

              {/* IVA si aplica */}
              {venta.iva > 0 && (
                <Group position="apart">
                  <Text size="md">IVA ({venta.iva}%):</Text>
                  <Text size="md">$ {calcularIVA().toFixed(2)} MXN</Text>
                </Group>
              )}

              {/* Total final */}
              <Group position="apart" mt="md">
                <Text size="lg" weight={700}>
                  Total Final:
                </Text>
                <Text size="lg" weight={700} color="blue">
                  $ {calcularTotalFinal().toFixed(2)} MXN
                </Text>
              </Group>

              {/* Nota sobre productos con precio modificado */}
              {venta.porcentaje > 0 && detallesVenta.some((d) => d.PrecioModificado) && (
                <Text size="xs" color="dimmed" italic>
                  * El descuento general no se aplica a productos con precio modificado
                </Text>
              )}
            </>
          )}
        </Paper>

        {/* Botones de Acción - Modificados para continuar venta */}
        <Group position="apart" mt="md">
          <Group>
            <Button variant="outline" color="red" leftIcon={<IconBan size={16} />} onClick={handleCancelarVenta}>
              Cancelar Venta
            </Button>
          </Group>

          <Group>
            <Button variant="outline" color="blue" onClick={guardarComoPendiente} disabled={detallesVenta.length === 0}>
              Guardar como Pendiente
            </Button>

            <Button
              color="green"
              leftIcon={<IconCheck size={16} />}
              onClick={completarVenta}
              disabled={detallesVenta.length === 0}
            >
              Completar Venta
            </Button>
          </Group>
        </Group>
      </Flex>
    </Paper>
  )
}

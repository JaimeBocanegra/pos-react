"use client"

import { Paper, Title, Group, Text, Box, Button, Flex, MultiSelect, Grid, Badge, Card, Loader } from "@mantine/core"
import { DatePickerInput } from "@mantine/dates"
import {
  IconCalendar,
  IconUser,
  IconCash,
  IconCheck,
  IconBan,
  IconClock,
  IconCreditCard,
  IconReceipt,
  IconFileSpreadsheet,
  IconFile,
  IconUserCircle,
  IconNotes,
  IconChartBar,
} from "@tabler/icons-react"
import { useState, useEffect, useMemo, useRef } from "react"
import { obtenerVentas, obtenerDetallesVentaMultiple } from "../services/VentaService"
import { obtenerClientes } from "../services/ClienteService"
import DataTable from "../../components/DataTable"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"
import { Bar, Pie } from "react-chartjs-2"
import Swal from "sweetalert2"
import html2canvas from "html2canvas"

// Extend jsPDF to include lastAutoTable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: { finalY: number }
  }
}

// Componente para renderizar montos
const MontoRenderer = (props: any) => {
  const value = Number.parseFloat(props.value || 0).toFixed(2)
  return <span>$ {value} MXN</span>
}

// Componente para renderizar fechas
const FechaRenderer = (props: any) => {
  if (!props.value) return <span>-</span>

  const fecha = new Date(props.value)
  const dia = fecha.getDate().toString().padStart(2, "0")
  const mes = (fecha.getMonth() + 1).toString().padStart(2, "0")
  const año = fecha.getFullYear()
  return (
    <span>
      {dia}/{mes}/{año}
    </span>
  )
}

// Componente para renderizar estado
const EstadoRenderer = (props: any) => {
  switch (props.value) {
    case "CANCELADO":
      return (
        <Badge color="red" variant="light" leftSection={<IconBan size={12} />}>
          Cancelada
        </Badge>
      )
    case "PENDIENTE":
      return (
        <Badge color="yellow" variant="light" leftSection={<IconClock size={12} />}>
          Pendiente
        </Badge>
      )
    default:
      return (
        <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>
          Completada
        </Badge>
      )
  }
}

// Componente para renderizar método de pago
const MetodoPagoRenderer = (props: any) => {
  const metodo = props.value || "EFECTIVO"
  return (
    <Group spacing="xs">
      {metodo === "TARJETA" ? (
        <IconCreditCard size={16} color="#228be6" />
      ) : metodo === "CREDITO" ? (
        <IconUserCircle size={16} color="#228be6" />
      ) : (
        <IconCash size={16} color="#228be6" />
      )}
      <Text>{metodo === "TARJETA" ? "Tarjeta" : metodo === "CREDITO" ? "Crédito" : "Efectivo"}</Text>
    </Group>
  )
}

// Componente para renderizar porcentaje
const PorcentajeRenderer = (props: any) => {
  const value = Number.parseFloat(props.value || 0)
  return <span>{value}%</span>
}

interface ReporteVentasProps {
  showFilters: boolean
  viewMode: "table" | "chart"
  chartType: "bar" | "pie"
}

export function ReporteVentas({ showFilters, viewMode, chartType }: ReporteVentasProps) {
  const [ventas, setVentas] = useState<any[]>([])
  const [ventasDetalles, setVentasDetalles] = useState<any[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDetalles, setLoadingDetalles] = useState(false)
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null])
  const [selectedEstatus, setSelectedEstatus] = useState<string[]>([])
  const [selectedClientes, setSelectedClientes] = useState<string[]>([])
  const [selectedMetodosPago, setSelectedMetodosPago] = useState<string[]>([])
  const [gridApi, setGridApi] = useState<any | null>(null)
  const [gridColumnApi, setGridColumnApi] = useState<any | null>(null)

  // Referencias para los gráficos
  const estatusChartRef = useRef<HTMLDivElement>(null)
  const metodoPagoChartRef = useRef<HTMLDivElement>(null)
  const montosEstatusChartRef = useRef<HTMLDivElement>(null)

  // Cargar datos
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true)
      try {
        const [ventasData, clientesData] = await Promise.all([obtenerVentas(), obtenerClientes()])
        setVentas(ventasData)
        setClientes(clientesData)

        // Cargar detalles de todas las ventas
        await cargarDetallesVentasOptimizado(ventasData)
      } catch (error) {
        console.error("Error al cargar datos:", error)
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar los datos de ventas",
        })
      } finally {
        setLoading(false)
      }
    }

    cargarDatos()
  }, [])

  // OPTIMIZED: Load sale details in a single batch
  const cargarDetallesVentasOptimizado = async (ventasData: any[] = ventas) => {
    if (ventasData.length === 0) return

    setLoadingDetalles(true)
    try {
      // Get all sale IDs
      const ventasIds = ventasData.map((venta) => venta.IdVenta)

      // Fetch all details in a single query
      const todosDetalles = await obtenerDetallesVentaMultiple(ventasIds)

      const detallesUnificados = []

      // Process each sale
      for (const venta of ventasData) {
        // Filter details for this sale
        const detallesVenta = todosDetalles.filter((detalle) => detalle.IdVenta === venta.IdVenta)

        if (detallesVenta && detallesVenta.length > 0) {
          // Join each detail with the header information
          for (const detalle of detallesVenta) {
            detallesUnificados.push({
              // Header data
              IdVenta: venta.IdVenta,
              Estatus: venta.Estatus,
              NumeroDocumento: venta.NumeroDocumento,
              FechaRegistro: venta.FechaRegistro,
              NombreCliente: venta.NombreCliente || "Cliente General",
              DocumentoCliente: venta.DocumentoCliente,
              UsuarioRegistro: venta.UsuarioRegistro,
              Empleado: venta.Empleado,
              NumEmpleado: venta.NumEmpleado,
              TPago: venta.TPago,
              PagoCon: venta.PagoCon,
              Cambio: venta.Cambio,
              Porcentaje: detalle.PrecioModificado || detalle.DescuentoP ? 0 : venta.Porcentaje,
              DescGrlMonto:
                detalle.PrecioModificado || detalle.DescuentoP ? 0 : (venta.Porcentaje * detalle.SubTotal) / 100,
              SubTotal2:
                detalle.SubTotal -
                (detalle.PrecioModificado || detalle.DescuentoP ? 0 : (venta.Porcentaje * detalle.SubTotal) / 100),
              Iva: venta.Iva,
              IvaMonto:
                ((detalle.SubTotal -
                  (detalle.PrecioModificado || detalle.DescuentoP ? 0 : (venta.Porcentaje * detalle.SubTotal) / 100)) *
                  venta.Iva) /
                100,
              TotalFinal:
                detalle.SubTotal -
                (detalle.PrecioModificado || detalle.DescuentoP ? 0 : (venta.Porcentaje * detalle.SubTotal) / 100) +
                ((detalle.SubTotal -
                  (detalle.PrecioModificado || detalle.DescuentoP ? 0 : (venta.Porcentaje * detalle.SubTotal) / 100)) *
                  venta.Iva) /
                  100,
              CantidadProductos: venta.CantidadProductos,
              MontoTotal: venta.MontoTotal,
              Comentario: venta.Comentario,

              // Detail data
              IdDetalle: detalle.IdDetalle,
              IdProducto: detalle.IdProducto,
              CodigoProducto: detalle.CodigoProducto,
              DescripcionProducto: detalle.DescripcionProducto,
              CategoriaProducto: detalle.CategoriaProducto,
              MedidaProducto: detalle.MedidaProducto,
              PrecioVenta: detalle.PrecioVenta,
              Cantidad: detalle.Cantidad,
              DescuentoP: detalle.DescuentoP,
              DescuentoM: (detalle.PrecioVenta * detalle.Cantidad * detalle.DescuentoP) / 100,
              SubTotal: detalle.SubTotal,
              PrecioModificado: detalle.PrecioModificado,
            })
          }
        } else {
          // If there are no details, add only the header with empty detail fields
          detallesUnificados.push({
            // Header data
            IdVenta: venta.IdVenta,
            Estatus: venta.Estatus,
            NumeroDocumento: venta.NumeroDocumento,
            FechaRegistro: venta.FechaRegistro,
            NombreCliente: venta.NombreCliente || "Cliente General",
            DocumentoCliente: venta.DocumentoCliente,
            UsuarioRegistro: venta.UsuarioRegistro,
            Empleado: venta.Empleado,
            NumEmpleado: venta.NumEmpleado,
            TPago: venta.TPago,
            PagoCon: venta.PagoCon,
            Cambio: venta.Cambio,
            Porcentaje: venta.Porcentaje,
            Iva: venta.Iva,
            CantidadProductos: venta.CantidadProductos,
            MontoTotal: venta.MontoTotal,
            Comentario: venta.Comentario,

            // Empty detail fields
            IdDetalle: null,
            IdProducto: null,
            CodigoProducto: "Sin productos",
            DescripcionProducto: "Sin productos",
            CategoriaProducto: "-",
            MedidaProducto: "-",
            PrecioVenta: 0,
            Cantidad: 0,
            DescuentoP: 0,
            SubTotal: 0,
          })
        }
      }

      setVentasDetalles(detallesUnificados)
    } catch (error) {
      console.error("Error al cargar detalles de ventas:", error)
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar los detalles de las ventas",
      })
    } finally {
      setLoadingDetalles(false)
    }
  }

  // Opciones para los filtros
  const estatusOptions = [
    { value: "COMPLETADO", label: "Completada" },
    { value: "PENDIENTE", label: "Pendiente" },
    { value: "CANCELADO", label: "Cancelada" },
  ]

  const metodoPagoOptions = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TARJETA", label: "Tarjeta" },
    { value: "CREDITO", label: "Crédito" },
  ]

  const clientesOptions = useMemo(() => {
    return clientes.map((cliente) => ({
      value: cliente.IdCliente.toString(),
      label: cliente.Nombre,
    }))
  }, [clientes])

  // Filtrar ventas con detalles
  const filteredVentasDetalles = useMemo(() => {
    return ventasDetalles.filter((ventaDetalle) => {
      // Filtro por fecha
      if (dateRange[0] && dateRange[1]) {
        const ventaDate = new Date(ventaDetalle.FechaRegistro)
        const startDate = new Date(dateRange[0])
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(dateRange[1])
        endDate.setHours(23, 59, 59, 999)

        if (ventaDate < startDate || ventaDate > endDate) {
          return false
        }
      }

      // Filtro por estatus
      if (selectedEstatus.length > 0 && !selectedEstatus.includes(ventaDetalle.Estatus)) {
        return false
      }

      // Filtro por cliente
      if (
        selectedClientes.length > 0 &&
        (!ventaDetalle.DocumentoCliente || !selectedClientes.includes(ventaDetalle.DocumentoCliente))
      ) {
        return false
      }

      // Filtro por método de pago
      if (selectedMetodosPago.length > 0 && !selectedMetodosPago.includes(ventaDetalle.TPago)) {
        return false
      }

      return true
    })
  }, [ventasDetalles, dateRange, selectedEstatus, selectedClientes, selectedMetodosPago])

  // Obtener ventas únicas para estadísticas
  const ventasUnicas = useMemo(() => {
    const ventasMap = new Map()

    filteredVentasDetalles.forEach((item) => {
      if (!ventasMap.has(item.IdVenta)) {
        ventasMap.set(item.IdVenta, item)
      }
    })

    return Array.from(ventasMap.values())
  }, [filteredVentasDetalles])

  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalVentas = ventasUnicas.length
    let montoTotal = 0
    let ventasCompletadas = 0
    let ventasPendientes = 0
    let ventasCanceladas = 0
    let montoCompletadas = 0
    let montoPendientes = 0
    let montoCanceladas = 0
    let ventasEfectivo = 0
    let ventasTarjeta = 0
    let ventasCredito = 0
    let montoEfectivo = 0
    let montoTarjeta = 0
    let montoCredito = 0

    ventasUnicas.forEach((venta) => {
      const monto = Number.parseFloat(venta.MontoTotal || 0)
      montoTotal += monto

      if (venta.Estatus === "COMPLETADO") {
        ventasCompletadas++
        montoCompletadas += monto
      } else if (venta.Estatus === "PENDIENTE") {
        ventasPendientes++
        montoPendientes += monto
      } else if (venta.Estatus === "CANCELADO") {
        ventasCanceladas++
        montoCanceladas += monto
      }

      if (venta.TPago === "EFECTIVO") {
        ventasEfectivo++
        montoEfectivo += monto
      } else if (venta.TPago === "TARJETA") {
        ventasTarjeta++
        montoTarjeta += monto
      } else if (venta.TPago === "CREDITO") {
        ventasCredito++
        montoCredito += monto
      }
    })

    return {
      totalVentas,
      montoTotal,
      ventasCompletadas,
      ventasPendientes,
      ventasCanceladas,
      montoCompletadas,
      montoPendientes,
      montoCanceladas,
      ventasEfectivo,
      ventasTarjeta,
      ventasCredito,
      montoEfectivo,
      montoTarjeta,
      montoCredito,
    }
  }, [ventasUnicas])

  // Datos para gráficos
  const chartData = useMemo(() => {
    // Datos para gráfico de estatus
    const estatusData = {
      labels: ["Completadas", "Pendientes", "Canceladas"],
      datasets: [
        {
          label: "Cantidad de Ventas",
          data: [stats.ventasCompletadas, stats.ventasPendientes, stats.ventasCanceladas],
          backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 206, 86, 0.6)", "rgba(255, 99, 132, 0.6)"],
          borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 206, 86, 1)", "rgba(255, 99, 132, 1)"],
          borderWidth: 1,
        },
      ],
    }

    // Datos para gráfico de método de pago
    const metodoPagoData = {
      labels: ["Efectivo", "Tarjeta", "Crédito"],
      datasets: [
        {
          label: "Cantidad de Ventas",
          data: [stats.ventasEfectivo, stats.ventasTarjeta, stats.ventasCredito],
          backgroundColor: ["rgba(54, 162, 235, 0.6)", "rgba(153, 102, 255, 0.6)", "rgba(255, 159, 64, 0.6)"],
          borderColor: ["rgba(54, 162, 235, 1)", "rgba(153, 102, 255, 1)", "rgba(255, 159, 64, 1)"],
          borderWidth: 1,
        },
      ],
    }

    // Datos para gráfico de montos por estatus
    const montosEstatusData = {
      labels: ["Completadas", "Pendientes", "Canceladas"],
      datasets: [
        {
          label: "Monto Total (MXN)",
          data: [stats.montoCompletadas, stats.montoPendientes, stats.montoCanceladas],
          backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 206, 86, 0.6)", "rgba(255, 99, 132, 0.6)"],
          borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 206, 86, 1)", "rgba(255, 99, 132, 1)"],
          borderWidth: 1,
        },
      ],
    }

    return {
      estatusData,
      metodoPagoData,
      montosEstatusData,
    }
  }, [stats])

  // Opciones para gráficos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Reporte de Ventas",
      },
    },
  }

  // Configuración de columnas para la tabla unificada
  const columnDefs = [
    // Columnas de encabezado de venta
    {
      headerName: "Folio",
      field: "IdVenta",
      flex: 0.7,
      minWidth: 90,
      cellStyle: {
        fontWeight: 500,
      },
      pinned: "left",
    },
    {
      headerName: "Estado",
      field: "Estatus",
      flex: 0.8,
      minWidth: 120,
      cellRenderer: EstadoRenderer,
    },
    {
      headerName: "N° Documento",
      field: "NumeroDocumento",
      flex: 1,
      minWidth: 150,
      cellStyle: {
        fontWeight: 500,
      },
      cellRenderer: (params: any) => (
        <Flex align="center" gap="xs">
          <IconReceipt size={16} color="#228be6" />
          <Text>{params.value || "-"}</Text>
        </Flex>
      ),
    },
    {
      headerName: "Fecha",
      field: "FechaRegistro",
      flex: 1,
      minWidth: 110,
      cellRenderer: FechaRenderer,
    },
    {
      headerName: "Cliente",
      field: "NombreCliente",
      flex: 1.5,
      minWidth: 180,
      cellStyle: {
        lineHeight: "1.2",
      },
      cellRenderer: (params: any) => (
        <Flex align="center" gap="xs">
          <IconUser size={16} color="#228be6" />
          <Text>{params.value || "Cliente General"}</Text>
        </Flex>
      ),
      wrapText: true,
      autoHeight: true,
    },
    {
      headerName: "ID Cliente",
      field: "DocumentoCliente",
      flex: 0.8,
      minWidth: 110,
    },
    {
      headerName: "Usuario",
      field: "UsuarioRegistro",
      flex: 1,
      minWidth: 130,
      cellRenderer: (params: any) => (
        <Flex align="center" gap="xs">
          <IconUserCircle size={16} color="#228be6" />
          <Text>{params.value || "Admin"}</Text>
        </Flex>
      ),
    },
    {
      headerName: "Método Pago",
      field: "TPago",
      flex: 1,
      minWidth: 150,
      cellRenderer: MetodoPagoRenderer,
    },

    // Columnas de detalle de producto en secuencia lógica
    {
      headerName: "Código Producto",
      field: "CodigoProducto",
      flex: 1,
      minWidth: 160,
      cellStyle: (params: any) => {
        return params.value === "Sin productos" ? { color: "#999" } : {}
      },
    },
    {
      headerName: "Descripción Producto",
      field: "DescripcionProducto",
      flex: 2,
      minWidth: 200,
      cellStyle: (params: any) => {
        return params.value === "Sin productos" ? { color: "#999" } : {}
      },
    },
    {
      headerName: "Categoría",
      field: "CategoriaProducto",
      flex: 1,
      minWidth: 130,
    },
    {
      headerName: "Medida",
      field: "MedidaProducto",
      flex: 0.8,
      minWidth: 100,
    },
    {
      headerName: "Precio Unitario",
      field: "PrecioVenta",
      flex: 1,
      minWidth: 150,
      cellRenderer: MontoRenderer,
    },
    {
      headerName: "Cantidad",
      field: "Cantidad",
      flex: 0.7,
      minWidth: 120,
    },
    {
      headerName: "Desc. Producto (%)",
      field: "DescuentoP",
      flex: 0.8,
      minWidth: 150,
      cellRenderer: PorcentajeRenderer,
    },
    {
      headerName: "Desc. Monto",
      field: "DescuentoM",
      flex: 0.8,
      minWidth: 150,
      cellRenderer: MontoRenderer,
    },
    {
      headerName: "Subtotal",
      field: "SubTotal",
      flex: 1,
      minWidth: 130,
      cellRenderer: MontoRenderer,
    },
    {
      headerName: "Desc. General (%)",
      field: "Porcentaje",
      flex: 0.8,
      minWidth: 100,
      cellRenderer: PorcentajeRenderer,
    },
    {
      headerName: "Desc. Monto",
      field: "DescGrlMonto",
      flex: 0.8,
      minWidth: 100,
      cellRenderer: MontoRenderer,
    },
    {
      headerName: "SubTotal 2",
      field: "SubTotal2",
      flex: 0.8,
      minWidth: 130,
      cellRenderer: MontoRenderer,
    },
    {
      headerName: "IVA (%)",
      field: "Iva",
      flex: 0.6,
      minWidth: 80,
      cellRenderer: PorcentajeRenderer,
    },
    {
      headerName: "IVA Monto",
      field: "IvaMonto",
      flex: 0.8,
      minWidth: 100,
      cellRenderer: MontoRenderer,
    },
    {
      headerName: "Total Final",
      field: "TotalFinal",
      flex: 1,
      minWidth: 130,
      cellStyle: {
        fontWeight: 600,
        color: "#228be6",
      },
      cellRenderer: MontoRenderer,
    },
    {
      headerName: "Total Venta",
      field: "MontoTotal",
      flex: 1,
      minWidth: 130,
      cellStyle: {
        fontWeight: 600,
        color: "#228be6",
      },
      cellRenderer: MontoRenderer,
    },
    {
      headerName: "Comentario",
      field: "Comentario",
      flex: 1.5,
      minWidth: 150,
      cellRenderer: (params: any) =>
        params.value ? (
          <Flex align="center" gap="xs">
            <IconNotes size={16} color="#228be6" />
            <Text>{params.value}</Text>
          </Flex>
        ) : (
          <Text color="dimmed">-</Text>
        ),
    },
  ]

  const onGridReady = (params: any) => {
    setGridApi(params.api)
    setGridColumnApi(params.columnApi)
    params.api.sizeColumnsToFit()
  }

  // Función para limpiar filtros
  const limpiarFiltros = () => {
    setDateRange([null, null])
    setSelectedEstatus([])
    setSelectedClientes([])
    setSelectedMetodosPago([])
  }

  // Función para exportar a Excel
  const exportarExcel = () => {
    if (!filteredVentasDetalles.length) return

    Swal.fire({
      title: "Generando reporte",
      text: "Preparando datos para Excel...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      // Crear libro de Excel
      const workbook = XLSX.utils.book_new()

      // Hoja 1: Resumen
      const resumenData = [
        ["Reporte de Ventas", ""],
        ["Fecha de generación", new Date().toLocaleString()],
        ["", ""],
        ["Total de ventas", stats.totalVentas],
        ["Monto total", `${stats.montoTotal.toFixed(2)} MXN`],
        ["", ""],
        ["Ventas completadas", stats.ventasCompletadas],
        ["Monto completadas", `${stats.montoCompletadas.toFixed(2)} MXN`],
        ["", ""],
        ["Ventas pendientes", stats.ventasPendientes],
        ["Monto pendientes", `${stats.montoPendientes.toFixed(2)} MXN`],
        ["", ""],
        ["Ventas canceladas", stats.ventasCanceladas],
        ["Monto canceladas", `${stats.montoCanceladas.toFixed(2)} MXN`],
        ["", ""],
        ["Ventas en efectivo", stats.ventasEfectivo],
        ["Monto efectivo", `${stats.montoEfectivo.toFixed(2)} MXN`],
        ["", ""],
        ["Ventas con tarjeta", stats.ventasTarjeta],
        ["Monto tarjeta", `${stats.montoTarjeta.toFixed(2)} MXN`],
        ["", ""],
        ["Ventas a crédito", stats.ventasCredito],
        ["Monto crédito", `${stats.montoCredito.toFixed(2)} MXN`],
      ]

      const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData)
      XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen")

      // Hoja 2: Ventas con Detalles - Reorganizada en secuencia lógica
      const ventasDetallesData = filteredVentasDetalles.map((item) => {
        const subtotal = Number.parseFloat(item.SubTotal || 0)
        const ivaPorcentaje = Number.parseFloat(item.Iva || 0)
        const descuentomonto = (subtotal * (item.DescuentoP || item.PrecioModificado ? 0 : item.Porcentaje || 0)) / 100
        const subtotal2 = subtotal - descuentomonto
        const ivaMonto = (subtotal2 * ivaPorcentaje) / 100
        const totalFinal = subtotal2 + ivaMonto

        return {
          // Datos del encabezado
          "Folio Venta": item.IdVenta,
          Estado: item.Estatus,
          "N° Documento": item.NumeroDocumento || "-",
          Fecha: item.FechaRegistro ? new Date(item.FechaRegistro).toLocaleDateString() : "-",
          Cliente: item.NombreCliente || "Cliente General",
          "ID Cliente": item.DocumentoCliente || "-",
          Usuario: item.UsuarioRegistro || "Admin",
          Empleado: item.Empleado || "-",
          "N° Empleado": item.NumEmpleado || "-",
          "Método de Pago": item.TPago === "TARJETA" ? "Tarjeta" : item.TPago === "CREDITO" ? "Crédito" : "Efectivo",

          // Datos del detalle en secuencia lógica
          "Código Producto": item.CodigoProducto || "-",
          "Descripción Producto": item.DescripcionProducto || "-",
          Categoría: item.CategoriaProducto || "-",
          Medida: item.MedidaProducto || "-",
          "Precio Unitario": Number.parseFloat(item.PrecioVenta || 0).toFixed(2),
          Cantidad: item.Cantidad || "0",
          "Descuento Producto (%)": item.DescuentoP || "0",
          "Descuento Monto": Number.parseFloat(item.DescuentoM || 0).toFixed(2),
          Subtotal: Number.parseFloat(item.SubTotal || 0).toFixed(2),
          "Descuento General (%)": item.DescuentoP || item.PrecioModificado ? 0 : item.Porcentaje || "0",
          "Descuento General Monto": descuentomonto,
          "Subtotal 2": subtotal2,
          "IVA (%)": item.Iva || "0",
          "IVA Monto": ivaMonto.toFixed(2),
          "Total Final": totalFinal.toFixed(2),
          "Monto Total Venta": Number.parseFloat(item.MontoTotal || 0).toFixed(2),

          // Datos adicionales
          "Pagó Con": item.TPago === "EFECTIVO" ? Number.parseFloat(item.PagoCon || 0).toFixed(2) : "-",
          Cambio: item.TPago === "EFECTIVO" ? Number.parseFloat(item.Cambio || 0).toFixed(2) : "-",
          "Cantidad Total Productos": item.CantidadProductos || "0",
          "ID Detalle": item.IdDetalle || "-",
          "ID Producto": item.IdProducto || "-",
          Comentario: item.Comentario || "-",
        }
      })

      const ventasDetallesSheet = XLSX.utils.json_to_sheet(ventasDetallesData)

      // Tipado manual de columnas específicas
      const colsTipoNumero = [
        "Precio Unitario",
        "Descuento Monto",
        "Subtotal",
        "IVA Monto",
        "Total Final",
        "Monto Total Venta",
        "Pagó Con",
        "Cambio",
        "Descuento General Monto",
        "Subtotal 2",
      ]

      const colsTipoPorcentaje = ["Descuento General (%)", "Descuento Producto (%)", "IVA (%)"]

      const monedaFormato = "$#,##0.00"
      const porcentajeFormato = "0.00%"

      const cabeceras = Object.keys(ventasDetallesData[0])
      const colLetras = cabeceras.map((_, i) => XLSX.utils.encode_col(i))

      ventasDetallesData.forEach((fila: Record<string, any>, filaIndex) => {
        cabeceras.forEach((col, colIndex) => {
          const letra = colLetras[colIndex]
          const celdaRef = `${letra}${filaIndex + 2}`

          const celda = ventasDetallesSheet[celdaRef]
          if (!celda) return

          if (colsTipoNumero.includes(col)) {
            celda.t = "n"
            celda.v = Number.parseFloat(fila[col] as string) || 0
            celda.z = monedaFormato
          }

          if (colsTipoPorcentaje.includes(col)) {
            const val = Number.parseFloat(fila[col])
            celda.t = "n"
            celda.v = isNaN(val) ? 0 : val / 100 // Convertir 15 → 0.15
            celda.z = porcentajeFormato
          }

          if (col === "Fecha") {
            const date = new Date(fila[col])
            if (!isNaN(date.getTime())) {
              celda.t = "d"
              celda.v = date
              celda.z = "yyyy-mm-dd"
            }
          }
        })
      })

      // Ajustar ancho de columnas
      const wscols = [
        { wch: 10 }, // Folio Venta
        { wch: 12 }, // Estado
        { wch: 15 }, // N° Documento
        { wch: 12 }, // Fecha
        { wch: 25 }, // Cliente
        { wch: 12 }, // ID Cliente
        { wch: 15 }, // Usuario
        { wch: 20 }, // Empleado
        { wch: 12 }, // N° Empleado
        { wch: 15 }, // Método de Pago
        { wch: 15 }, // Código Producto
        { wch: 30 }, // Descripción Producto
        { wch: 15 }, // Categoría
        { wch: 10 }, // Medida
        { wch: 12 }, // Precio Unitario
        { wch: 10 }, // Cantidad
        { wch: 20 }, // Descuento Producto (%)
        { wch: 15 }, // Descuento Monto
        { wch: 12 }, // Subtotal
        { wch: 20 }, // Descuento General (%)
        { wch: 8 }, // IVA (%)
        { wch: 10 }, // IVA Monto
        { wch: 12 }, // Total Final
        { wch: 12 }, // Monto Total Venta
        { wch: 10 }, // Pagó Con
        { wch: 10 }, // Cambio
        { wch: 12 }, // Cantidad Total Productos
        { wch: 10 }, // ID Detalle
        { wch: 10 }, // ID Producto
        { wch: 30 }, // Comentario
      ]
      ventasDetallesSheet["!cols"] = wscols

      XLSX.utils.book_append_sheet(workbook, ventasDetallesSheet, "Ventas con Detalles")

      // Guardar el archivo
      XLSX.writeFile(workbook, `Reporte_Ventas_Completo_${new Date().toISOString().split("T")[0]}.xlsx`)

      Swal.fire({
        position: "top-end",
        icon: "success",
        title: "Reporte exportado",
        text: "El reporte completo se ha exportado correctamente a Excel",
        showConfirmButton: false,
        timer: 2000,
        toast: true,
      })
    } catch (error) {
      console.error("Error al exportar a Excel:", error)
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo generar el reporte de Excel",
      })
    }
  }

  // Función para exportar a PDF
  const exportarPDF = () => {
    if (!filteredVentasDetalles.length) return

    Swal.fire({
      title: "Generando PDF",
      text: "Esto puede tardar unos momentos...",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      },
    })

    try {
      const doc = new jsPDF("landscape")
      doc.setFontSize(18)
      doc.text("Reporte de Ventas con Detalles", 14, 22)
      doc.setFontSize(11)
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 30)

      // Agregar filtros aplicados
      let yPos = 38
      doc.setFontSize(10)
      if (dateRange[0] && dateRange[1]) {
        doc.text(`Período: ${dateRange[0].toLocaleDateString()} al ${dateRange[1].toLocaleDateString()}`, 14, yPos)
        yPos += 6
      }
      if (selectedEstatus.length > 0) {
        doc.text(`Estados: ${selectedEstatus.join(", ")}`, 14, yPos)
        yPos += 6
      }
      if (selectedClientes.length > 0) {
        const clientesNames = selectedClientes
          .map((id) => clientesOptions.find((c) => c.value === id)?.label || id)
          .join(", ")
        doc.text(`Clientes: ${clientesNames}`, 14, yPos)
        yPos += 6
      }
      if (selectedMetodosPago.length > 0) {
        const metodos = selectedMetodosPago
          .map((m) => (m === "TARJETA" ? "Tarjeta" : m === "CREDITO" ? "Crédito" : "Efectivo"))
          .join(", ")
        doc.text(`Métodos de pago: ${metodos}`, 14, yPos)
        yPos += 6
      }

      // Agregar estadísticas
      doc.setFontSize(12)
      doc.text("Resumen:", 14, yPos + 4)
      yPos += 10
      doc.setFontSize(10)
      doc.text(`Total de ventas: ${stats.totalVentas}`, 14, yPos)
      yPos += 6
      doc.text(`Monto total: ${stats.montoTotal.toFixed(2)} MXN`, 14, yPos)
      yPos += 6
      doc.text(`Completadas: ${stats.ventasCompletadas} (${stats.montoCompletadas.toFixed(2)} MXN)`, 14, yPos)
      yPos += 6
      doc.text(`Pendientes: ${stats.ventasPendientes} (${stats.montoPendientes.toFixed(2)} MXN)`, 14, yPos)
      yPos += 6
      doc.text(`Canceladas: ${stats.ventasCanceladas} (${stats.montoCanceladas.toFixed(2)} MXN)`, 14, yPos)

      // Agregar tabla de datos con columnas en secuencia lógica
      const tableColumn = [
        "Folio",
        "Estado",
        "Cliente",
        "Nombre empleado",
        "N° empleado",
        "Producto",
        "Precio",
        "Cant.",
        "Desc.(%)",
        "Subtotal",
        "IVA(%)",
        "IVA($)",
        "Total Final",
      ]

      const tableRows = filteredVentasDetalles.map((item) => {
        const subtotal = Number.parseFloat(item.SubTotal || 0)
        const ivaPorcentaje = Number.parseFloat(item.Iva || 0)
        const ivaMonto = (subtotal * ivaPorcentaje) / 100
        const totalFinal = subtotal + ivaMonto

        return [
          item.IdVenta,
          item.Estatus,
          item.NombreCliente || "Cliente General",
          item.NombreEmpleado || "-",
          item.NumEmpleado || "-",
          item.DescripcionProducto || "-",
          `$${Number.parseFloat(item.PrecioVenta || 0).toFixed(2)}`,
          item.Cantidad || "0",
          `${item.DescuentoP || "0"}%`,
          `$${subtotal.toFixed(2)}`,
          `${ivaPorcentaje}%`,
          `$${ivaMonto.toFixed(2)}`,
          `$${totalFinal.toFixed(2)}`,
        ]
      })

      // @ts-ignore - jspdf-autotable types
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: yPos + 10,
        theme: "grid",
        styles: { fontSize: 8 },
        headStyles: { fillColor: [34, 139, 230] },
      })

      // Nueva función para exportar gráficos a PDF
      const exportarGraficosPDF = async () => {
        try {
          // Crear un nuevo PDF para los gráficos
          const docGraficos = new jsPDF()
          docGraficos.setFontSize(18)
          docGraficos.text("Gráficos del Reporte de Ventas", 14, 22)
          docGraficos.setFontSize(11)
          docGraficos.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 30)

          let yPosition = 40

          // Capturar y agregar cada gráfico si existe
          if (estatusChartRef.current) {
            const estatusCanvas = await html2canvas(estatusChartRef.current)
            const estatusImgData = estatusCanvas.toDataURL("image/png")
            docGraficos.text("Ventas por Estado", 14, yPosition)
            yPosition += 5
            docGraficos.addImage(estatusImgData, "PNG", 15, yPosition, 180, 90)
            yPosition += 100
          }

          if (metodoPagoChartRef.current) {
            const metodoPagoCanvas = await html2canvas(metodoPagoChartRef.current)
            const metodoPagoImgData = metodoPagoCanvas.toDataURL("image/png")
            docGraficos.text("Ventas por Método de Pago", 14, yPosition)
            yPosition += 5
            docGraficos.addImage(metodoPagoImgData, "PNG", 15, yPosition, 180, 90)
            yPosition += 100
          }

          // Si no hay espacio suficiente, agregar nueva página
          if (yPosition > 240 && montosEstatusChartRef.current) {
            docGraficos.addPage()
            yPosition = 20
          }

          if (montosEstatusChartRef.current) {
            const montosCanvas = await html2canvas(montosEstatusChartRef.current)
            const montosImgData = montosCanvas.toDataURL("image/png")
            docGraficos.text("Montos por Estado", 14, yPosition)
            yPosition += 5
            docGraficos.addImage(montosImgData, "PNG", 15, yPosition, 180, 90)
          }

          // Guardar el PDF con gráficos
          docGraficos.save(`Reporte_Ventas_Graficos_${new Date().toISOString().split("T")[0]}.pdf`)

          Swal.fire({
            position: "top-end",
            icon: "success",
            title: "PDF de gráficos generado",
            text: "Los gráficos se han exportado correctamente a PDF",
            showConfirmButton: false,
            timer: 2000,
            toast: true,
          })
        } catch (error) {
          console.error("Error al exportar gráficos a PDF:", error)
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudieron exportar los gráficos a PDF",
          })
        }
      }

      doc.save(`Reporte_Ventas_Detalles_${new Date().toISOString().split("T")[0]}.pdf`)

      // Si estamos en modo gráfico, también exportamos los gráficos
      if (viewMode === "chart") {
        exportarGraficosPDF()
      } else {
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "PDF generado",
          text: "El reporte se ha exportado correctamente a PDF",
          showConfirmButton: false,
          timer: 2000,
          toast: true,
        })
      }
    } catch (error) {
      console.error("Error al exportar a PDF:", error)
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo generar el reporte PDF",
      })
    }
  }

  return (
    <Box>
      {/* Filtros */}
      {showFilters && (
        <Paper p="md" radius="md" withBorder mb="md">
          <Flex justify="space-between" align="center" mb="md">
            <Title order={4}>Filtros de Ventas</Title>
            <Button variant="subtle" color="gray" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
          </Flex>

          <Grid>
            <Grid.Col span={6}>
              <DatePickerInput
                type="range"
                label="Rango de fechas"
                value={dateRange as [Date | null, Date | null]}
                onChange={setDateRange}
                icon={<IconCalendar size={16} />}
                clearable
                w="100%"
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <MultiSelect
                label="Estado de la venta"
                placeholder="Todos los estados"
                data={estatusOptions}
                value={selectedEstatus}
                onChange={setSelectedEstatus}
                clearable
                w="100%"
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <MultiSelect
                label="Cliente"
                placeholder="Todos los clientes"
                data={clientesOptions}
                value={selectedClientes}
                onChange={setSelectedClientes}
                searchable
                clearable
                w="100%"
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <MultiSelect
                label="Método de pago"
                placeholder="Todos los métodos"
                data={metodoPagoOptions}
                value={selectedMetodosPago}
                onChange={setSelectedMetodosPago}
                clearable
                w="100%"
              />
            </Grid.Col>
          </Grid>
        </Paper>
      )}

      {/* Estadísticas */}
      <Grid mb="md">
        <Grid.Col span={3}>
          <Card p="md" radius="md" withBorder>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
              Total Ventas
            </Text>
            <Text weight={700} size="xl">
              {stats.totalVentas}
            </Text>
            <Text size="sm" color="dimmed">
              Monto: ${stats.montoTotal.toFixed(2)} MXN
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card p="md" radius="md" withBorder>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
              Completadas
            </Text>
            <Text weight={700} size="xl" color="green">
              {stats.ventasCompletadas}
            </Text>
            <Text size="sm" color="green">
              ${stats.montoCompletadas.toFixed(2)} MXN
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card p="md" radius="md" withBorder>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
              Pendientes
            </Text>
            <Text weight={700} size="xl" color="yellow">
              {stats.ventasPendientes}
            </Text>
            <Text size="sm" color="yellow">
              ${stats.montoPendientes.toFixed(2)} MXN
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={3}>
          <Card p="md" radius="md" withBorder>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
              Canceladas
            </Text>
            <Text weight={700} size="xl" color="red">
              {stats.ventasCanceladas}
            </Text>
            <Text size="sm" color="red">
              ${stats.montoCanceladas.toFixed(2)} MXN
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Visualización de datos */}
      {viewMode === "table" ? (
        <Box>
          {loading || loadingDetalles ? (
            <Flex align="center" justify="center" p="xl">
              <Loader size="md" />
              <Text ml="md">Cargando datos...</Text>
            </Flex>
          ) : (
            <Box>
              <DataTable
                rowData={filteredVentasDetalles}
                columnDefs={columnDefs}
                onGridReady={onGridReady}
                rowsPerPage={10}
                pagination={true}
              />
            </Box>
          )}
        </Box>
      ) : (
        <Grid>
          <Grid.Col span={6}>
            <Paper p="md" radius="md" withBorder>
              <Text weight={600} mb="md" align="center">
                Ventas por Estado
              </Text>
              <Box sx={{ height: "300px" }} ref={estatusChartRef}>
                {chartType === "bar" ? (
                  <Bar data={chartData.estatusData} options={chartOptions} />
                ) : (
                  <Pie data={chartData.estatusData} options={chartOptions} />
                )}
              </Box>
            </Paper>
          </Grid.Col>
          <Grid.Col span={6}>
            <Paper p="md" radius="md" withBorder>
              <Text weight={600} mb="md" align="center">
                Ventas por Método de Pago
              </Text>
              <Box sx={{ height: "300px" }} ref={metodoPagoChartRef}>
                {chartType === "bar" ? (
                  <Bar data={chartData.metodoPagoData} options={chartOptions} />
                ) : (
                  <Pie data={chartData.metodoPagoData} options={chartOptions} />
                )}
              </Box>
            </Paper>
          </Grid.Col>
          <Grid.Col span={12}>
            <Paper p="md" radius="md" withBorder>
              <Text weight={600} mb="md" align="center">
                Montos por Estado
              </Text>
              <Box sx={{ height: "300px" }} ref={montosEstatusChartRef}>
                <Bar data={chartData.montosEstatusData} options={chartOptions} />
              </Box>
            </Paper>
          </Grid.Col>
        </Grid>
      )}

      {/* Botones de exportación */}
      <Group position="right" mt="md">
        <Button
          variant="outline"
          color="blue"
          leftIcon={<IconFileSpreadsheet size={16} />}
          onClick={exportarExcel}
          disabled={filteredVentasDetalles.length === 0}
          loading={loadingDetalles}
        >
          Exportar a Excel
        </Button>
        <Button
          variant="outline"
          color="red"
          leftIcon={<IconFile size={16} />}
          onClick={exportarPDF}
          disabled={filteredVentasDetalles.length === 0}
        >
          Exportar a PDF
        </Button>
        {viewMode === "chart" && (
          <Button
            variant="outline"
            color="green"
            leftIcon={<IconChartBar size={16} />}
            onClick={() => {
              Swal.fire({
                title: "Generando PDF de gráficos",
                text: "Esto puede tardar unos momentos...",
                allowOutsideClick: false,
                didOpen: () => {
                  Swal.showLoading()
                },
              })

              setTimeout(async () => {
                try {
                  // Crear un nuevo PDF para los gráficos
                  const docGraficos = new jsPDF()
                  docGraficos.setFontSize(18)
                  docGraficos.text("Gráficos del Reporte de Ventas", 14, 22)
                  docGraficos.setFontSize(11)
                  docGraficos.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 30)

                  let yPosition = 40

                  // Capturar y agregar cada gráfico si existe
                  if (estatusChartRef.current) {
                    const estatusCanvas = await html2canvas(estatusChartRef.current)
                    const estatusImgData = estatusCanvas.toDataURL("image/png")
                    docGraficos.text("Ventas por Estado", 14, yPosition)
                    yPosition += 5
                    docGraficos.addImage(estatusImgData, "PNG", 15, yPosition, 180, 90)
                    yPosition += 100
                  }

                  if (metodoPagoChartRef.current) {
                    const metodoPagoCanvas = await html2canvas(metodoPagoChartRef.current)
                    const metodoPagoImgData = metodoPagoCanvas.toDataURL("image/png")
                    docGraficos.text("Ventas por Método de Pago", 14, yPosition)
                    yPosition += 5
                    docGraficos.addImage(metodoPagoImgData, "PNG", 15, yPosition, 180, 90)
                    yPosition += 100
                  }

                  // Si no hay espacio suficiente, agregar nueva página
                  if (yPosition > 240 && montosEstatusChartRef.current) {
                    docGraficos.addPage()
                    yPosition = 20
                  }

                  if (montosEstatusChartRef.current) {
                    const montosCanvas = await html2canvas(montosEstatusChartRef.current)
                    const montosImgData = montosCanvas.toDataURL("image/png")
                    docGraficos.text("Montos por Estado", 14, yPosition)
                    yPosition += 5
                    docGraficos.addImage(montosImgData, "PNG", 15, yPosition, 180, 90)
                  }

                  // Guardar el PDF con gráficos
                  docGraficos.save(`Reporte_Ventas_Graficos_${new Date().toISOString().split("T")[0]}.pdf`)

                  Swal.fire({
                    position: "top-end",
                    icon: "success",
                    title: "PDF de gráficos generado",
                    text: "Los gráficos se han exportado correctamente a PDF",
                    showConfirmButton: false,
                    timer: 2000,
                    toast: true,
                  })
                } catch (error) {
                  console.error("Error al exportar gráficos a PDF:", error)
                  Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "No se pudieron exportar los gráficos a PDF",
                  })
                }
              }, 500)
            }}
            disabled={filteredVentasDetalles.length === 0}
          >
            Exportar Gráficos a PDF
          </Button>
        )}
      </Group>
    </Box>
  )
}

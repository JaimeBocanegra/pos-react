"use client"

import {
  Paper,
  Title,
  Text,
  Box,
  Button,
  Flex,
  MultiSelect,
  Grid,
  Badge,
  Card,
  Group,
  Loader,
  Center,
} from "@mantine/core"
import { DatePickerInput } from "@mantine/dates"
import {
  IconCalendar,
  IconTruckDelivery,
  IconCheck,
  IconBan,
  IconReceipt,
  IconFileSpreadsheet,
  IconFile,
  IconPackage,
  IconUser,
} from "@tabler/icons-react"
import { useState, useEffect, useMemo } from "react"
import { obtenerCompras, obtenerDetallesCompra } from "../services/CompraService"
import { obtenerProveedores } from "../services/ProveedorService"
import { obtenerProductos } from "../services/ProductoService"
import DataTable from "../../components/DataTable"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import * as XLSX from "xlsx"
import { Bar, Pie } from "react-chartjs-2"
import Swal from "sweetalert2"

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
  return props.value ? (
    <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>
      Activa
    </Badge>
  ) : (
    <Badge color="red" variant="light" leftSection={<IconBan size={12} />}>
      Cancelada
    </Badge>
  )
}

// Componente para renderizar cantidad
const CantidadRenderer = (props: any) => {
  const value = Number.parseInt(props.value || 0)
  return <span>{value}</span>
}

interface ReporteComprasProps {
  showFilters: boolean
  viewMode: "table" | "chart"
  chartType: "bar" | "pie"
}

export function ReporteCompras({ showFilters, viewMode, chartType }: ReporteComprasProps) {
  const [compras, setCompras] = useState<any[]>([])
  const [detallesCompras, setDetallesCompras] = useState<any[]>([])
  const [comprasConDetalles, setComprasConDetalles] = useState<any[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null])
  const [selectedEstatus, setSelectedEstatus] = useState<string[]>([])
  const [selectedProveedores, setSelectedProveedores] = useState<string[]>([])
  const [selectedProductos, setSelectedProductos] = useState<string[]>([])
  const [gridApi, setGridApi] = useState<any | null>(null)
  const [gridColumnApi, setGridColumnApi] = useState<any | null>(null)

  // Cargar datos
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true)
      try {
        const [comprasData, proveedoresData, productosData] = await Promise.all([
          obtenerCompras(),
          obtenerProveedores(),
          obtenerProductos(),
        ])
        setCompras(comprasData)
        setProveedores(proveedoresData)
        setProductos(productosData)

        // Cargar detalles de compras
        const detalles: any[] = []
        for (const compra of comprasData) {
          const detallesCompra = await obtenerDetallesCompra(compra.IdCompra)
          detalles.push(...detallesCompra)
        }
        setDetallesCompras(detalles)

        // Unir compras con sus detalles
        const comprasDetalladas: any[] = []

        for (const compra of comprasData) {
          const detallesDeCompra = detalles.filter((d) => d.IdCompra === compra.IdCompra)

          if (detallesDeCompra.length === 0) {
            // Si no hay detalles, agregar la compra con valores nulos en los campos de detalle
            comprasDetalladas.push({
              ...compra,
              IdDetalleCompra: null,
              IdProducto: null,
              CodigoProducto: null,
              DescripcionProducto: null,
              CategoriaProducto: null,
              MedidaProducto: null,
              PrecioCompra: null,
              PrecioVenta: null,
              Cantidad: null,
              SubTotal: null,
              SinDetalles: true,
            })
          } else {
            // Si hay detalles, crear una fila por cada detalle
            for (const detalle of detallesDeCompra) {
              comprasDetalladas.push({
                ...compra,
                ...detalle,
                SinDetalles: false,
              })
            }
          }
        }

        setComprasConDetalles(comprasDetalladas)
      } catch (error) {
        console.error("Error al cargar datos:", error)
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar los datos del reporte",
          toast: true,
          position: "top-end",
          timer: 3000,
          showConfirmButton: false,
        })
      } finally {
        setLoading(false)
      }
    }

    cargarDatos()
  }, [])

  // Opciones para los filtros
  const estatusOptions = [
    { value: "true", label: "Activa" },
    { value: "false", label: "Cancelada" },
  ]

  const proveedoresOptions = useMemo(() => {
    return proveedores.map((proveedor) => ({
      value: proveedor.IdProveedor?.toString() || proveedor.Id_proveedor?.toString(),
      label: proveedor.NombreCompleto || proveedor.Nombre,
    }))
  }, [proveedores])

  const productosOptions = useMemo(() => {
    return productos.map((producto) => ({
      value: producto.Id_producto.toString(),
      label: `${producto.Codigo} - ${producto.Descripcion}`,
    }))
  }, [productos])

  // Filtrar compras con detalles
  const filteredComprasConDetalles = useMemo(() => {
    return comprasConDetalles.filter((compraDetalle) => {
      // Filtro por fecha
      if (dateRange[0] && dateRange[1]) {
        const compraDate = new Date(compraDetalle.FechaRegistro)
        const startDate = new Date(dateRange[0])
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(dateRange[1])
        endDate.setHours(23, 59, 59, 999)

        if (compraDate < startDate || compraDate > endDate) {
          return false
        }
      }

      // Filtro por estatus
      if (selectedEstatus.length > 0) {
        const activoStr = compraDetalle.Activo.toString()
        if (!selectedEstatus.includes(activoStr)) {
          return false
        }
      }

      // Filtro por proveedor
      if (
        selectedProveedores.length > 0 &&
        (!compraDetalle.DocumentoProveedor || !selectedProveedores.includes(compraDetalle.DocumentoProveedor))
      ) {
        return false
      }

      // Filtro por producto
      if (
        selectedProductos.length > 0 &&
        (!compraDetalle.IdProducto || !selectedProductos.includes(compraDetalle.IdProducto.toString()))
      ) {
        return false
      }

      return true
    })
  }, [comprasConDetalles, dateRange, selectedEstatus, selectedProveedores, selectedProductos])

  // Obtener compras únicas para estadísticas
  const comprasUnicas = useMemo(() => {
    const idComprasSet = new Set<number>()
    const comprasUnicas: any[] = []

    filteredComprasConDetalles.forEach((compraDetalle) => {
      if (!idComprasSet.has(compraDetalle.IdCompra)) {
        idComprasSet.add(compraDetalle.IdCompra)
        comprasUnicas.push({
          IdCompra: compraDetalle.IdCompra,
          Activo: compraDetalle.Activo,
          MontoTotal: compraDetalle.MontoTotal,
          DocumentoProveedor: compraDetalle.DocumentoProveedor,
          NombreProveedor: compraDetalle.NombreProveedor,
        })
      }
    })

    return comprasUnicas
  }, [filteredComprasConDetalles])

  // Calcular estadísticas
  const stats = useMemo(() => {
    const totalCompras = comprasUnicas.length
    let montoTotal = 0
    let comprasActivas = 0
    let comprasCanceladas = 0
    let montoActivas = 0
    let montoCanceladas = 0

    comprasUnicas.forEach((compra) => {
      const monto = Number.parseFloat(compra.MontoTotal || 0)
      montoTotal += monto

      if (compra.Activo) {
        comprasActivas++
        montoActivas += monto
      } else {
        comprasCanceladas++
        montoCanceladas += monto
      }
    })

    // Estadísticas por proveedor
    const proveedorStats: Record<string, { compras: number; monto: number }> = {}
    comprasUnicas.forEach((compra) => {
      const proveedorId = compra.DocumentoProveedor || "Sin proveedor"
      const monto = Number.parseFloat(compra.MontoTotal || 0)

      if (!proveedorStats[proveedorId]) {
        proveedorStats[proveedorId] = { compras: 0, monto: 0 }
      }

      proveedorStats[proveedorId].compras++
      proveedorStats[proveedorId].monto += monto
    })

    // Estadísticas por producto
    const productoStats: Record<string, { cantidad: number; monto: number }> = {}
    filteredComprasConDetalles.forEach((compraDetalle) => {
      if (compraDetalle.IdProducto) {
        const productoId = compraDetalle.IdProducto.toString()
        const cantidad = Number.parseInt(compraDetalle.Cantidad || 0)
        const monto = Number.parseFloat(compraDetalle.SubTotal || 0)

        if (!productoStats[productoId]) {
          productoStats[productoId] = { cantidad: 0, monto: 0 }
        }

        productoStats[productoId].cantidad += cantidad
        productoStats[productoId].monto += monto
      }
    })

    return {
      totalCompras,
      montoTotal,
      comprasActivas,
      comprasCanceladas,
      montoActivas,
      montoCanceladas,
      proveedorStats,
      productoStats,
    }
  }, [comprasUnicas, filteredComprasConDetalles])

  // Datos para gráficos
  const chartData = useMemo(() => {
    // Datos para gráfico de estatus
    const estatusData = {
      labels: ["Activas", "Canceladas"],
      datasets: [
        {
          label: "Cantidad de Compras",
          data: [stats.comprasActivas, stats.comprasCanceladas],
          backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 99, 132, 0.6)"],
          borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)"],
          borderWidth: 1,
        },
      ],
    }

    // Datos para gráfico de montos por estatus
    const montosEstatusData = {
      labels: ["Activas", "Canceladas"],
      datasets: [
        {
          label: "Monto Total (MXN)",
          data: [stats.montoActivas, stats.montoCanceladas],
          backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 99, 132, 0.6)"],
          borderColor: ["rgba(75, 192, 192, 1)", "rgba(255, 99, 132, 1)"],
          borderWidth: 1,
        },
      ],
    }

    // Datos para gráfico de proveedores (top 5)
    const proveedoresData = {
      labels: Object.keys(stats.proveedorStats)
        .map((id) => {
          const proveedor = proveedores.find(
            (p) => p.IdProveedor?.toString() === id || p.Id_proveedor?.toString() === id,
          )
          return proveedor ? proveedor.NombreCompleto || proveedor.Nombre : "Sin proveedor"
        })
        .slice(0, 5),
      datasets: [
        {
          label: "Cantidad de Compras",
          data: Object.values(stats.proveedorStats)
            .map((stat) => stat.compras)
            .slice(0, 5),
          backgroundColor: [
            "rgba(54, 162, 235, 0.6)",
            "rgba(153, 102, 255, 0.6)",
            "rgba(255, 159, 64, 0.6)",
            "rgba(75, 192, 192, 0.6)",
            "rgba(255, 99, 132, 0.6)",
          ],
          borderColor: [
            "rgba(54, 162, 235, 1)",
            "rgba(153, 102, 255, 1)",
            "rgba(255, 159, 64, 1)",
            "rgba(75, 192, 192, 1)",
            "rgba(255, 99, 132, 1)",
          ],
          borderWidth: 1,
        },
      ],
    }

    return {
      estatusData,
      montosEstatusData,
      proveedoresData,
    }
  }, [stats, proveedores])

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
        text: "Reporte de Compras",
      },
    },
  }

  // Configuración de columnas para la tabla
  const columnDefs = [
    // Columnas de la compra (encabezado)
    {
      headerName: "Folio",
      field: "IdCompra",
      flex: 0.7,
      minWidth: 80,
      cellStyle: {
        fontWeight: 500,
      },
    },
    {
      headerName: "Estado",
      field: "Activo",
      flex: 0.8,
      minWidth: 100,
      cellRenderer: EstadoRenderer,
    },
    {
      headerName: "N° Documento",
      field: "NumeroDocumento",
      flex: 1,
      minWidth: 120,
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
      minWidth: 100,
      cellRenderer: FechaRenderer,
    },
    {
      headerName: "Proveedor",
      field: "NombreProveedor",
      flex: 1.5,
      minWidth: 150,
      cellStyle: {
        lineHeight: "1.2",
      },
      cellRenderer: (params: any) => (
        <Flex align="center" gap="xs">
          <IconTruckDelivery size={16} color="#228be6" />
          <Text>{params.value || "-"}</Text>
        </Flex>
      ),
      wrapText: true,
      autoHeight: true,
    },
    {
      headerName: "Usuario",
      field: "UsuarioRegistro",
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: any) => (
        <Flex align="center" gap="xs">
          <IconUser size={16} color="#228be6" />
          <Text>{params.value || "-"}</Text>
        </Flex>
      ),
    },

    // Columnas del detalle
    {
      headerName: "Código",
      field: "CodigoProducto",
      flex: 0.8,
      minWidth: 100,
      cellRenderer: (params: any) => {
        if (params.data.SinDetalles) {
          return <Text color="dimmed">-</Text>
        }
        return <Text>{params.value || "-"}</Text>
      },
    },
    {
      headerName: "Producto",
      field: "DescripcionProducto",
      flex: 1.5,
      minWidth: 150,
      cellRenderer: (params: any) => {
        if (params.data.SinDetalles) {
          return <Text color="dimmed">Sin productos</Text>
        }
        return (
          <Flex align="center" gap="xs">
            <IconPackage size={16} color="#228be6" />
            <Text>{params.value || "-"}</Text>
          </Flex>
        )
      },
      wrapText: true,
      autoHeight: true,
    },
    {
      headerName: "Categoría",
      field: "CategoriaProducto",
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: any) => {
        if (params.data.SinDetalles) {
          return <Text color="dimmed">-</Text>
        }
        return <Text>{params.value || "-"}</Text>
      },
    },
    {
      headerName: "Precio Compra",
      field: "PrecioCompra",
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: any) => {
        if (params.data.SinDetalles) {
          return <Text color="dimmed">-</Text>
        }
        return <MontoRenderer value={params.value} />
      },
    },
    {
      headerName: "Precio Venta",
      field: "PrecioVenta",
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: any) => {
        if (params.data.SinDetalles) {
          return <Text color="dimmed">-</Text>
        }
        return <MontoRenderer value={params.value} />
      },
    },
    {
      headerName: "Cantidad",
      field: "Cantidad",
      flex: 0.7,
      minWidth: 90,
      cellRenderer: (params: any) => {
        if (params.data.SinDetalles) {
          return <Text color="dimmed">-</Text>
        }
        return <CantidadRenderer value={params.value} />
      },
    },
    {
      headerName: "Subtotal",
      field: "SubTotal",
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: any) => {
        if (params.data.SinDetalles) {
          return <Text color="dimmed">-</Text>
        }
        return <MontoRenderer value={params.value} />
      },
    },
    {
      headerName: "Total Compra",
      field: "MontoTotal",
      flex: 1,
      minWidth: 130,
      cellStyle: {
        fontWeight: 600,
        color: "#228be6",
      },
      cellRenderer: MontoRenderer,
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
    setSelectedProveedores([])
    setSelectedProductos([])
  }

  // Función para exportar a Excel
  const exportarExcel = () => {
    if (!filteredComprasConDetalles.length) {
      Swal.fire({
        icon: "warning",
        title: "Sin datos",
        text: "No hay datos para exportar",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      })
      return
    }

    // Crear una hoja de cálculo con los datos filtrados
    const worksheet = XLSX.utils.json_to_sheet(
      filteredComprasConDetalles.map((compra) => ({
        Folio: compra.IdCompra,
        Estado: compra.Activo ? "Activa" : "Cancelada",
        "N° Documento": compra.NumeroDocumento || "-",
        Fecha: compra.FechaRegistro ? new Date(compra.FechaRegistro).toLocaleDateString() : "-",
        Proveedor: compra.NombreProveedor || "-",
        "Usuario Registro": compra.UsuarioRegistro || "-",
        "Código Producto": compra.CodigoProducto || "-",
        "Descripción Producto": compra.DescripcionProducto || "-",
        Categoría: compra.CategoriaProducto || "-",
        Medida: compra.MedidaProducto || "-",
        "Precio Compra": compra.PrecioCompra ? `$${Number.parseFloat(compra.PrecioCompra).toFixed(2)}` : "-",
        "Precio Venta": compra.PrecioVenta ? `$${Number.parseFloat(compra.PrecioVenta).toFixed(2)}` : "-",
        Cantidad: compra.Cantidad || "-",
        Subtotal: compra.SubTotal ? `$${Number.parseFloat(compra.SubTotal).toFixed(2)}` : "-",
        "Total Compra": `$${Number.parseFloat(compra.MontoTotal || 0).toFixed(2)}`,
        Comentario: compra.Comentario || "-",
      })),
    )

    // Ajustar ancho de columnas
    const wscols = [
      { wch: 8 }, // Folio
      { wch: 12 }, // Estado
      { wch: 15 }, // N° Documento
      { wch: 12 }, // Fecha
      { wch: 25 }, // Proveedor
      { wch: 15 }, // Usuario Registro
      { wch: 15 }, // Código Producto
      { wch: 30 }, // Descripción Producto
      { wch: 15 }, // Categoría
      { wch: 10 }, // Medida
      { wch: 15 }, // Precio Compra
      { wch: 15 }, // Precio Venta
      { wch: 10 }, // Cantidad
      { wch: 15 }, // Subtotal
      { wch: 15 }, // Total Compra
      { wch: 30 }, // Comentario
    ]
    worksheet["!cols"] = wscols

    // Crear un libro de trabajo y agregar la hoja
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Compras Detalladas")

    // Agregar hoja de resumen
    const resumenData = [
      ["Resumen del Reporte de Compras", ""],
      ["Fecha de generación", new Date().toLocaleString()],
      ["", ""],
      ["Total de compras", stats.totalCompras],
      ["Monto total", `$${stats.montoTotal.toFixed(2)} MXN`],
      ["", ""],
      ["Compras activas", stats.comprasActivas],
      ["Monto activas", `$${stats.montoActivas.toFixed(2)} MXN`],
      ["", ""],
      ["Compras canceladas", stats.comprasCanceladas],
      ["Monto canceladas", `$${stats.montoCanceladas.toFixed(2)} MXN`],
    ]

    const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData)
    XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen")

    // Agregar hoja de detalles por proveedor
    const proveedoresData = [["Proveedor", "Cantidad de Compras", "Monto Total"]]
    Object.keys(stats.proveedorStats).forEach((id) => {
      const proveedor = proveedores.find((p) => p.IdProveedor?.toString() === id || p.Id_proveedor?.toString() === id)
      const nombre = proveedor ? proveedor.NombreCompleto || proveedor.Nombre : "Sin proveedor"
      const { compras, monto } = stats.proveedorStats[id]
      proveedoresData.push([nombre, compras, `$${monto.toFixed(2)} MXN`])
    })

    const proveedoresSheet = XLSX.utils.aoa_to_sheet(proveedoresData)
    XLSX.utils.book_append_sheet(workbook, proveedoresSheet, "Por Proveedor")

    // Agregar hoja de detalles por producto
    const productosData = [["Producto", "Cantidad", "Monto Total"]]
    Object.keys(stats.productoStats).forEach((id) => {
      const producto = productos.find((p) => p.Id_producto.toString() === id)
      const nombre = producto ? `${producto.Codigo} - ${producto.Descripcion}` : `Producto ID ${id}`
      const { cantidad, monto } = stats.productoStats[id]
      productosData.push([nombre, cantidad.toString(), `$${monto.toFixed(2)} MXN`])
    })

    const productosSheet = XLSX.utils.aoa_to_sheet(productosData)
    XLSX.utils.book_append_sheet(workbook, productosSheet, "Por Producto")

    // Guardar el archivo
    XLSX.writeFile(workbook, `Reporte_Compras_Detallado_${new Date().toISOString().split("T")[0]}.xlsx`)

    // Notificar al usuario
    Swal.fire({
      position: "top-end",
      icon: "success",
      title: "Reporte exportado",
      text: "El reporte se ha exportado correctamente a Excel",
      showConfirmButton: false,
      timer: 2000,
      toast: true,
    })
  }

  // Función para exportar a PDF
  const exportarPDF = () => {
    if (!filteredComprasConDetalles.length) {
      Swal.fire({
        icon: "warning",
        title: "Sin datos",
        text: "No hay datos para exportar",
        toast: true,
        position: "top-end",
        timer: 3000,
        showConfirmButton: false,
      })
      return
    }

    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text("Reporte de Compras Detallado", 14, 22)
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
      const estados = selectedEstatus.map((e) => (e === "true" ? "Activa" : "Cancelada")).join(", ")
      doc.text(`Estados: ${estados}`, 14, yPos)
      yPos += 6
    }
    if (selectedProveedores.length > 0) {
      const proveedoresNames = selectedProveedores
        .map((id) => proveedoresOptions.find((p) => p.value === id)?.label || id)
        .join(", ")
      doc.text(`Proveedores: ${proveedoresNames}`, 14, yPos)
      yPos += 6
    }
    if (selectedProductos.length > 0) {
      const productosNames = selectedProductos
        .map((id) => productosOptions.find((p) => p.value === id)?.label || id)
        .join(", ")
      doc.text(`Productos: ${productosNames}`, 14, yPos)
      yPos += 6
    }

    // Agregar estadísticas
    doc.setFontSize(12)
    doc.text("Resumen:", 14, yPos + 4)
    yPos += 10
    doc.setFontSize(10)
    doc.text(`Total de compras: ${stats.totalCompras}`, 14, yPos)
    yPos += 6
    doc.text(`Monto total: $${stats.montoTotal.toFixed(2)} MXN`, 14, yPos)
    yPos += 6
    doc.text(`Activas: ${stats.comprasActivas} ($${stats.montoActivas.toFixed(2)} MXN)`, 14, yPos)
    yPos += 6
    doc.text(`Canceladas: ${stats.comprasCanceladas} ($${stats.montoCanceladas.toFixed(2)} MXN)`, 14, yPos)

    // Agregar tabla de datos (versión simplificada para PDF)
    const tableColumn = ["Folio", "Estado", "N° Doc.", "Fecha", "Proveedor", "Producto", "Cant.", "Subtotal"]
    const tableRows = filteredComprasConDetalles.map((compra) => [
      compra.IdCompra,
      compra.Activo ? "Activa" : "Cancelada",
      compra.NumeroDocumento || "-",
      compra.FechaRegistro ? new Date(compra.FechaRegistro).toLocaleDateString() : "-",
      compra.NombreProveedor || "-",
      compra.DescripcionProducto || "-",
      compra.Cantidad || "-",
      compra.SubTotal ? `$${Number.parseFloat(compra.SubTotal).toFixed(2)}` : "-",
    ])

    // @ts-ignore - jspdf-autotable types
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: yPos + 10,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 139, 230] },
    })

    doc.save(`Reporte_Compras_Detallado_${new Date().toISOString().split("T")[0]}.pdf`)

    // Notificar al usuario
    Swal.fire({
      position: "top-end",
      icon: "success",
      title: "Reporte exportado",
      text: "El reporte se ha exportado correctamente a PDF",
      showConfirmButton: false,
      timer: 2000,
      toast: true,
    })
  }

  return (
    <Box>
      {/* Filtros */}
      {showFilters && (
        <Paper p="md" radius="md" withBorder mb="md">
          <Flex justify="space-between" align="center" mb="md">
            <Title order={4}>Filtros de Compras</Title>
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
                label="Estado de la compra"
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
                label="Proveedor"
                placeholder="Todos los proveedores"
                data={proveedoresOptions}
                value={selectedProveedores}
                onChange={setSelectedProveedores}
                searchable
                clearable
                w="100%"
              />
            </Grid.Col>
            <Grid.Col span={6}>
              <MultiSelect
                label="Producto"
                placeholder="Todos los productos"
                data={productosOptions}
                value={selectedProductos}
                onChange={setSelectedProductos}
                searchable
                clearable
                w="100%"
              />
            </Grid.Col>
          </Grid>
        </Paper>
      )}

      {/* Estadísticas */}
      <Grid mb="md">
        <Grid.Col span={4}>
          <Card p="md" radius="md" withBorder>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
              Total Compras
            </Text>
            <Text weight={700} size="xl">
              {stats.totalCompras}
            </Text>
            <Text size="sm" color="dimmed">
              Monto: ${stats.montoTotal.toFixed(2)} MXN
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={4}>
          <Card p="md" radius="md" withBorder>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
              Activas
            </Text>
            <Text weight={700} size="xl" color="green">
              {stats.comprasActivas}
            </Text>
            <Text size="sm" color="green">
              ${stats.montoActivas.toFixed(2)} MXN
            </Text>
          </Card>
        </Grid.Col>
        <Grid.Col span={4}>
          <Card p="md" radius="md" withBorder>
            <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
              Canceladas
            </Text>
            <Text weight={700} size="xl" color="red">
              {stats.comprasCanceladas}
            </Text>
            <Text size="sm" color="red">
              ${stats.montoCanceladas.toFixed(2)} MXN
            </Text>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Visualización de datos */}
      {loading ? (
        <Center style={{ height: "400px" }}>
          <Flex direction="column" align="center" gap="md">
            <Loader size="lg" />
            <Text>Cargando datos...</Text>
          </Flex>
        </Center>
      ) : viewMode === "table" ? (
        <Box sx={{ height: "calc(100vh - 400px)", minHeight: "400px" }}>
          <DataTable
            rowData={filteredComprasConDetalles}
            columnDefs={columnDefs}
            onGridReady={onGridReady}
            rowsPerPage={15}
            pagination={true}
          />
        </Box>
      ) : (
        <Grid>
          <Grid.Col span={6}>
            <Paper p="md" radius="md" withBorder>
              <Text weight={600} mb="md" align="center">
                Compras por Estado
              </Text>
              <Box sx={{ height: "300px" }}>
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
                Montos por Estado
              </Text>
              <Box sx={{ height: "300px" }}>
                {chartType === "bar" ? (
                  <Bar data={chartData.montosEstatusData} options={chartOptions} />
                ) : (
                  <Pie data={chartData.montosEstatusData} options={chartOptions} />
                )}
              </Box>
            </Paper>
          </Grid.Col>
          <Grid.Col span={12}>
            <Paper p="md" radius="md" withBorder>
              <Text weight={600} mb="md" align="center">
                Compras por Proveedor (Top 5)
              </Text>
              <Box sx={{ height: "300px" }}>
                <Bar data={chartData.proveedoresData} options={chartOptions} />
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
          disabled={filteredComprasConDetalles.length === 0}
        >
          Exportar a Excel
        </Button>
        <Button
          variant="outline"
          color="red"
          leftIcon={<IconFile size={16} />}
          onClick={exportarPDF}
          disabled={filteredComprasConDetalles.length === 0}
        >
          Exportar a PDF
        </Button>
      </Group>
    </Box>
  )
}

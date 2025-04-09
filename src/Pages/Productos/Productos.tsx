"use client"

import {
  ActionIcon,
  Button,
  Flex,
  Paper,
  Title,
  Group,
  Badge,
  Box,
  Text,
  TextInput,
  LoadingOverlay,
  Menu,
} from "@mantine/core"
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconEye,
  IconSearch,
  IconPackage,
  IconAlertTriangle,
  IconUpload,
  IconFileDownload,
  IconFileSpreadsheet,
} from "@tabler/icons-react"
import DataTable from "../../components/DataTable"
import { useEffect, useState, useMemo } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import Swal from "sweetalert2"
import { obtenerProductos, eliminarProducto, importarProductos } from "../services/ProductoService"
import { CustomFilter } from "../../components/CustomFilter"
import { ConfiguracionService } from "../services/ConfiguracionService"
import * as XLSX from "xlsx"

// Componente para renderizar montos
const MontoRenderer = (props: any) => {
  const value = Number.parseFloat(props.value || 0).toFixed(2)
  return <span>$ {value} MXN</span>
}

// Componente para renderizar el stock con indicador visual
const StockRenderer = ({ value, stockMinimo }: { value: any; stockMinimo: number }) => {
  const stockValue = Number.parseInt(value || 0)
  const isLowStock = stockValue <= stockMinimo

  return (
    <Badge
      color={isLowStock ? "red" : "green"}
      variant="filled"
      leftSection={isLowStock ? <IconAlertTriangle size={12} /> : null}
    >
      {value}
    </Badge>
  )
}

export function Productos() {
  const [gridApi, setGridApi] = useState<any | null>(null)
  const [gridColumnApi, setGridColumnApi] = useState<any | null>(null)
  const [productos, setProductos] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [stockMinimo, setStockMinimo] = useState(5)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Obtener el valor de stock mínimo desde configuraciones
  const obtenerStockMinimo = async () => {
    try {
      const config = await ConfiguracionService.getByKey("stock_minimo_notificacion")
      if (config?.valor) {
        setStockMinimo(Number(config.valor) || 5)
      }
    } catch (error) {
      console.error("Error al obtener stock mínimo:", error)
    }
  }

  // Obtener la lista de productos
  const obtieneProductos = async () => {
    try {
      setLoading(true)
      const data = await obtenerProductos()
      setProductos(data || [])
    } catch (error) {
      console.error("Error al obtener productos:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    obtieneProductos()
    obtenerStockMinimo()
  }, [location])

  // Filtrar productos basado en el término de búsqueda
  const filteredData = useMemo(() => {
    if (!productos || productos.length === 0) return []

    const searchLower = searchTerm.toLowerCase()
    return productos.filter(
      (producto) =>
        producto?.Codigo?.toLowerCase()?.includes(searchLower) ||
        producto?.Descripcion?.toLowerCase()?.includes(searchLower) ||
        producto?.Categoria?.toLowerCase()?.includes(searchLower)
    )
  }, [productos, searchTerm])

  // Configuración de columnas para la tabla
  const columnDefs = [
    { headerName: "ID", field: "Id_producto", hide: true },
    {
      headerName: "Código",
      field: "Codigo",
      flex: 1,
      minWidth: 100,
      filter: CustomFilter,
      cellStyle: { display: "flex", alignItems: "center" },
    },
    {
      headerName: "Descripción",
      field: "Descripcion",
      flex: 2,
      minWidth: 180,
      filter: CustomFilter,
      cellStyle: { display: "flex", alignItems: "center" },
    },
    {
      headerName: "Categoría",
      field: "Categoria",
      flex: 1.5,
      minWidth: 150,
      filter: CustomFilter,
      cellStyle: {
        backgroundColor: "rgba(20, 184, 166, 0.1)",
        color: "rgb(20, 184, 166)",
        borderRadius: "4px",
        padding: "4px 8px",
        display: "inline-flex",
        alignItems: "center",
      },
    },
    {
      headerName: "Medida",
      field: "Medida",
      flex: 1,
      minWidth: 100,
      filter: CustomFilter,
      cellStyle: { display: "flex", alignItems: "center" },
    },
    {
      headerName: "Precio Compra",
      field: "PrecioCompra",
      flex: 1,
      minWidth: 130,
      cellRenderer: (params: any) => <MontoRenderer value={params.value} />,
      cellStyle: { display: "flex", alignItems: "center", fontWeight: 500 },
    },
    {
      headerName: "Precio Venta",
      field: "PrecioVenta",
      flex: 1,
      minWidth: 130,
      cellRenderer: (params: any) => <MontoRenderer value={params.value} />,
      cellStyle: {
        display: "flex",
        alignItems: "center",
        fontWeight: 500,
        color: "#228be6",
      },
    },
    {
      headerName: "Stock",
      field: "Stock",
      flex: 1,
      minWidth: 100,
      cellRenderer: (params: any) => (
        <StockRenderer value={params.value} stockMinimo={stockMinimo} />
      ),
      cellStyle: { display: "flex", alignItems: "center" },
    },
    {
      headerName: "Acciones",
      field: "actions",
      minWidth: 150,
      cellRenderer: (params: any) => (
        <Group spacing={4} position="center">
          <ActionIcon
            color="gray"
            onClick={() => navigate(`/productos/${params.data.Id_producto}`)}
            title="Ver detalles"
          >
            <IconEye size={16} />
          </ActionIcon>
          <ActionIcon
            color="blue"
            onClick={() => navigate(`/productos/${params.data.Id_producto}/editar`)}
            title="Editar"
          >
            <IconEdit size={16} />
          </ActionIcon>
          <ActionIcon
            color="red"
            onClick={() => handleDeleteProducto(params.data)}
            title="Eliminar"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ),
    },
  ]

  // Manejar eliminación de producto
  const handleDeleteProducto = async (producto: any) => {
    Swal.fire({
      title: `¿Eliminar ${producto.Descripcion}?`,
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await eliminarProducto(producto.Id_producto)
          await obtieneProductos()
          Swal.fire("Eliminado!", "El producto ha sido eliminado.", "success")
        } catch (error) {
          Swal.fire("Error", "No se pudo eliminar el producto", "error")
        }
      }
    })
  }

  // Configuración inicial de la tabla
  const onGridReady = (params: any) => {
    setGridApi(params.api)
    setGridColumnApi(params.columnApi)
    params.api.sizeColumnsToFit()
  }

  // Generar y descargar plantilla Excel programáticamente
  const generateAndDownloadTemplate = () => {
    // Datos de ejemplo para la plantilla
    const templateData = [
      {
        Codigo: "PROD001",
        Descripcion: "Producto de ejemplo 1",
        Categoria: "Electrónicos",
        Medida: "Pieza",
        PrecioCompra: 100.0,
        PrecioVenta: 150.0,
        Stock: 10,
      },
      {
        Codigo: "PROD002",
        Descripcion: "Producto de ejemplo 2",
        Categoria: "Oficina",
        Medida: "Paquete",
        PrecioCompra: 50.0,
        PrecioVenta: 75.0,
        Stock: 5,
      },
    ]

    // Crear libro de trabajo
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(templateData)

    // Añadir hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, "Productos")

    // Generar archivo y descargar
    XLSX.writeFile(workbook, "plantilla-productos.xlsx", {
      compression: true,
    })
  }

  // Manejar importación de productos
  const handleImportProducts = async () => {
    // Crear input file dinámicamente
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".xlsx, .xls, .csv"

    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        setImporting(true)
        const result = await Swal.fire({
          title: "¿Importar productos?",
          text: "Esta acción agregará los productos del archivo a tu inventario",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Sí, importar",
          cancelButtonText: "Cancelar",
        })

        if (result.isConfirmed) {
          await importarProductos(file)
          await obtieneProductos()
          Swal.fire("Éxito", "Productos importados correctamente", "success")
        }
      } catch (error: any) {
        Swal.fire("Error", error.message || "Error al importar productos", "error")
      } finally {
        setImporting(false)
      }
    }

    input.click()
  }

  return (
    <Paper shadow="xs" p="md" radius="md" w="100%" h="100%" sx={{ backgroundColor: "white" }} pos="relative">
      <LoadingOverlay visible={loading || importing} overlayBlur={2} />
      
      {location.pathname === "/productos" ? (
        <>
          <Flex justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
            <Group spacing="xs">
              <IconPackage size={24} color="#228be6" />
              <Title order={2} sx={{ fontSize: "calc(1.2rem + 0.5vw)" }}>
                Gestión de Productos
              </Title>
              <Badge color="blue" size="lg" variant="light">
                {filteredData.length} registros
              </Badge>
              <Badge color="orange" size="lg" variant="outline">
                Stock mínimo: {stockMinimo}
              </Badge>
            </Group>
            <Group>
              <TextInput
                placeholder="Buscar producto..."
                icon={<IconSearch size={16} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.currentTarget.value)}
                sx={{ minWidth: "200px" }}
                radius="md"
              />
              
              <Menu shadow="md" width={200} position="bottom-end">
                <Menu.Target>
                  <Button variant="filled" color="blue" leftIcon={<IconPlus size={16} />} radius="md">
                    Nuevo
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item 
                    icon={<IconPlus size={14} />} 
                    onClick={() => navigate("agregar")}
                  >
                    Producto Individual
                  </Menu.Item>
                  <Menu.Item 
                    icon={<IconUpload size={14} />} 
                    onClick={handleImportProducts}
                  >
                    Importar Masivo
                  </Menu.Item>
                  <Menu.Item 
                    icon={<IconFileDownload size={14} />} 
                    onClick={generateAndDownloadTemplate}
                  >
                    Descargar Plantilla
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Flex>

          <Group grow mb="md">
            <Paper p="md" radius="md" withBorder>
              <Group position="apart">
                <div>
                  <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                    Total Productos
                  </Text>
                  <Text weight={700} size="xl">
                    {productos.length}
                  </Text>
                </div>
                <IconPackage size={32} color="#228be6" />
              </Group>
            </Paper>
            <Paper p="md" radius="md" withBorder>
              <Group position="apart">
                <div>
                  <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                    Bajo Stock (≤{stockMinimo})
                  </Text>
                  <Text weight={700} size="xl" color="red">
                    {productos.filter((p) => Number(p?.Stock || 0) <= stockMinimo).length}
                  </Text>
                </div>
                <IconAlertTriangle size={32} color="#fa5252" />
              </Group>
            </Paper>
          </Group>

          <Box sx={{ height: "calc(100% - 160px)" }}>
            <DataTable
              rowData={filteredData}
              columnDefs={columnDefs}
              onGridReady={onGridReady}
              rowsPerPage={10}
              pagination={true}
            />
          </Box>
        </>
      ) : (
        <Outlet />
      )}
    </Paper>
  )
}
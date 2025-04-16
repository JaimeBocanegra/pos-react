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
  Modal,
  Checkbox,
  Stack,
  Alert,
  ScrollArea,
  Tabs,
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
  IconRefresh,
  IconArrowsJoin2,
  IconX,
  IconInfoCircle,
  IconCheck,
  IconBarcode,
} from "@tabler/icons-react"
import DataTable from "../../components/DataTable"
import { useEffect, useState, useMemo } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import Swal from "sweetalert2"
import { obtenerProductos, eliminarProducto, importarProductos } from "../services/ProductoService"
import { ConfiguracionService } from "../services/ConfiguracionService"
import * as XLSX from "xlsx"
import { supabase } from "../../supabase/client"
import { BarcodeGenerator } from "../../components/BarcodeGenerator"

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

interface ImportResult {
  inserted: number
  updated: number
  stockAdded: number
  skipped: number
  errors: string[]
  total: number
}

interface DuplicateProduct {
  Codigo: string
  Descripcion: string
  Stock: number
  existingStock: number
  PrecioCompra: number
  existingPrecioCompra: number
  PrecioVenta: number
  existingPrecioVenta: number
}

export function Productos() {
  const [gridApi, setGridApi] = useState<any | null>(null)
  const [gridColumnApi, setGridColumnApi] = useState<any | null>(null)
  const [productos, setProductos] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [stockMinimo, setStockMinimo] = useState(5)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [duplicatesList, setDuplicatesList] = useState<DuplicateProduct[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [activeTab, setActiveTab] = useState<string | null>("productos")
  const navigate = useNavigate()
  const location = useLocation()

  const [importOptions, setImportOptions] = useState({
    updateExisting: false,
    sumStock: true,
    skipDuplicates: false,
  })

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

    if (!searchTerm) return productos

    const searchLower = searchTerm.toLowerCase()

    return productos.filter((producto) => {
      // Buscar en campos de texto
      if (
        producto?.Codigo?.toString().toLowerCase().includes(searchLower) ||
        producto?.Descripcion?.toLowerCase().includes(searchLower) ||
        producto?.Categoria?.toLowerCase().includes(searchLower) ||
        producto?.Medida?.toLowerCase().includes(searchLower)
      ) {
        return true
      }

      // Buscar en campos numéricos (precios y stock)
      const precioCompra = producto?.PrecioCompra?.toString() || ""
      const precioVenta = producto?.PrecioVenta?.toString() || ""
      const stock = producto?.Stock?.toString() || ""

      if (precioCompra.includes(searchTerm) || precioVenta.includes(searchTerm) || stock.includes(searchTerm)) {
        return true
      }

      // Buscar por rangos de precio (formato: >100, <50, etc.)
      if (searchTerm.startsWith(">") || searchTerm.startsWith("<")) {
        const operator = searchTerm.charAt(0)
        const value = Number.parseFloat(searchTerm.substring(1))

        if (!isNaN(value)) {
          const precioCompraNum = Number.parseFloat(producto?.PrecioCompra) || 0
          const precioVentaNum = Number.parseFloat(producto?.PrecioVenta) || 0
          const stockNum = Number.parseFloat(producto?.Stock) || 0

          if (operator === ">") {
            return precioCompraNum > value || precioVentaNum > value || stockNum > value
          } else if (operator === "<") {
            return precioCompraNum < value || precioVentaNum < value || stockNum < value
          }
        }
      }

      // Buscar por términos específicos
      if (searchLower === "bajo stock" || searchLower === "stock bajo") {
        return (Number(producto?.Stock) || 0) <= stockMinimo
      }

      return false
    })
  }, [productos, searchTerm, stockMinimo])

  // Configuración de columnas para la tabla
  const columnDefs = [
    { headerName: "ID", field: "Id_producto", hide: true },
    {
      headerName: "Código",
      field: "Codigo",
      flex: 1,
      minWidth: 100,
      cellStyle: { display: "flex", alignItems: "center" },
    },
    {
      headerName: "Descripción",
      field: "Descripcion",
      flex: 2,
      minWidth: 180,
      cellStyle: { display: "flex", alignItems: "center" },
    },
    {
      headerName: "Categoría",
      field: "Categoria",
      flex: 1.5,
      minWidth: 150,
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
      cellRenderer: (params: any) => <StockRenderer value={params.value} stockMinimo={stockMinimo} />,
      cellStyle: { display: "flex", alignItems: "center" },
    },
    {
      headerName: "Acciones",
      field: "actions",
      minWidth: 180,
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
          <ActionIcon color="red" onClick={() => handleDeleteProducto(params.data)} title="Eliminar">
            <IconTrash size={16} />
          </ActionIcon>
          <ActionIcon
            color="indigo"
            onClick={() => {
              setActiveTab("codigos")
              // Pre-seleccionar este producto en el generador de códigos
              // Esta funcionalidad requeriría implementar un estado compartido o un contexto
            }}
            title="Generar código de barras"
          >
            <IconBarcode size={16} />
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

  // Manejar selección de archivo
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file)
    setImporting(true)
    setImportResult(null)

    try {
      // Leer archivo para validar estructura y detectar duplicados
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      // Validar que el archivo tenga datos
      if (!jsonData || jsonData.length === 0) {
        throw new Error("El archivo está vacío o no contiene datos válidos")
      }

      // Definir las columnas esperadas según la plantilla
      const expectedColumns = ["Codigo", "Descripcion", "Categoria", "Medida", "PrecioCompra", "PrecioVenta", "Stock"]

      // Verificar que el archivo tenga las columnas esperadas
      const firstRow = jsonData[0] as any
      const missingColumns = expectedColumns.filter((col) => !(col in firstRow))

      if (missingColumns.length > 0) {
        throw new Error(
          `El archivo no contiene todas las columnas esperadas según la plantilla. ` +
            `Columnas faltantes: ${missingColumns.join(", ")}. ` +
            `Por favor, utilice la plantilla de descarga proporcionada por el sistema.`,
        )
      }

      // Obtener productos existentes para comparar
      const { data: existingProducts, error } = await supabase
        .from("Productos")
        .select("Codigo, Descripcion, Stock, PrecioCompra, PrecioVenta")

      if (error) throw error

      const existingCodes = new Set(existingProducts?.map((p) => p.Codigo) || [])
      const duplicates = jsonData
        .filter((item: any) => existingCodes.has(item.Codigo?.toString()))
        .map((item: any) => {
          const existing = existingProducts?.find((p) => p.Codigo === item.Codigo)
          return {
            Codigo: item.Codigo,
            Descripcion: item.Descripcion,
            Stock: Number(item.Stock) || 0,
            existingStock: existing?.Stock || 0,
            PrecioCompra: Number(item.PrecioCompra) || 0,
            existingPrecioCompra: existing?.PrecioCompra || 0,
            PrecioVenta: Number(item.PrecioVenta) || 0,
            existingPrecioVenta: existing?.PrecioVenta || 0,
          }
        })

      if (duplicates.length > 0) {
        setDuplicatesList(duplicates)
        setImportModalOpen(true)
      } else {
        // Si no hay duplicados, proceder con importación directa
        const result = await importarProductos(file, {
          updateExisting: false,
          sumStock: false,
          skipDuplicates: false,
        })

        if (result.errors && result.errors.length > 0) {
          throw new Error(result.errors[0])
        }

        setImportResult(result)
        await obtieneProductos()
        showImportResult(result)
      }
    } catch (error: any) {
      Swal.fire({
        title: "Error en la importación",
        text: error.message || "Error al procesar el archivo",
        icon: "error",
        confirmButtonText: "Entendido",
      })
    } finally {
      setImporting(false)
    }
  }

  // Manejar importación de productos
  const handleImportProducts = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".xlsx, .xls, .csv"
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) handleFileSelect(file)
    }
    input.click()
  }

  // Confirmar importación con opciones seleccionadas
  const handleConfirmImport = async () => {
    if (!selectedFile) return

    try {
      setImportModalOpen(false)
      setImporting(true)

      const result = await importarProductos(selectedFile, importOptions)

      if (result.errors && result.errors.length > 0) {
        throw new Error(result.errors[0])
      }

      setImportResult(result)
      await obtieneProductos()
      showImportResult(result)
    } catch (error: any) {
      Swal.fire({
        title: "Error en la importación",
        text: error.message || "Error al importar productos",
        icon: "error",
        confirmButtonText: "Entendido",
      })
    } finally {
      setImporting(false)
    }
  }

  // Mostrar resultados de la importación
  const showImportResult = (result: ImportResult) => {
    Swal.fire({
      title: "Importación completada",
      html: `
        <div style="text-align: left;">
          <p><strong>Resumen de la operación:</strong></p>
          <ul>
            <li>✅ <strong>Nuevos productos:</strong> ${result.inserted}</li>
            ${result.updated > 0 ? `<li>🔄 <strong>Actualizados:</strong> ${result.updated}</li>` : ""}
            ${result.stockAdded > 0 ? `<li>🔼 <strong>Stocks incrementados:</strong> ${result.stockAdded}</li>` : ""}
            ${result.skipped > 0 ? `<li>⏭️ <strong>Omitidos:</strong> ${result.skipped}</li>` : ""}
          </ul>
          <p>Total procesados: ${result.total}</p>
        </div>
      `,
      icon: "success",
      confirmButtonText: "Aceptar",
    })
  }

  return (
    <Paper shadow="xs" p="md" radius="md" w="100%" h="100%" sx={{ backgroundColor: "white" }} pos="relative">
      <LoadingOverlay visible={loading || importing} overlayBlur={2} />

      {location.pathname === "/productos" ? (
        <>
          <Tabs value={activeTab} onTabChange={setActiveTab} mb="md">
            <Tabs.List>
              <Tabs.Tab value="productos" icon={<IconPackage size={16} />}>
                Productos
              </Tabs.Tab>
              <Tabs.Tab value="codigos" icon={<IconBarcode size={16} />}>
                Códigos de Barras
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          {activeTab === "productos" ? (
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
                      <Menu.Item icon={<IconPlus size={14} />} onClick={() => navigate("agregar")}>
                        Producto Individual
                      </Menu.Item>
                      <Menu.Item icon={<IconUpload size={14} />} onClick={handleImportProducts}>
                        Importar Masivo
                      </Menu.Item>
                      <Menu.Item icon={<IconFileDownload size={14} />} onClick={generateAndDownloadTemplate}>
                        Descargar Plantilla
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Group>
              </Flex>

              {importResult && (
                <Alert
                  icon={<IconInfoCircle size={18} />}
                  title="Resultado de importación"
                  color="blue"
                  mb="md"
                  onClose={() => setImportResult(null)}
                  withCloseButton
                >
                  <Text size="sm">
                    <strong>Nuevos:</strong> {importResult.inserted} |<strong> Actualizados:</strong>{" "}
                    {importResult.updated} |<strong> Stock +:</strong> {importResult.stockAdded} |
                    <strong> Omitidos:</strong> {importResult.skipped}
                  </Text>
                </Alert>
              )}

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

              {/* Modal para manejar duplicados */}
              <Modal
                opened={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                title={
                  <Text size="xl" fw={600}>
                    Manejar productos duplicados
                  </Text>
                }
                size="xl"
                centered
              >
                <Stack spacing="lg">
                  <Text>
                    Se encontraron <strong>{duplicatesList.length} productos</strong> que ya existen en el sistema.
                    Seleccione cómo desea manejar estos duplicados:
                  </Text>

                  <Box>
                    <Checkbox
                      label={
                        <Text fw={500}>
                          <IconRefresh size={16} style={{ marginRight: 8 }} />
                          Actualizar toda la información del producto
                        </Text>
                      }
                      checked={importOptions.updateExisting}
                      onChange={(e) =>
                        setImportOptions({
                          ...importOptions,
                          updateExisting: e.currentTarget.checked,
                          sumStock: e.currentTarget.checked ? false : importOptions.sumStock,
                          skipDuplicates: false,
                        })
                      }
                      mb="sm"
                      size="md"
                    />
                    <Text color="dimmed" size="sm" ml={28} mb="md">
                      Reemplazará todos los campos (descripción, precios, stock) con los valores del archivo
                    </Text>

                    <Checkbox
                      label={
                        <Text fw={500}>
                          <IconArrowsJoin2 size={16} style={{ marginRight: 8 }} />
                          Sumar solo al stock existente
                        </Text>
                      }
                      checked={importOptions.sumStock}
                      onChange={(e) =>
                        setImportOptions({
                          ...importOptions,
                          sumStock: e.currentTarget.checked,
                          updateExisting: e.currentTarget.checked ? false : importOptions.updateExisting,
                          skipDuplicates: false,
                        })
                      }
                      mb="sm"
                      size="md"
                    />
                    <Text color="dimmed" size="sm" ml={28} mb="md">
                      Mantendrá la información actual y solo sumará las cantidades de stock
                    </Text>

                    <Checkbox
                      label={
                        <Text fw={500}>
                          <IconX size={16} style={{ marginRight: 8 }} />
                          Omitir productos duplicados
                        </Text>
                      }
                      checked={importOptions.skipDuplicates}
                      onChange={(e) =>
                        setImportOptions({
                          ...importOptions,
                          skipDuplicates: e.currentTarget.checked,
                          updateExisting: false,
                          sumStock: false,
                        })
                      }
                      size="md"
                    />
                    <Text color="dimmed" size="sm" ml={28}>
                      No realizará cambios en los productos existentes
                    </Text>
                  </Box>

                  <Box>
                    <Text fw={500} mb="sm">
                      Productos duplicados encontrados:
                    </Text>
                    <ScrollArea style={{ maxHeight: 300 }}>
                      {duplicatesList.map((item, index) => (
                        <Alert key={index} mb="xs" color="yellow" variant="outline" icon={<IconInfoCircle size={18} />}>
                          <Text size="sm" fw={600}>
                            {item.Codigo} - {item.Descripcion}
                          </Text>
                          <Group spacing="xl" mt="xs">
                            <Box>
                              <Text size="xs">
                                <strong>Stock:</strong> {item.existingStock} → {item.Stock} (
                                {item.existingStock + item.Stock})
                              </Text>
                              <Text size="xs">
                                <strong>P. Compra:</strong> ${item.existingPrecioCompra} → ${item.PrecioCompra}
                              </Text>
                              <Text size="xs">
                                <strong>P. Venta:</strong> ${item.existingPrecioVenta} → ${item.PrecioVenta}
                              </Text>
                            </Box>
                          </Group>
                        </Alert>
                      ))}
                    </ScrollArea>
                  </Box>

                  <Group position="right" mt="xl">
                    <Button variant="default" onClick={() => setImportModalOpen(false)} leftIcon={<IconX size={18} />}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleConfirmImport}
                      loading={importing}
                      leftIcon={<IconCheck size={18} />}
                      color="green"
                    >
                      Confirmar Importación
                    </Button>
                  </Group>
                </Stack>
              </Modal>
            </>
          ) : (
            <BarcodeGenerator />
          )}
        </>
      ) : (
        <Outlet />
      )}
    </Paper>
  )
}

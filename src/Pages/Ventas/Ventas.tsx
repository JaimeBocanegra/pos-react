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
  Tooltip,
  Grid,
} from "@mantine/core"
import {
  IconPlus,
  IconTrash,
  IconEye,
  IconSearch,
  IconShoppingBag,
  IconCalendar,
  IconReceipt,
  IconUser,
  IconBan,
  IconCheck,
  IconFilter,
  IconCreditCard,
  IconCash,
  IconClock,
  IconEdit,
} from "@tabler/icons-react"
import DataTable from "../../components/DataTable"
import { useEffect, useState, useMemo } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import Swal from "sweetalert2"
import { CustomFilter } from "../../components/CustomFilter"
import { obtenerVentas, cancelarVenta } from "../services/VentaService"
import { DatePicker, type DatePickerValue } from "@mantine/dates"

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
      {metodo === "TARJETA" ? <IconCreditCard size={16} color="#228be6" /> : <IconCash size={16} color="#228be6" />}
      <Text>{metodo === "TARJETA" ? "Tarjeta" : "Efectivo"}</Text>
    </Group>
  )
}

export function Ventas() {
  const [gridApi, setGridApi] = useState<any | null>(null)
  const [gridColumnApi, setGridColumnApi] = useState<any | null>(null)
  const [ventas, setVentas] = useState([] as any[])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<[DatePickerValue, DatePickerValue]>([null, null])
  const [showDateFilter, setShowDateFilter] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const cargarVentas = async () => {
    setLoading(true)
    try {
      const data = await obtenerVentas()
      setVentas(data)
    } catch (error) {
      console.error("Error al obtener ventas:", error)
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar las ventas",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarVentas()
  }, [location])

  // Filtrar por fecha y término de búsqueda
  const filteredData = useMemo(() => {
    let filtered = ventas

    // Filtrar por rango de fechas si ambas fechas están seleccionadas
    if (dateRange[0] && dateRange[1]) {
      const startDate = new Date(dateRange[0])
      startDate.setHours(0, 0, 0, 0)

      const endDate = new Date(dateRange[1])
      endDate.setHours(23, 59, 59, 999)

      filtered = filtered.filter((venta) => {
        if (!venta.FechaRegistro) return false
        const ventaDate = new Date(venta.FechaRegistro)
        return ventaDate >= startDate && ventaDate <= endDate
      })
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (venta) =>
          venta.NumeroDocumento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          false ||
          venta.NombreCliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          false,
      )
    }

    return filtered
  }, [ventas, searchTerm, dateRange])

  // Calculamos los montos separados por estado basados en los datos filtrados
  const { montoCompletadas, montoCanceladas, totalVentas, ventasCompletadas, ventasCanceladas } = useMemo(() => {
    return filteredData.reduce(
      (acc, venta) => {
        const monto = Number.parseFloat(venta.MontoTotal || 0)
        if (venta.Estatus !== "CANCELADO") {
          acc.montoCompletadas += monto
          acc.ventasCompletadas++
        } else {
          acc.montoCanceladas += monto
          acc.ventasCanceladas++
        }
        acc.totalVentas++
        return acc
      },
      { montoCompletadas: 0, montoCanceladas: 0, totalVentas: 0, ventasCompletadas: 0, ventasCanceladas: 0 },
    )
  }, [filteredData])

  const onGridReady = (params: any) => {
    setGridApi(params.api)
    setGridColumnApi(params.columnApi)
    params.api.sizeColumnsToFit()
  }

  const handleCancelarVenta = async (venta: any) => {
    if (venta.Estatus === "CANCELADO") return // No hacer nada si ya está cancelada

    Swal.fire({
      title: `¿Estás seguro de cancelar la venta ${venta.NumeroDocumento}?`,
      text: "Esta acción restaurará el stock de los productos y no se puede revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "No cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await cancelarVenta(venta.IdVenta, true)
          Swal.fire("Cancelada", "La venta ha sido cancelada correctamente", "success")
          cargarVentas()
        } catch (error) {
          console.error("Error al cancelar venta:", error)
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo cancelar la venta",
          })
        }
      }
    })
  }

  const resetFilters = () => {
    setDateRange([null, null])
    setSearchTerm("")
  }

  // Función de filtro personalizada para manejar valores undefined o null
  const safeFilter = (value: any, filterText: string) => {
    if (value === undefined || value === null) return false
    return String(value).toLowerCase().includes(filterText.toLowerCase())
  }

  const columnDefs = [
    {
      headerName: "Folio",
      field: "IdVenta",
      flex: 0.7,
      minWidth: 90,
      filter: CustomFilter,
      filterParams: {
        filterFunction: safeFilter,
      },
      cellStyle: {
        fontWeight: 500,
      },
    },
    {
      headerName: "Estado",
      field: "Estatus",
      flex: 0.8,
      minWidth: 120,
      filter: CustomFilter,
      filterParams: {
        filterFunction: safeFilter,
      },
      cellRenderer: EstadoRenderer,
    },
    {
      headerName: "N° Documento",
      field: "NumeroDocumento",
      flex: 1,
      minWidth: 150,
      filter: CustomFilter,
      filterParams: {
        filterFunction: safeFilter,
      },
      cellStyle: {
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
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
      filter: CustomFilter,
      filterParams: {
        filterFunction: safeFilter,
      },
      cellRenderer: FechaRenderer,
    },
    {
      headerName: "Cliente",
      field: "NombreCliente",
      flex: 2,
      minWidth: 180,
      filter: CustomFilter,
      filterParams: {
        filterFunction: safeFilter,
      },
      cellStyle: {
        lineHeight: "1.2",
        display: "flex",
        alignItems: "center",
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
      headerName: "Método Pago",
      field: "TPago",
      flex: 1,
      minWidth: 130,
      filter: CustomFilter,
      filterParams: {
        filterFunction: safeFilter,
      },
      cellRenderer: MetodoPagoRenderer,
    },
    {
      headerName: "Total",
      field: "MontoTotal",
      flex: 1,
      minWidth: 130,
      filter: CustomFilter,
      filterParams: {
        filterFunction: safeFilter,
      },
      cellStyle: {
        fontWeight: 600,
        color: "#228be6",
      },
      cellRenderer: MontoRenderer,
    },
    {
      headerName: "Acciones",
      field: "actions",
      minWidth: 180,
      cellRenderer: (params: any) => (
        <Flex
          justify="center"
          align="center"
          gap="md"
          sx={{
            height: "100%",
            padding: "8px 0",
          }}
        >
          <Tooltip label="Ver detalles">
            <ActionIcon
              variant="light"
              color="gray"
              onClick={() => navigate(`/ventas/${params.data.IdVenta}`)}
              radius="md"
              size="lg"
            >
              <IconEye size="1rem" />
            </ActionIcon>
          </Tooltip>
    
          {params.data.Estatus === "PENDIENTE" && (
            <Tooltip label="Continuar venta">
              <ActionIcon
                variant="light"
                color="blue"
                onClick={() => navigate(`/ventas/continuar/${params.data.IdVenta}`)}
                radius="md"
                size="lg"
              >
                <IconEdit size="1rem" />
              </ActionIcon>
            </Tooltip>
          )}
    
          <Tooltip label={params.data.Estatus !== "CANCELADO" ? "Cancelar venta" : "Venta ya cancelada"}>
            <div>
              <ActionIcon
                variant="light"
                color="red"
                onClick={() => handleCancelarVenta(params.data)}
                radius="md"
                size="lg"
                disabled={params.data.Estatus === "CANCELADO"}
                sx={{ opacity: params.data.Estatus !== "CANCELADO" ? 1 : 0.5 }}
              >
                <IconTrash size="1rem" />
              </ActionIcon>
            </div>
          </Tooltip>
        </Flex>
      ),
      cellStyle: {
        textAlign: "center",
        padding: "8px 0",
        height: "100%",
      },
      headerClass: "centered-header",
    },
  ]

  return (
    <Paper shadow="xs" p="md" radius="md" w="100%" h="100%" sx={{ backgroundColor: "white" }}>
      {location.pathname === "/ventas" ? (
        <>
          <Flex w="100%" justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
            <Group spacing="xs">
              <IconShoppingBag size={24} color="#228be6" />
              <Title order={2} sx={{ fontSize: "calc(1.2rem + 0.5vw)" }}>
                Gestión de Ventas
              </Title>
              <Badge color="blue" size="lg" variant="light">
                {filteredData.length} registros
              </Badge>
            </Group>
            <Group>
              <TextInput
                placeholder="Buscar venta..."
                icon={<IconSearch size={16} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.currentTarget.value)}
                sx={{ minWidth: "200px" }}
                radius="md"
              />
              <Button
                variant={showDateFilter ? "filled" : "light"}
                color="blue"
                leftIcon={<IconFilter size={16} />}
                onClick={() => setShowDateFilter(!showDateFilter)}
                radius="md"
              >
                Filtrar por Fecha
              </Button>
              <Button
                variant="filled"
                color="blue"
                leftIcon={<IconPlus size={16} />}
                onClick={() => navigate("nueva")}
                radius="md"
              >
                Nueva Venta
              </Button>
            </Group>
          </Flex>

          {/* Filtro de fechas */}
          {showDateFilter && (
            <Paper p="md" radius="md" withBorder mb="md">
              <Group position="apart" mb="xs">
                <Text weight={600}>Filtrar por rango de fechas</Text>
                <Button variant="subtle" color="gray" compact onClick={resetFilters}>
                  Limpiar filtros
                </Button>
              </Group>
              <Group mb="md" grow>
                <DatePicker
                  value={dateRange[0]}
                  onChange={(date) => setDateRange([date, dateRange[1]])}
                  w="100%"
                />
                <DatePicker
                  value={dateRange[1]}
                  onChange={(date) => setDateRange([dateRange[0], date])}
                  w="100%"
                />
              </Group>
              <Text size="xs" color="dimmed">
                {dateRange[0] && dateRange[1]
                  ? `Mostrando ventas del ${dateRange[0].toLocaleDateString()} al ${dateRange[1].toLocaleDateString()}`
                  : "Mostrando todas las ventas"}
              </Text>
            </Paper>
          )}

          {/* Stats Cards */}
          <Grid mb="md" gutter="md">
            <Grid.Col span={4}>
              <Paper p="md" radius="md" withBorder h="100%">
                <Group position="apart">
                  <div>
                    <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                      Total Ventas
                    </Text>
                    <Text weight={700} size="xl">
                      {totalVentas}
                    </Text>
                    <Text size="sm" color="dimmed">
                      {ventasCompletadas} completadas
                    </Text>
                    <Text size="sm" color="dimmed">
                      {ventasCanceladas} canceladas
                    </Text>
                  </div>
                  <IconShoppingBag size={32} color="#228be6" />
                </Group>
              </Paper>
            </Grid.Col>

            <Grid.Col span={4}>
              <Paper p="md" radius="md" withBorder h="100%">
                <Group position="apart">
                  <div>
                    <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                      Monto Total Completadas
                    </Text>
                    <Text weight={700} size="xl" color="green">
                      $ {montoCompletadas.toFixed(2)} MXN
                    </Text>
                    <Text size="sm" color="dimmed">
                      {ventasCompletadas} ventas
                    </Text>
                  </div>
                  <IconCheck size={32} color="green" />
                </Group>
              </Paper>
            </Grid.Col>

            <Grid.Col span={4}>
              <Paper p="md" radius="md" withBorder h="100%">
                <Group position="apart">
                  <div>
                    <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                      Monto Total Canceladas
                    </Text>
                    <Text weight={700} size="xl" color="red">
                      $ {montoCanceladas.toFixed(2)} MXN
                    </Text>
                    <Text size="sm" color="dimmed">
                      {ventasCanceladas} ventas
                    </Text>
                  </div>
                  <IconBan size={32} color="red" />
                </Group>
              </Paper>
            </Grid.Col>
          </Grid>

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

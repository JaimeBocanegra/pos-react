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
  Select,
} from "@mantine/core"
import {
  IconPlus,
  IconEye,
  IconSearch,
  IconShoppingBag,
  IconReceipt,
  IconUser,
  IconBan,
  IconCheck,
  IconFilter,
  IconCreditCard,
  IconCash,
  IconClock,
  IconEdit,
  IconChevronDown,
  IconChevronUp,
  IconFilterOff,
} from "@tabler/icons-react"
import DataTable from "../../components/DataTable"
import { useEffect, useState, useMemo } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import Swal from "sweetalert2"
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
  const [showDetailCards, setShowDetailCards] = useState(false)
  const [estadoFilter, setEstadoFilter] = useState<string | null>("todas")
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

  // Filtrar por fecha, estado y término de búsqueda
  const filteredData = useMemo(() => {
    let filtered = ventas

    // Filtrar por estado si se ha seleccionado un estado específico
    if (estadoFilter && estadoFilter !== "todas") {
      filtered = filtered.filter((venta) => {
        if (estadoFilter === "completadas") return venta.Estatus !== "CANCELADO" && venta.Estatus !== "PENDIENTE"
        if (estadoFilter === "pendientes") return venta.Estatus === "PENDIENTE"
        if (estadoFilter === "canceladas") return venta.Estatus === "CANCELADO"
        return true
      })
    }

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
      const searchLower = searchTerm.toLowerCase().trim()

      filtered = filtered.filter((venta) => {
        // Buscar en campos de texto
        if (
          venta.NumeroDocumento?.toString().toLowerCase().includes(searchLower) ||
          venta.NombreCliente?.toString().toLowerCase().includes(searchLower) ||
          venta.IdVenta?.toString().toLowerCase().includes(searchLower)
        ) {
          return true
        }

        // Buscar por estado
        if (
          (searchLower === "completada" || searchLower === "completado") &&
          venta.Estatus !== "CANCELADO" &&
          venta.Estatus !== "PENDIENTE"
        ) {
          return true
        }
        if (searchLower === "pendiente" && venta.Estatus === "PENDIENTE") {
          return true
        }
        if ((searchLower === "cancelada" || searchLower === "cancelado") && venta.Estatus === "CANCELADO") {
          return true
        }

        // Buscar por método de pago
        if (
          (searchLower === "efectivo" && venta.TPago === "EFECTIVO") ||
          (searchLower === "tarjeta" && venta.TPago === "TARJETA")
        ) {
          return true
        }

        // Buscar por monto
        const montoStr = venta.MontoTotal?.toString() || ""
        if (montoStr.includes(searchTerm)) {
          return true
        }

        // Buscar por rangos de monto (formato: >100, <50, etc.)
        if (searchTerm.startsWith(">") || searchTerm.startsWith("<")) {
          const operator = searchTerm.charAt(0)
          const value = Number.parseFloat(searchTerm.substring(1))

          if (!isNaN(value)) {
            const montoTotal = Number.parseFloat(venta.MontoTotal) || 0

            if (operator === ">") {
              return montoTotal > value
            } else if (operator === "<") {
              return montoTotal < value
            }
          }
        }

        // Buscar por fecha
        if (!venta.FechaRegistro) return false

        const fechaVenta = new Date(venta.FechaRegistro)
        const dia = fechaVenta.getDate().toString().padStart(2, "0")
        const mes = (fechaVenta.getMonth() + 1).toString().padStart(2, "0")
        const año = fechaVenta.getFullYear()
        const fechaFormateada = `${dia}/${mes}/${año}`

        if (fechaFormateada.includes(searchTerm)) {
          return true
        }

        // Buscar por año o mes específico
        if (año.toString() === searchTerm || mes === searchTerm || dia === searchTerm) {
          return true
        }

        return false
      })
    }

    return filtered
  }, [ventas, searchTerm, dateRange, estadoFilter])

  // Calculamos los montos y cantidades separados por estado
  const {
    montoCompletadas,
    montoCanceladas,
    montoPendientes,
    totalVentas,
    ventasCompletadas,
    ventasCanceladas,
    ventasPendientes,
  } = useMemo(() => {
    return filteredData.reduce(
      (acc, venta) => {
        const monto = Number.parseFloat(venta.MontoTotal || 0)

        if (venta.Estatus === "CANCELADO") {
          acc.montoCanceladas += monto
          acc.ventasCanceladas++
        } else if (venta.Estatus === "PENDIENTE") {
          acc.montoPendientes += monto
          acc.ventasPendientes++
        } else {
          // Completadas (cualquier otro estado)
          acc.montoCompletadas += monto
          acc.ventasCompletadas++
        }

        acc.totalVentas++
        return acc
      },
      {
        montoCompletadas: 0,
        montoCanceladas: 0,
        montoPendientes: 0,
        totalVentas: 0,
        ventasCompletadas: 0,
        ventasCanceladas: 0,
        ventasPendientes: 0,
      },
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
    setEstadoFilter("todas")
  }

  // Función de filtro personalizada para manejar valores undefined o null
  const safeFilter = (value: any, filterText: string) => {
    if (value === undefined || value === null) return false
    return String(value).toLowerCase().includes(filterText.toLowerCase())
  }
  const uniqueNames = useMemo(() => Array.from(new Set(filteredData.map((row) => row.Estatus))), [filteredData])

  const columnDefs = [
    {
      headerName: "Folio",
      field: "IdVenta",
      flex: 0.7,
      minWidth: 90,
      cellStyle: {
        fontWeight: 500,
      },
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
      cellRenderer: FechaRenderer,
    },
    {
      headerName: "Cliente",
      field: "NombreCliente",
      flex: 2,
      minWidth: 180,
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
      cellRenderer: MetodoPagoRenderer,
    },
    {
      headerName: "Total",
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
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
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
                <Select
                  placeholder="Estado"
                  value={estadoFilter}
                  onChange={setEstadoFilter}
                  data={[
                    { value: "todas", label: "Todas" },
                    { value: "completadas", label: "Completadas" },
                    { value: "pendientes", label: "Pendientes" },
                    { value: "canceladas", label: "Canceladas" },
                  ]}
                  icon={
                    estadoFilter === "completadas" ? (
                      <IconCheck size={16} color="green" />
                    ) : estadoFilter === "pendientes" ? (
                      <IconClock size={16} color="#FFB800" />
                    ) : estadoFilter === "canceladas" ? (
                      <IconBan size={16} color="red" />
                    ) : null
                  }
                  sx={{ minWidth: "150px" }}
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
                  <Button
                    variant="subtle"
                    color="gray"
                    compact
                    onClick={resetFilters}
                    leftIcon={<IconFilterOff size={16} />}
                  >
                    Limpiar filtros
                  </Button>
                </Group>
                <Group mb="md" grow>
                  <DatePicker value={dateRange[0]} onChange={(date) => setDateRange([date, dateRange[1]])} w="100%" />
                  <DatePicker value={dateRange[1]} onChange={(date) => setDateRange([dateRange[0], date])} w="100%" />
                </Group>
                <Text size="xs" color="dimmed">
                  {dateRange[0] && dateRange[1]
                    ? `Mostrando ventas del ${dateRange[0].toLocaleDateString()} al ${dateRange[1].toLocaleDateString()}`
                    : "Mostrando todas las ventas"}
                </Text>
              </Paper>
            )}

            {/* Stats Cards - Primera fila: Resumen general */}
            <Text weight={600} mb="xs">
              Resumen General
            </Text>
            <Grid mb="md" gutter="md">
              <Grid.Col span={3}>
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
                        {ventasPendientes} pendientes
                      </Text>
                      <Text size="sm" color="dimmed">
                        {ventasCanceladas} canceladas
                      </Text>
                    </div>
                    <IconShoppingBag size={32} color="#228be6" />
                  </Group>
                </Paper>
              </Grid.Col>

              <Grid.Col span={3}>
                  <Paper p="md" radius="md" withBorder h="100%" sx={{ borderLeft: "4px solid green" }}>
                    <Group position="apart">
                      <div>
                        <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                          Ventas Completadas
                        </Text>
                        <Text weight={700} size="xl" color="green">
                          {ventasCompletadas}
                        </Text>
                        <Text size="sm" color="green" weight={500}>
                          $ {montoCompletadas.toFixed(2)} MXN
                        </Text>
                        <Text size="xs" color="dimmed">
                          {ventasCompletadas > 0
                            ? `Promedio: $ ${(montoCompletadas / ventasCompletadas).toFixed(2)} MXN`
                            : "Sin ventas completadas"}
                        </Text>
                      </div>
                      <Box
                        sx={{
                          backgroundColor: "rgba(0, 128, 0, 0.1)",
                          borderRadius: "50%",
                          width: "50px",
                          height: "50px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconCheck size={28} color="green" />
                      </Box>
                    </Group>
                  </Paper>
                </Grid.Col>

              <Grid.Col span={3}>
                  <Paper p="md" radius="md" withBorder h="100%" sx={{ borderLeft: "4px solid #FFB800" }}>
                    <Group position="apart">
                      <div>
                        <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                          Ventas Pendientes
                        </Text>
                        <Text weight={700} size="xl" color="#FFB800">
                          {ventasPendientes}
                        </Text>
                        <Text size="sm" color="#FFB800" weight={500}>
                          $ {montoPendientes.toFixed(2)} MXN
                        </Text>
                        <Text size="xs" color="dimmed">
                          {ventasPendientes > 0
                            ? `Promedio: $ ${(montoPendientes / ventasPendientes).toFixed(2)} MXN`
                            : "Sin ventas pendientes"}
                        </Text>
                      </div>
                      <Box
                        sx={{
                          backgroundColor: "rgba(255, 184, 0, 0.1)",
                          borderRadius: "50%",
                          width: "50px",
                          height: "50px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconClock size={28} color="#FFB800" />
                      </Box>
                    </Group>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={3}>
                  <Paper p="md" radius="md" withBorder h="100%" sx={{ borderLeft: "4px solid red" }}>
                    <Group position="apart">
                      <div>
                        <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                          Ventas Canceladas
                        </Text>
                        <Text weight={700} size="xl" color="red">
                          {ventasCanceladas}
                        </Text>
                        <Text size="sm" color="red" weight={500}>
                          $ {montoCanceladas.toFixed(2)} MXN
                        </Text>
                        <Text size="xs" color="dimmed">
                          {ventasCanceladas > 0
                            ? `Promedio: $ ${(montoCanceladas / ventasCanceladas).toFixed(2)} MXN`
                            : "Sin ventas canceladas"}
                        </Text>
                      </div>
                      <Box
                        sx={{
                          backgroundColor: "rgba(255, 0, 0, 0.1)",
                          borderRadius: "50%",
                          width: "50px",
                          height: "50px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconBan size={28} color="red" />
                      </Box>
                    </Group>
                  </Paper>
                </Grid.Col>
            </Grid>

            <Box sx={{ height: "calc(100% - 320px)" }}>
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
    </>
  )
}

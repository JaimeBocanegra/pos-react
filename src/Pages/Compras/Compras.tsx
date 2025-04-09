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
  IconShoppingCart,
  IconCalendar,
  IconReceipt,
  IconTruckDelivery,
  IconBan,
  IconCheck,
  IconFilter,
} from "@tabler/icons-react"
import DataTable from "../../components/DataTable"
import { useEffect, useState, useMemo } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import Swal from "sweetalert2"
import { CustomFilter } from "../../components/CustomFilter"
import { obtenerCompras, eliminarCompra } from "../services/CompraService"
import { DatePicker, type DatePickerValue } from "@mantine/dates"

// Componente para renderizar montos
const MontoRenderer = (props: any) => {
  const value = Number.parseFloat(props.value).toFixed(2)
  return <span>$ {value} MXN</span>
}

// Componente para renderizar fechas
const FechaRenderer = (props: any) => {
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

export function Compras() {
  const [gridApi, setGridApi] = useState<any | null>(null)
  const [gridColumnApi, setGridColumnApi] = useState<any | null>(null)
  const [compras, setCompras] = useState([] as any[])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<[DatePickerValue, DatePickerValue]>([null, null])
  const [showDateFilter, setShowDateFilter] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const cargarCompras = async () => {
    setLoading(true)
    try {
      const data = await obtenerCompras()
      setCompras(data)
    } catch (error) {
      console.error("Error al obtener compras:", error)
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudieron cargar las compras",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarCompras()
  }, [location])

  // Filtrar por fecha y término de búsqueda
  const filteredData = useMemo(() => {
    let filtered = compras

    // Filtrar por rango de fechas si ambas fechas están seleccionadas
    if (dateRange[0] && dateRange[1]) {
      const startDate = new Date(dateRange[0])
      startDate.setHours(0, 0, 0, 0)

      const endDate = new Date(dateRange[1])
      endDate.setHours(23, 59, 59, 999)

      filtered = filtered.filter((compra) => {
        const compraDate = new Date(compra.FechaRegistro)
        return compraDate >= startDate && compraDate <= endDate
      })
    }

    // Filtrar por término de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (compra) =>
          compra.NumeroDocumento.toLowerCase().includes(searchTerm.toLowerCase()) ||
          compra.NombreProveedor.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    return filtered
  }, [compras, searchTerm, dateRange])

  // Calculamos los montos separados por estado basados en los datos filtrados
  const { montoActivas, montoCanceladas, totalCompras, comprasActivas, comprasCanceladas } = useMemo(() => {
    return filteredData.reduce(
      (acc, compra) => {
        const monto = Number.parseFloat(compra.MontoTotal) || 0
        if (compra.Activo) {
          acc.montoActivas += monto
          acc.comprasActivas++
        } else {
          acc.montoCanceladas += monto
          acc.comprasCanceladas++
        }
        acc.totalCompras++
        return acc
      },
      { montoActivas: 0, montoCanceladas: 0, totalCompras: 0, comprasActivas: 0, comprasCanceladas: 0 },
    )
  }, [filteredData])

  const onGridReady = (params: any) => {
    setGridApi(params.api)
    setGridColumnApi(params.columnApi)
    params.api.sizeColumnsToFit()
  }

  const handleDeleteCompra = async (compra: any) => {
    if (!compra.Activo) return // No hacer nada si ya está cancelada

    Swal.fire({
      title: `¿Estás seguro de cancelar la compra ${compra.NumeroDocumento}?`,
      text: "Esta acción reducirá el stock de los productos y no se puede revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "No cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await eliminarCompra(compra.IdCompra, true)
          Swal.fire("Cancelada", "La compra ha sido cancelada correctamente", "success")
          cargarCompras()
        } catch (error) {
          console.error("Error al cancelar compra:", error)
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo cancelar la compra",
          })
        }
      }
    })
  }

  const resetFilters = () => {
    setDateRange([null, null])
    setSearchTerm("")
  }

  const columnDefs = [
    {
      headerName: "Folio",
      field: "IdCompra",
      flex: 0.7,
      minWidth: 90,
      filter: CustomFilter,
      cellStyle: {
        fontWeight: 500,
      },
    },
    {
      headerName: "Estado",
      field: "Activo",
      flex: 0.8,
      minWidth: 120,
      filter: CustomFilter,
      cellRenderer: EstadoRenderer,
    },
    {
      headerName: "N° Documento",
      field: "NumeroDocumento",
      flex: 1,
      minWidth: 150,
      filter: CustomFilter,
      cellStyle: {
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
      },
      cellRenderer: (params: any) => (
        <Flex align="center" gap="xs">
          <IconReceipt size={16} color="#228be6" />
          <Text>{params.value}</Text>
        </Flex>
      ),
    },
    {
      headerName: "Fecha",
      field: "FechaRegistro",
      flex: 1,
      minWidth: 110,
      filter: CustomFilter,
      cellRenderer: (params: any) => (
        <Flex align="center" gap="xs">
          <IconCalendar size={16} color="#228be6" />
          <FechaRenderer value={params.value} />
        </Flex>
      ),
    },
    {
      headerName: "Proveedor",
      field: "NombreProveedor",
      flex: 2,
      minWidth: 180,
      filter: CustomFilter,
      cellStyle: {
        lineHeight: "1.2",
        display: "flex",
        alignItems: "center",
      },
      cellRenderer: (params: any) => (
        <Flex align="center" gap="xs">
          <IconTruckDelivery size={16} color="#228be6" />
          <Text>{params.value}</Text>
        </Flex>
      ),
      wrapText: true,
      autoHeight: true,
    },
    {
      headerName: "Total",
      field: "MontoTotal",
      flex: 1,
      minWidth: 130,
      filter: CustomFilter,
      cellStyle: {
        fontWeight: 600,
        color: "#228be6",
      },
      cellRenderer: (params: any) => <MontoRenderer value={params.value} />,
    },
    {
      headerName: "Acciones",
      field: "actions",
      minWidth: 150,
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
              onClick={() => navigate(`/compras/${params.data.IdCompra}`)}
              radius="md"
              size="lg"
            >
              <IconEye size="1rem" />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={params.data.Activo ? "Cancelar compra" : "Compra ya cancelada"}>
            <div>
              <ActionIcon
                variant="light"
                color="red"
                onClick={() => handleDeleteCompra(params.data)}
                radius="md"
                size="lg"
                disabled={!params.data.Activo}
                sx={{ opacity: params.data.Activo ? 1 : 0.5 }}
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
      {location.pathname === "/compras" ? (
        <>
          <Flex w="100%" justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
            <Group spacing="xs">
              <IconShoppingCart size={24} color="#228be6" />
              <Title order={2} sx={{ fontSize: "calc(1.2rem + 0.5vw)" }}>
                Gestión de Compras
              </Title>
              <Badge color="blue" size="lg" variant="light">
                {filteredData.length} registros
              </Badge>
            </Group>
            <Group>
              <TextInput
                placeholder="Buscar compra..."
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
                Nueva Compra
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
                  ? `Mostrando compras del ${dateRange[0].toLocaleDateString()} al ${dateRange[1].toLocaleDateString()}`
                  : "Mostrando todas las compras"}
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
                      Total Compras
                    </Text>
                    <Text weight={700} size="xl">
                      {totalCompras}
                    </Text>
                    <Text size="sm" color="dimmed">
                      {comprasActivas} activas
                    </Text>
                    <Text size="sm" color="dimmed">
                      {comprasCanceladas} canceladas
                    </Text>
                  </div>
                  <IconShoppingCart size={32} color="#228be6" />
                </Group>
              </Paper>
            </Grid.Col>

            <Grid.Col span={4}>
              <Paper p="md" radius="md" withBorder h="100%">
                <Group position="apart">
                  <div>
                    <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                      Monto Total Activas
                    </Text>
                    <Text weight={700} size="xl" color="green">
                      $ {montoActivas.toFixed(2)} MXN
                    </Text>
                    <Text size="sm" color="dimmed">
                      {comprasActivas} compras
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
                      {comprasCanceladas} compras
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

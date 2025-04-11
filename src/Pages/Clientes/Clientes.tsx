"use client"

import { ActionIcon, Button, Flex, Paper, Title, Group, Badge, Text, TextInput } from "@mantine/core"
import {
  IconEdit,
  IconTrash,
  IconEye,
  IconUsers,
  IconSearch,
  IconUserPlus,
  IconReceipt,
  IconUserCircle,
} from "@tabler/icons-react"
import DataTable from "../../components/DataTable"
import { useEffect, useState, useMemo } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import Swal from "sweetalert2"
import { obtenerClientes, eliminarCliente } from "../services/ClienteService"
import { CustomFilter } from "../../components/CustomFilter"

export function Clientes() {
  const [gridApi, setGridApi] = useState<any | null>(null)
  const [gridColumnApi, setGridColumnApi] = useState<any | null>(null)
  const [clientes, setClientes] = useState([] as any[])
  const [searchTerm, setSearchTerm] = useState("")
  const navigate = useNavigate()
  const location = useLocation()

  const obtenerClietes = async () => {
    const data = await obtenerClientes()
    setClientes(data)
  }

  useEffect(() => {
    obtenerClietes()
  }, [location])

  const onGridReady = (params: any) => {
    setGridApi(params.api)
    setGridColumnApi(params.columnApi)
  }

  const handleEditCliente = (cliente: any) => {
    navigate("/clientes/" + cliente.idCliente + "/editar")
  }

  const handleDeleteCliente = async (cliente: any) => {
    Swal.fire({
      title: "¿Estas seguro de eliminar este cliente " + cliente.nombre + " ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si, borrar!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        await eliminarCliente(cliente.idCliente)
        Swal.fire("Borrado!", "El cliente ha sido eliminado.", "success")
        obtenerClietes()
      }
    })
  }

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm)
      return clientes.map((cliente: any) => ({
        idCliente: cliente.IdCliente,
        nombre: cliente.Nombre,
        iva: cliente.Iva,
        empleadoRequerido: cliente.EmpleadoRequerido,
        requiereNumeroEmpleado: cliente.RequiereNumeroEmpleado,
      }))

    return clientes
      .filter((cliente: any) => cliente.Nombre.toLowerCase().includes(searchTerm.toLowerCase()))
      .map((cliente: any) => ({
        idCliente: cliente.IdCliente,
        nombre: cliente.Nombre,
        iva: cliente.Iva,
        empleadoRequerido: cliente.EmpleadoRequerido,
        requiereNumeroEmpleado: cliente.RequiereNumeroEmpleado,
      }))
  }, [clientes, searchTerm])

  const uniqueNames = useMemo(() => Array.from(new Set(filteredData.map((row) => row.nombre))), [filteredData])

  const columnDefs = [
    { headerName: "ID", field: "idCliente", hide: true },
    {
      headerName: "Nombre",
      field: "nombre",
      flex: 1,
      minWidth: 200,
      filter: CustomFilter,
      filterParams: {
        options: uniqueNames,
      },
      cellStyle: {
        lineHeight: "1.2",
        alignItems: "center",
        display: "flex",
      },
      cellRenderer: (params: any) => (
        <Group spacing="xs">
          <Badge color="green" size="xs" variant="filled" />
          <Text>{params.value}</Text>
        </Group>
      ),
      wrapText: true,
      autoHeight: true,
    },
    {
      headerName: "IVA",
      field: "iva",
      width: 120,
      cellRenderer: (params: any) => (
        <Badge
          color={params.value ? "blue" : "gray"}
          variant="light"
          leftSection={params.value ? <IconReceipt size={12} /> : null}
        >
          {params.value ? "Activado" : "No"}
        </Badge>
      ),
      cellStyle: {
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    },
    {
      headerName: "Empleado",
      field: "empleadoRequerido",
      width: 140,
      cellRenderer: (params: any) => (
        <Badge
          color={params.value ? "green" : "gray"}
          variant="light"
          leftSection={params.value ? <IconUserCircle size={12} /> : null}
        >
          {params.value ? "Requerido" : "No"}
        </Badge>
      ),
      cellStyle: {
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    },
    {
      headerName: "Núm. Empleado",
      field: "requiereNumeroEmpleado",
      width: 150,
      cellRenderer: (params: any) => (
        <Badge
          color={params.value ? "teal" : "gray"}
          variant="light"
          leftSection={params.value ? <IconUserCircle size={12} /> : null}
        >
          {params.value ? "Requerido" : "No"}
        </Badge>
      ),
      cellStyle: {
        textAlign: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
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
          <ActionIcon
            variant="light"
            color="gray"
            onClick={() => navigate("/clientes/" + params.data.idCliente)}
            title="Ver detalles"
            radius="md"
            size="lg"
          >
            <IconEye size="1rem" />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="blue"
            onClick={() => handleEditCliente(params.data)}
            title="Editar cliente"
            radius="md"
            size="lg"
          >
            <IconEdit size="1rem" />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="red"
            onClick={() => handleDeleteCliente(params.data)}
            title="Eliminar cliente"
            radius="md"
            size="lg"
          >
            <IconTrash size="1rem" />
          </ActionIcon>
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
      {location.pathname === "/clientes" ? (
        <>
          <Flex w="100%" justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
            <Group spacing="xs">
              <IconUsers size={24} color="#2b8a3e" />
              <Title order={2} sx={{ fontSize: "calc(1.2rem + 0.5vw)" }}>
                Gestión de Clientes
              </Title>
              <Badge color="green" size="lg" variant="light">
                {filteredData.length} registros
              </Badge>
            </Group>
            <Group>
              <TextInput
                placeholder="Buscar cliente..."
                icon={<IconSearch size={16} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.currentTarget.value)}
                sx={{ minWidth: "200px" }}
                radius="md"
              />
              <Button
                variant="filled"
                color="green"
                leftIcon={<IconUserPlus size={16} />}
                onClick={() => navigate("agregar")}
                radius="md"
              >
                Agregar Cliente
              </Button>
            </Group>
          </Flex>

          {/* Stats Cards */}
          <Group position="apart" mb="md" grow>
            <Paper p="md" radius="md" withBorder>
              <Group position="apart">
                <div>
                  <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                    Total Clientes
                  </Text>
                  <Text weight={700} size="xl">
                    {clientes.length}
                  </Text>
                </div>
                <IconUsers size={32} color="#2b8a3e" />
              </Group>
            </Paper>

            
          </Group>

          <DataTable
            rowData={filteredData}
            columnDefs={columnDefs}
            onGridReady={onGridReady}
            rowsPerPage={10}
            pagination={true}
          />
        </>
      ) : (
        <Outlet />
      )}
    </Paper>
  )
}

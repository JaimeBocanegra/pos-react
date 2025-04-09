"use client"

import { ActionIcon, Button, Flex, Paper, Title, Group, Badge, Box, Text, TextInput, LoadingOverlay, Tooltip } from "@mantine/core"
import { IconPlus, IconEdit, IconSearch, IconKey, IconEye, IconEyeOff, IconShieldLock } from "@tabler/icons-react"
import { useEffect, useState, useMemo } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { Configuracion, ConfiguracionService } from "../services/ConfiguracionService"
import DataTable from "../../components/DataTable"
import { CustomFilter } from "../../components/CustomFilter"

export default function Configuraciones() {
  const [gridApi, setGridApi] = useState<any | null>(null)
  const [gridColumnApi, setGridColumnApi] = useState<any | null>(null)
  const [configuraciones, setConfiguraciones] = useState<Configuracion[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  // Obtener la lista de configuraciones
  const loadConfiguraciones = async () => {
    try {
      setLoading(true)
      const data = await ConfiguracionService.getAll()
      
      // Enmascarar valores sensibles
      const configsWithMaskedValues = data.map(config => {
        if (isSensitiveConfig(config)) {
          return { ...config, valor: '••••••••' }
        }
        return config
      })
      
      setConfiguraciones(configsWithMaskedValues || [])
    } catch (error) {
      console.error("Error al obtener configuraciones:", error)
    } finally {
      setLoading(false)
    }
  }

  // Determinar si una configuración es sensible (contraseña/clave)
  const isSensitiveConfig = (config: Configuracion) => {
    return config.tipo === 'password' || 
           config.clave.toLowerCase().includes('password') || 
           config.clave.toLowerCase().includes('clave') ||
           config.clave.toLowerCase().includes('secret')
  }

  useEffect(() => {
    loadConfiguraciones()
  }, [location])

  // Filtrar configuraciones basado en el término de búsqueda
  const filteredData = useMemo(() => {
    if (!configuraciones || configuraciones.length === 0) return []
    
    const searchLower = searchTerm.toLowerCase()
    return configuraciones.filter(config => 
      (config?.clave?.toLowerCase()?.includes(searchLower) ||
      config?.descripcion?.toLowerCase()?.includes(searchLower) ||
      config?.categoria?.toLowerCase()?.includes(searchLower))
    )
  }, [configuraciones, searchTerm])

  // Componente para renderizar valores booleanos
  const BooleanRenderer = ({ value }: { value: string }) => {
    return (
      <Badge color={value === 'true' ? 'green' : 'red'} variant="filled">
        {value === 'true' ? 'Sí' : 'No'}
      </Badge>
    )
  }

  // Componente para renderizar valores sensibles
  const SensitiveValueRenderer = ({ config }: { config: Configuracion }) => {
    const [showValue, setShowValue] = useState(false)
    
    if (!isSensitiveConfig(config)) {
      return <Text>{config.valor}</Text>
    }
    
    return (
      <Group spacing={4} align="center">
        <Text>{showValue ? config.valor : '••••••••'}</Text>
        <Tooltip label={showValue ? "Ocultar valor" : "Mostrar valor"}>
          <ActionIcon
            size="sm"
            onClick={() => setShowValue(!showValue)}
            color="gray"
            variant="subtle"
          >
            {showValue ? <IconEyeOff size={14} /> : <IconEye size={14} />}
          </ActionIcon>
        </Tooltip>
      </Group>
    )
  }

  // Configuración de columnas para la tabla
  const columnDefs = [
    { headerName: "ID", field: "id", hide: true },
    {
      headerName: "Clave",
      field: "clave",
      flex: 1.5,
      minWidth: 150,
      filter: CustomFilter,
      cellStyle: { display: "flex", alignItems: "center", fontWeight: 500 },
      cellRenderer: (params: any) => (
        <Group spacing={4} noWrap>
          {isSensitiveConfig(params.data) && (
            <IconShieldLock size={16} color="#228be6" />
          )}
          <Text>{params.value}</Text>
        </Group>
      )
    },
    {
      headerName: "Descripción",
      field: "descripcion",
      flex: 2,
      minWidth: 200,
      filter: CustomFilter,
      cellStyle: { display: "flex", alignItems: "center" }
    },
    {
      headerName: "Valor",
      field: "valor",
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: any) => {
        if (params.data.tipo === 'booleano') {
          return <BooleanRenderer value={params.value} />
        }
        return <SensitiveValueRenderer config={params.data} />
      },
      cellStyle: { display: "flex", alignItems: "center" }
    },
    {
      headerName: "Tipo",
      field: "tipo",
      flex: 1,
      minWidth: 100,
      cellRenderer: (params: any) => (
        <Badge color="blue" variant="light">
          {params.value}
        </Badge>
      ),
      cellStyle: { display: "flex", alignItems: "center" }
    },
    {
      headerName: "Categoría",
      field: "categoria",
      flex: 1,
      minWidth: 120,
      cellRenderer: (params: any) => (
        <Badge color="teal" variant="light">
          {params.value}
        </Badge>
      ),
      cellStyle: { display: "flex", alignItems: "center" }
    },
    {
      headerName: "Acciones",
      field: "actions",
      minWidth: 120,
      cellRenderer: (params: any) => (
        <Group spacing={4} position="center">
          <ActionIcon
            color="blue"
            onClick={() => navigate(`/configuraciones/${params.data.id}/editar`)}
            title="Editar"
            variant="subtle"
          >
            <IconEdit size={16} />
          </ActionIcon>
        </Group>
      )
    }
  ]

  // Configuración inicial de la tabla
  const onGridReady = (params: any) => {
    setGridApi(params.api)
    setGridColumnApi(params.columnApi)
    params.api.sizeColumnsToFit()
  }

  return (
    <Paper shadow="xs" p="md" radius="md" w="100%" h="100%" sx={{ backgroundColor: "white" }} pos="relative">
      <LoadingOverlay visible={loading} overlayBlur={2} />
      
      {location.pathname === "/configuraciones" ? (
        <>
          <Flex justify="space-between" align="center" mb="md" wrap="wrap" gap="sm">
            <Group spacing="xs">
              <Title order={2} sx={{ fontSize: "calc(1.2rem + 0.5vw)" }}>
                Configuraciones del Sistema
              </Title>
              <Badge color="blue" size="lg" variant="light">
                {filteredData.length} registros
              </Badge>
              <Badge color="orange" size="lg" variant="outline" leftSection={<IconShieldLock size={14} />}>
                {filteredData.filter(c => isSensitiveConfig(c)).length} sensibles
              </Badge>
            </Group>
            <Group>
              <TextInput
                placeholder="Buscar configuración..."
                icon={<IconSearch size={16} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.currentTarget.value)}
                sx={{ minWidth: "200px" }}
                radius="md"
              />
              <Button
                variant="filled"
                color="blue"
                leftIcon={<IconPlus size={16} />}
                onClick={() => navigate("nueva")}
                radius="md"
              >
                Nueva Configuración
              </Button>
            </Group>
          </Flex>

          <Box sx={{ height: "calc(100% - 80px)" }}>
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
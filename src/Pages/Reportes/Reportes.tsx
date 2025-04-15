"use client"

import { Paper, Tabs, Title, Group, Text, Button, Flex, ActionIcon, Tooltip } from "@mantine/core"
import {
  IconReportAnalytics,
  IconShoppingBag,
  IconShoppingCart,
  IconFileExport,
  IconPrinter,
  IconFilter,
  IconFilterOff,
  IconDownload,
  IconChartBar,
  IconChartPie,
  IconTable,
} from "@tabler/icons-react"
import { useState } from "react"
import { ReporteVentas } from "./ReporteVentas"
import { ReporteCompras } from "./ReporteCompras"
import "jspdf-autotable"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from "chart.js"

// Registrar componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, ChartTooltip, Legend, ArcElement)

export function Reportes() {
  const [activeTab, setActiveTab] = useState<string | null>("ventas")
  const [showFilters, setShowFilters] = useState(true)
  const [viewMode, setViewMode] = useState<"table" | "chart">("table")
  const [chartType, setChartType] = useState<"bar" | "pie">("bar")

  return (
    <Paper shadow="xs" p="md" radius="md" w="100%" h="100%" sx={{ backgroundColor: "white" }}>
      <Flex w="100%" justify="space-between" align="center" mb="md">
        <Group spacing="xs">
          <IconReportAnalytics size={24} color="#228be6" />
          <Title order={2} sx={{ fontSize: "calc(1.2rem + 0.5vw)" }}>
            Reportes
          </Title>
        </Group>
        <Group>
          <Button
            variant={showFilters ? "filled" : "light"}
            color="blue"
            leftIcon={showFilters ? <IconFilterOff size={16} /> : <IconFilter size={16} />}
            onClick={() => setShowFilters(!showFilters)}
            radius="md"
          >
            {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
          </Button>
        </Group>
      </Flex>

      <Tabs value={activeTab} onTabChange={setActiveTab} mb="md">
        <Tabs.List>
          <Tabs.Tab value="ventas" icon={<IconShoppingBag size={16} />}>
            Reporte de Ventas
          </Tabs.Tab>
          <Tabs.Tab value="compras" icon={<IconShoppingCart size={16} />}>
            Reporte de Compras
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {/* Controles de visualización */}
      <Group position="right" mb="md" spacing="xs">
        <Text size="sm" color="dimmed">
          Vista:
        </Text>
        <Tooltip label="Vista de tabla">
          <ActionIcon
            variant={viewMode === "table" ? "filled" : "light"}
            color="blue"
            onClick={() => setViewMode("table")}
          >
            <IconTable size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Vista de gráfico">
          <ActionIcon
            variant={viewMode === "chart" ? "filled" : "light"}
            color="blue"
            onClick={() => setViewMode("chart")}
          >
            {chartType === "bar" ? <IconChartBar size={18} /> : <IconChartPie size={18} />}
          </ActionIcon>
        </Tooltip>
        {viewMode === "chart" && (
          <>
            <Text size="sm" color="dimmed" ml="md">
              Tipo de gráfico:
            </Text>
            <Tooltip label="Gráfico de barras">
              <ActionIcon
                variant={chartType === "bar" ? "filled" : "light"}
                color="blue"
                onClick={() => setChartType("bar")}
              >
                <IconChartBar size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Gráfico circular">
              <ActionIcon
                variant={chartType === "pie" ? "filled" : "light"}
                color="blue"
                onClick={() => setChartType("pie")}
              >
                <IconChartPie size={18} />
              </ActionIcon>
            </Tooltip>
          </>
        )}
      </Group>

      {activeTab === "ventas" ? (
        <ReporteVentas showFilters={showFilters} viewMode={viewMode} chartType={chartType} />
      ) : (
        <ReporteCompras showFilters={showFilters} viewMode={viewMode} chartType={chartType} />
      )}
    </Paper>
  )
}

export default Reportes

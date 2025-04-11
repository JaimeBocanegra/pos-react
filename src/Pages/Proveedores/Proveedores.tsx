// Proveedores.tsx - Improved suppliers list
import { ActionIcon, Button, Flex, Paper, Title, Group, Badge, Box, Text, TextInput } from "@mantine/core";
import { IconPlus, IconEdit, IconTrash, IconEye, IconTruckDelivery, IconSearch, IconBuildingStore } from "@tabler/icons-react";
import DataTable from "../../components/DataTable";
import { useEffect, useState, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { obtenerProveedores, eliminarProveedor } from "../services/ProveedorService";
import CustomMultiFilter from '../../components/CustomFilter';

export function Proveedores() {
  const [gridApi, setGridApi] = useState<any | null>(null);
  const [gridColumnApi, setGridColumnApi] = useState<any | null>(null);
  const [proveedores, setProveedores] = useState([] as any[]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const obtieneProveedores = async () => {
    const data = await obtenerProveedores();
    setProveedores(data);
  };

  useEffect(() => {
    obtieneProveedores();
  }, [location]);

  const onGridReady = (params: any) => {
    setGridApi(params.api);
    setGridColumnApi(params.columnApi);
  };

  const handleEditProveedor = (proveedor: any) => {
    navigate("/proveedores/" + proveedor.idProveedor + "/editar");
  };

  const handleDeleteProveedor = async (proveedor: any) => {
    Swal.fire({
      title: "¿Estas seguro de eliminar este proveedor " + proveedor.nombre + " ?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Si, borrar!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        await eliminarProveedor(proveedor.idProveedor);
        Swal.fire("Borrado!", "El proveedor ha sido eliminado.", "success");
        obtieneProveedores();
      }
    });
  };

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return proveedores.map((proveedor: any) => ({
      idProveedor: proveedor.IdProveedor,
      nombre: proveedor.NombreCompleto,
    }));
    
    return proveedores
      .filter((proveedor: any) => 
        proveedor.NombreCompleto.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map((proveedor: any) => ({
        idProveedor: proveedor.IdProveedor,
        nombre: proveedor.NombreCompleto,
      }));
  }, [proveedores, searchTerm]);

  const uniqueNames = useMemo(() => Array.from(new Set(filteredData.map(row => row.nombre))), [filteredData]);

  const columnDefs = [
    { headerName: "ID", field: "idProveedor", hide: true },
    {
      headerName: "Nombre",
      field: "nombre",
      flex: 1,
      minWidth: 200,
      cellStyle: {
        lineHeight: "1.2",
        alignItems: "center",
        display: "flex",
      },
      cellRenderer: (params: any) => (
        <Group spacing="xs">
          <Badge color="blue" size="xs" variant="filled" />
          <Text>{params.value}</Text>
        </Group>
      ),
      wrapText: true,
      autoHeight: true,
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
            padding: "8px 0" 
          }}
        >
          <ActionIcon
            variant="light"
            color="gray"
            onClick={() => navigate("/proveedores/" + params.data.idProveedor)}
            title="Ver detalles"
            radius="md"
            size="lg"
          >
            <IconEye size="1rem" />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="blue"
            onClick={() => handleEditProveedor(params.data)}
            title="Editar proveedor"
            radius="md"
            size="lg"
          >
            <IconEdit size="1rem" />
          </ActionIcon>
          <ActionIcon
            variant="light"
            color="red"
            onClick={() => handleDeleteProveedor(params.data)}
            title="Eliminar proveedor"
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
        height: "100%"
      },
      headerClass: "centered-header",
    },
  ];

  return (
    <Paper
      shadow="xs"
      p="md"
      radius="md"
      w="100%"
      h="100%"
      sx={{ backgroundColor: "white" }}
    >
      {location.pathname === "/proveedores" ? (
        <>
          <Flex 
            w="100%" 
            justify="space-between" 
            align="center" 
            mb="md"
            wrap="wrap"
            gap="sm"
          >
            <Group spacing="xs">
              <IconTruckDelivery size={24} color="#228be6" />
              <Title order={2} sx={{ fontSize: "calc(1.2rem + 0.5vw)" }}>
                Gestión de Proveedores
              </Title>
              <Badge color="blue" size="lg" variant="light">
                {filteredData.length} registros
              </Badge>
            </Group>
            <Group>
              <TextInput
                placeholder="Buscar proveedor..."
                icon={<IconSearch size={16} />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.currentTarget.value)}
                sx={{ minWidth: "200px" }}
                radius="md"
              />
              <Button
                variant="filled"
                color="blue"
                leftIcon={<IconBuildingStore size={16} />}
                onClick={() => navigate("agregar")}
                radius="md"
              >
                Agregar Proveedor
              </Button>
            </Group>
          </Flex>

          {/* Stats Cards */}
          <Group position="apart" mb="md" grow>
            <Paper p="md" radius="md" withBorder>
              <Group position="apart">
                <div>
                  <Text size="xs" color="dimmed" transform="uppercase" weight={700}>
                    Total Proveedores
                  </Text>
                  <Text weight={700} size="xl">
                    {proveedores.length}
                  </Text>
                </div>
                <IconTruckDelivery size={32} color="#228be6" />
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
  );
}
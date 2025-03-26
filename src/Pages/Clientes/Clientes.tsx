import { ActionIcon, Button, Flex } from "@mantine/core";
import { IconPlus, IconEdit, IconTrash, IconEye } from "@tabler/icons-react";
import DataTable from "../../components/DataTable";
import { useEffect, useState, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { obtenerClientes, eliminarCliente } from "../services/ClienteService";
import {CustomFilter} from '../../components/CustomFilter';

export function Clientes() {
  const [gridApi, setGridApi] = useState<any | null>(null);
  const [gridColumnApi, setGridColumnApi] = useState<any | null>(null);
  const [clientes, setClientes] = useState([] as any[]);
  const navigate = useNavigate();
  const location = useLocation();

  const obtenerClietes = async () => {
    const data = await obtenerClientes();
    setClientes(data);
  };

  useEffect(() => {
    obtenerClietes();
  }, [location]);

  const onGridReady = (params: any) => {
    setGridApi(params.api);
    setGridColumnApi(params.columnApi);
  };

  const handleEditCliente = (cliente: any) => {
    navigate("/clientes/" + cliente.idCliente + "/editar");
  };

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
        await eliminarCliente(cliente.idCliente);
        Swal.fire("Borrado!", "El cliente ha sido eliminado.", "success");
        obtenerClietes();
      }
    });
  };

  const rowData = useMemo(() => clientes.map((cliente: any) => ({
    idCliente: cliente.IdCliente,
    nombre: cliente.Nombre,
  })), [clientes]);

  const uniqueNames = useMemo(() => Array.from(new Set(rowData.map(row => row.nombre))), [rowData]);

  const columnDefs =  [
    { headerName: "ID", field: "idCliente", hide: true },
    {
      headerName: "Nombre",
      field: "nombre",
      flex: 1,
      minWidth: 100,
      filter: CustomFilter,
      filterParams: {
        options: uniqueNames,
        
      },
      cellStyle: {
        lineHeight: "1.2",
        alignItems: "flex-center",
        display: "flex",
      },
      wrapText: true,
      autoHeight: true,
    },
    {
      headerName: "Acciones",
      field: "actions",
      minWidth: 50,
      cellRenderer: (params: any) => (
        <Flex
          w="100%"
          justify="center"
          align="center"
          h={"100%"}
          gap="0.625rem"
        >
          <ActionIcon
            variant="filled"
            onClick={() => navigate("/clientes/" + params.data.idCliente)}
          >
            <IconEye size="1rem" />
          </ActionIcon>
          <ActionIcon
            variant="filled"
            color="blue"
            onClick={() => handleEditCliente(params.data)}
          >
            <IconEdit size="1rem" />
          </ActionIcon>
          <ActionIcon
            variant="filled"
            color="red"
            onClick={() => handleDeleteCliente(params.data)}
          >
            <IconTrash size="1rem" />
          </ActionIcon>
        </Flex>
      ),
      cellStyle: { textAlign: "center" },
      headerClass: "centered-header",
    },
  ];

  return (
    <Flex
      w="100%"
      h="100%"
      sx={{ backgroundColor: "white" }}
      direction={"column"}
    >
      {location.pathname === "/clientes" ? (
        <>
          <Flex w="100%" h="10%" justify="space-around">
            <Flex pl="xs" w="89%" sx={{ flexGrow: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: "calc(1rem + 1vw)" }}>Clientes</h1>
            </Flex>
            <Flex
              w="11%"
              justify="center"
              align="center"
              sx={{ flexShrink: 0, minWidth: "150px" }}
            >
              <Button
                variant="filled"
                leftIcon={<IconPlus />}
                onClick={() => navigate("agregar")}
              >
                Agregar
              </Button>
            </Flex>
          </Flex>
          <DataTable
            rowData={rowData}
            columnDefs={columnDefs}
            onGridReady={onGridReady}
            rowsPerPage={5}
            pagination={true}
          />
        </>
      ) : (
        <Outlet />
      )}
    </Flex>
  );
}
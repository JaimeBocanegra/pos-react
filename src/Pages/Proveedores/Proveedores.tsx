import { ActionIcon, Button, Flex } from "@mantine/core";
import { IconPlus, IconEdit, IconTrash, IconEye } from "@tabler/icons-react";
import DataTable from "../../components/DataTable";
import { useEffect, useState, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { obtenerProveedores, eliminarProveedor } from "../services/ProveedorService";
import {CustomFilter} from '../../components/CustomFilter';

export function Proveedores() {
  const [gridApi, setGridApi] = useState<any | null>(null);
  const [gridColumnApi, setGridColumnApi] = useState<any | null>(null);
  const [proveedores, setProveedores] = useState([] as any[]);
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

  const rowData = useMemo(() => proveedores.map((proveedor: any) => ({
    idProveedor: proveedor.IdProveedor,
    nombre: proveedor.NombreCompleto,
  })), [proveedores]);

  const uniqueNames = useMemo(() => Array.from(new Set(rowData.map(row => row.nombre))), [rowData]);

  const columnDefs =  [
    { headerName: "ID", field: "idProveedor", hide: true },
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
            onClick={() => navigate("/proveedores/" + params.data.idProveedor)}
          >
            <IconEye size="1rem" />
          </ActionIcon>
          <ActionIcon
            variant="filled"
            color="blue"
            onClick={() => handleEditProveedor(params.data)}
          >
            <IconEdit size="1rem" />
          </ActionIcon>
          <ActionIcon
            variant="filled"
            color="red"
            onClick={() => handleDeleteProveedor(params.data)}
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
      {location.pathname === "/proveedores" ? (
        <>
          <Flex w="100%" h="10%" justify="space-around">
            <Flex pl="xs" w="89%" sx={{ flexGrow: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: "calc(1rem + 1vw)" }}>Proveedores</h1>
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
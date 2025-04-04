import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  obtenerProveedorPorId,
} from "../services/ProveedorService";
import { ActionIcon, Flex, MediaQuery, Text } from "@mantine/core";
import { IconArrowLeft, IconTruckDelivery } from "@tabler/icons-react";

export function DetallesProveedor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [proveedor, setProveedor] = useState<any | null>(null);

  useEffect(() => {
    const obtenerProveedor = async () => {
          if (id) {
            try {
              const data = await obtenerProveedorPorId(parseInt(id));
              setProveedor(data);
            } catch (error) {
              console.log(error);
            }
          }
        };
        obtenerProveedor();
  }, [id]);

  if (!proveedor) {
    return <Text>Cargando...</Text>;
  }

  return (
    <Flex
      w="100%"
      h="100%"
      justify="flex-start"
      direction={"column"}
      gap="1rem"
      p="1rem"
    >
      <Flex w="100%" h="10%" align="center">
        <Flex
          pl="xs"
          w="100%"
          align={"center"}
          sx={{ flexGrow: 1, minWidth: 0 }}
        >
          <ActionIcon
            color="indigo"
            size="lg"
            variant="transparent"
            mr="md"
            onClick={() => navigate(-1)}
          >
            <IconArrowLeft size="1.625rem" />
          </ActionIcon>
          <MediaQuery smallerThan="sm" styles={{ fontSize: "1.25rem" }}>
            <h1 style={{ fontSize: "calc(1rem + 1vw)", margin: 0 }}>
              Detalle de Cliente <IconTruckDelivery size="1.5rem" />
            </h1>
          </MediaQuery>
        </Flex>
      </Flex>
      <Text>
        <Text component="span" weight={700}>
          ID:
        </Text>{" "}
        {proveedor.IdProveedor}
      </Text>
      <Text>
        <Text component="span" weight={700}>
          Nombre:
        </Text>{" "}
        {proveedor.NombreCompleto}
      </Text>
      <Text>
        <Text component="span" weight={700}>
          Creado:
        </Text>{" "}
        {new Date(proveedor.created_at).toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </Flex>
  );
}

import { Flex, ActionIcon, MediaQuery, Input, Button } from "@mantine/core";
import React, { useEffect, useState } from "react";
import { IconUsers, IconArrowLeft } from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  obtenerClientePorId,
  actualizarCliente,
} from "../services/ClienteService";

export function Editar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<any | null>(null);
  const [nombre, setNombre] = useState("");

  useEffect(() => {
    const obtenerCliente = async () => {
      if (id) {
        try {
          const data = await obtenerClientePorId(parseInt(id));
          setCliente(data);
          setNombre(data?.Nombre);
        } catch (error) {
          console.log(error);
        }
      }
    };

    obtenerCliente();
  }, [id]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (nombre === "") {
      alert("Por favor ingrese el nombre del cliente no debe ir vacio");
      return;
    }
    if (nombre === cliente?.Nombre) {
      navigate("/clientes");
      return;
    } else {
      try {
        if (id) {
          await actualizarCliente(parseInt(id), nombre);
          navigate("/clientes");
        }
      } catch (error) {
        console.log(error);
      }
    }
  };

  return (
    <Flex
      w="100%"
      h="100%"
      justify="flex-start"
      direction={"column"}
      gap="1rem"
      align="center"
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
              Editar cliente
              <IconUsers size="1.5rem" />
            </h1>
          </MediaQuery>
        </Flex>
      </Flex>
      <MediaQuery smallerThan="md" styles={{ width: "80%" }}>
        <Input.Wrapper id="nombre-label" label="Nombre del cliente" w={"40%"}>
          <Input
            id="nombre"
            placeholder="Nombre"
            value={nombre} // Usa el estado `nombre` aquí
            onChange={(e) => setNombre(e.target.value)} // Actualiza el estado `nombre`
          />
        </Input.Wrapper>
      </MediaQuery>
      <Button variant="filled" onClick={handleSubmit}>
        Actualizar
      </Button>
    </Flex>
  );
}

export default Editar;

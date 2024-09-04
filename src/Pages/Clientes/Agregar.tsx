import { Button, Flex, Input, ActionIcon, MediaQuery } from "@mantine/core";
import React from "react";
import { IconUsers, IconArrowLeft } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/client";

export function Agregar() {
  const navigate = useNavigate();
  const [nombre, setNombre] = React.useState("");
  const [error, setError] = React.useState("");
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (nombre === "") {
      setError("Por favor ingrese el nombre del cliente");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("CLIENTES")
        .insert({ Nombre: nombre });
      setNombre("");
      setError("");
      navigate(-1);
      if (error) {
        throw error;
      }
      console.log(data);
    } catch (error) {
      console.log(error);
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
              Alta de Clientes <IconUsers size="1.5rem" />
            </h1>
          </MediaQuery>
        </Flex>
      </Flex>
      <MediaQuery smallerThan="md" styles={{ width: "80%" }}>
        <Input.Wrapper
          id="nombre-label"
          label="Nombre del nuevo cliente"
          error={error}
          w={"40%"}
        >
          <Input
            id="nombre"
            placeholder="Nombre"
            onChange={(e) => setNombre(e.target.value)}
            value={nombre}
          />
        </Input.Wrapper>
      </MediaQuery>
      <Button variant="filled" onClick={handleSubmit}>
        Guardar
      </Button>
    </Flex>
  );
}

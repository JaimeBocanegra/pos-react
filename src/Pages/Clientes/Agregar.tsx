import { Button, Flex, TextInput, ActionIcon, Paper, Title, Group, Box, Text, Alert } from "@mantine/core";
import React, { useState } from "react";
import { IconUsers, IconArrowLeft, IconUserPlus, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/client";

export function Agregar() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setError("");
    setSuccess(false);
    
    // Validate input
    if (nombre.trim() === "") {
      setError("Por favor ingrese el nombre del cliente");
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error: supabaseError } = await supabase
        .from("CLIENTES")
        .insert({ Nombre: nombre });
      
      if (supabaseError) {
        throw supabaseError;
      }
      
      console.log("Cliente creado:", data);
      setSuccess(true);
      
      // Reset form
      setNombre("");
      
      // Navigate back after a short delay to show success message
      setTimeout(() => {
        navigate(-1);
      }, 1500);
      
    } catch (error: any) {
      console.error("Error al crear cliente:", error);
      setError(error.message || "Ocurrió un error al crear el cliente");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper shadow="xs" p="xl" radius="md" w="100%" h="100%">
      <form onSubmit={handleSubmit} style={{ height: "100%" }}>
        <Flex 
          direction="column" 
          h="100%" 
          gap="xl"
        >
          {/* Header */}
          <Flex w="100%" align="center" justify="space-between">
            <Group>
              <ActionIcon 
                color="blue" 
                size="lg" 
                variant="light" 
                onClick={() => navigate(-1)}
                radius="xl"
              >
                <IconArrowLeft size="1.2rem" />
              </ActionIcon>
              <Title order={2} sx={(theme) => ({ 
                fontSize: "calc(1.1rem + 0.5vw)",
                color: theme.colors.green[7]
              })}>
                Alta de Cliente
              </Title>
            </Group>
            <IconUsers size={28} color="#2b8a3e" />
          </Flex>

          {/* Form Content */}
          <Box 
            sx={{ 
              maxWidth: "600px", 
              width: "100%", 
              margin: "0 auto",
              flex: 1
            }}
          >
            {success && (
              <Alert 
                icon={<IconCheck size={16} />} 
                title="¡Cliente creado con éxito!" 
                color="green" 
                mb="lg"
                withCloseButton
                onClose={() => setSuccess(false)}
              >
                El cliente ha sido registrado correctamente.
              </Alert>
            )}
            
            <Paper p="lg" radius="md" withBorder>
              <Title order={4} mb="md">Información del Cliente</Title>
              
              <TextInput
                label="Nombre del Cliente"
                placeholder="Ingrese el nombre completo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                error={error}
                required
                mb="md"
                icon={<IconUserPlus size={16} />}
                size="md"
                radius="md"
                autoFocus
              />
              
              {error && (
                <Alert 
                  icon={<IconAlertCircle size={16} />} 
                  title="Error" 
                  color="red" 
                  mb="md"
                  withCloseButton
                  onClose={() => setError("")}
                >
                  {error}
                </Alert>
              )}
              
              <Text color="dimmed" size="sm" mb="xl">
                Complete el nombre del cliente para registrarlo en el sistema.
              </Text>
              
              <Group position="apart" mt="xl">
                <Button 
                  variant="outline" 
                  color="gray" 
                  onClick={() => navigate(-1)}
                  radius="md"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  color="green" 
                  radius="md"
                  loading={loading}
                  leftIcon={<IconUserPlus size={16} />}
                >
                  Guardar Cliente
                </Button>
              </Group>
            </Paper>
          </Box>
          
          {/* Footer */}
          <Box>
            <Text align="center" size="sm" color="dimmed">
              Los clientes registrados aparecerán en la lista de clientes.
            </Text>
          </Box>
        </Flex>
      </form>
    </Paper>
  );
}
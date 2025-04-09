// Agregar.tsx - Improved supplier creation form
import { Button, Flex, TextInput, ActionIcon, Paper, Title, Group, Box, Text, Alert } from "@mantine/core";
import React, { useState } from "react";
import { IconTruckDelivery, IconArrowLeft, IconBuildingStore, IconCheck, IconAlertCircle } from "@tabler/icons-react";
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
      setError("Por favor ingrese el nombre del proveedor");
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error: supabaseError } = await supabase
        .from("Proveedores")
        .insert({ NombreCompleto: nombre });
      
      if (supabaseError) {
        throw supabaseError;
      }
      
      console.log("Proveedor creado:", data);
      setSuccess(true);
      
      // Reset form
      setNombre("");
      
      // Navigate back after a short delay to show success message
      setTimeout(() => {
        navigate(-1);
      }, 1500);
      
    } catch (error: any) {
      console.error("Error al crear proveedor:", error);
      setError(error.message || "Ocurrió un error al crear el proveedor");
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
                color: theme.colors.blue[7]
              })}>
                Alta de Proveedor
              </Title>
            </Group>
            <IconTruckDelivery size={28} color="#228be6" />
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
                title="¡Proveedor creado con éxito!" 
                color="blue" 
                mb="lg"
                withCloseButton
                onClose={() => setSuccess(false)}
              >
                El proveedor ha sido registrado correctamente.
              </Alert>
            )}
            
            <Paper p="lg" radius="md" withBorder>
              <Title order={4} mb="md">Información del Proveedor</Title>
              
              <TextInput
                label="Nombre del Proveedor"
                placeholder="Ingrese el nombre completo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                error={error}
                required
                mb="md"
                icon={<IconBuildingStore size={16} />}
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
                Complete el nombre del proveedor para registrarlo en el sistema.
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
                  color="blue" 
                  radius="md"
                  loading={loading}
                  leftIcon={<IconBuildingStore size={16} />}
                >
                  Guardar Proveedor
                </Button>
              </Group>
            </Paper>
          </Box>
          
          {/* Footer */}
          <Box>
            <Text align="center" size="sm" color="dimmed">
              Los proveedores registrados aparecerán en la lista de proveedores.
            </Text>
          </Box>
        </Flex>
      </form>
    </Paper>
  );
}
// Editar.tsx - Improved supplier edit form
import { Button, Flex, TextInput, ActionIcon, Paper, Title, Group, Box, Text, Alert } from "@mantine/core";
import React, { useEffect, useState } from "react";
import { IconTruckDelivery, IconArrowLeft, IconBuildingStore, IconCheck, IconAlertCircle } from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router-dom";
import { obtenerProveedorPorId, actualizarProveedor } from "../services/ProveedorService";

export function Editar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [proveedor, setProveedor] = useState<any | null>(null);
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const obtenerProveedor = async () => {
      if (id) {
        try {
          setLoadingData(true);
          const data = await obtenerProveedorPorId(parseInt(id));
          setProveedor(data);
          setNombre(data?.NombreCompleto || "");
        } catch (error) {
          console.log(error);
          setError("Error al cargar los datos del proveedor");
        } finally {
          setLoadingData(false);
        }
      }
    };
    obtenerProveedor();
  }, [id]);

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
    
    if (nombre === proveedor?.NombreCompleto) {
      navigate("/proveedores");
      return;
    }
    
    setLoading(true);
    
    try {
      if (id) {
        await actualizarProveedor(parseInt(id), nombre);
        setSuccess(true);
        
        // Navigate back after a short delay to show success message
        setTimeout(() => {
          navigate("/proveedores");
        }, 1500);
      }
    } catch (error: any) {
      console.error("Error al actualizar proveedor:", error);
      setError(error.message || "Ocurrió un error al actualizar el proveedor");
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Paper shadow="xs" p="xl" radius="md" w="100%" h="100%">
        <Flex direction="column" gap="md" align="center" justify="center" h="100%">
          <Title order={3}>Cargando datos del proveedor...</Title>
        </Flex>
      </Paper>
    );
  }

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
                Editar Proveedor
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
                title="¡Proveedor actualizado con éxito!" 
                color="blue" 
                mb="lg"
                withCloseButton
                onClose={() => setSuccess(false)}
              >
                Los datos del proveedor han sido actualizados correctamente.
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
                  Actualizar Proveedor
                </Button>
              </Group>
            </Paper>
          </Box>
        </Flex>
      </form>
    </Paper>
  );
}

export default Editar;
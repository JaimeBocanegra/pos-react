import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { obtenerProveedorPorId } from "../services/ProveedorService";
import { 
  ActionIcon, 
  Flex, 
  Text, 
  Paper, 
  Title, 
  Group, 
  Badge, 
  Divider, 
  Skeleton,
  Box,
  Card,
  Avatar,
  Grid
} from "@mantine/core";
import { 
  IconArrowLeft, 
  IconTruckDelivery, 
  IconId, 
  IconUser, 
  IconCalendar,
  IconBuildingStore
} from "@tabler/icons-react";

export function DetallesProveedor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [proveedor, setProveedor] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const obtenerProveedor = async () => {
      if (id) {
        try {
          setLoading(true);
          const data = await obtenerProveedorPorId(parseInt(id));
          setProveedor(data);
        } catch (error) {
          console.log(error);
        } finally {
          setLoading(false);
        }
      }
    };
    obtenerProveedor();
  }, [id]);

  if (loading) {
    return (
      <Paper shadow="xs" p="xl" radius="md" w="100%" h="100%">
        <Flex direction="column" gap="md">
          <Skeleton height={40} width="50%" mb="md" />
          <Skeleton height={25} width="70%" mb="sm" />
          <Skeleton height={25} width="60%" mb="sm" />
          <Skeleton height={25} width="80%" mb="sm" />
        </Flex>
      </Paper>
    );
  }

  if (!proveedor) {
    return (
      <Paper shadow="xs" p="xl" radius="md" w="100%" h="100%" withBorder>
        <Flex align="center" justify="center" direction="column" gap="md">
          <IconBuildingStore size={48} color="gray" />
          <Text size="lg" color="dimmed">Proveedor no encontrado</Text>
          <ActionIcon 
            color="blue" 
            size="lg" 
            variant="light" 
            onClick={() => navigate(-1)}
            radius="xl"
          >
            <IconArrowLeft size="1.2rem" />
          </ActionIcon>
        </Flex>
      </Paper>
    );
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <Paper shadow="xs" p="xl" radius="md" w="100%" h="100%">
      <Flex w="100%" direction="column" gap="xl">
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
              Detalle de Proveedor
            </Title>
          </Group>
          <Badge 
            size="lg" 
            color="blue" 
            variant="filled"
            leftSection={<IconTruckDelivery size={14} />}
          >
            Proveedor
          </Badge>
        </Flex>

        <Divider />

        {/* Supplier Info Card */}
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Card.Section p="md" bg="blue.0">
            <Group position="apart">
              <Group>
                <Avatar 
                  size={60} 
                  radius="md" 
                  color="blue"
                >
                  {getInitials(proveedor.NombreCompleto)}
                </Avatar>
                <Box>
                  <Text size="xl" weight={700}>{proveedor.NombreCompleto}</Text>
                  <Badge color="blue" variant="light" size="sm">
                    ID: {proveedor.IdProveedor}
                  </Badge>
                </Box>
              </Group>
              <IconTruckDelivery size={32} color="#228be6" />
            </Group>
          </Card.Section>

          <Grid mt="xl" gutter="xl">
            <Grid.Col xs={12}>
              <InfoItem 
                icon={<IconId size="1.2rem" color="#228be6" />}
                label="ID de Proveedor"
                value={proveedor.IdProveedor}
              />
            </Grid.Col>
            <Grid.Col xs={12}>
              <InfoItem 
                icon={<IconUser size="1.2rem" color="#228be6" />}
                label="Nombre Completo"
                value={proveedor.NombreCompleto}
                highlight
              />
            </Grid.Col>
            <Grid.Col xs={12}>
              <InfoItem 
                icon={<IconCalendar size="1.2rem" color="#228be6" />}
                label="Fecha de Registro"
                value={new Date(proveedor.created_at).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
            </Grid.Col>
          </Grid>
        </Card>

        {/* Additional Information Card - Can be expanded with more supplier details */}
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Title order={4} mb="md">Información de Contacto</Title>
          <Paper p="md" withBorder radius="md" bg="gray.0">
            <Flex direction="column" align="center" justify="center" py="md">
              <IconBuildingStore size={32} color="#228be6" />
              <Text size="lg" weight={600} mt="md" align="center">
                {proveedor.NombreCompleto}
              </Text>
              <Text color="dimmed" size="sm" align="center">
                Proveedor desde {new Date(proveedor.created_at).toLocaleDateString("es-ES", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </Flex>
          </Paper>
        </Card>
      </Flex>
    </Paper>
  );
}

// Helper component for displaying info items
function InfoItem({ icon, label, value, highlight = false }: { icon: React.ReactNode; label: string; value: string | number; highlight?: boolean }) {
  return (
    <Group position="apart" spacing="xs">
      <Group spacing="xs">
        {icon}
        <Text weight={600} color="dimmed" size="sm">{label}:</Text>
      </Group>
      <Text 
        weight={highlight ? 700 : 500} 
        color={highlight ? "blue" : "dark"}
        size={highlight ? "md" : "sm"}
      >
        {value}
      </Text>
    </Group>
  );
}
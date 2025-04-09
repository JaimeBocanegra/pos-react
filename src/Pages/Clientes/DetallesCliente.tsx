import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../supabase/client";
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
  IconUsers, 
  IconId, 
  IconUser, 
  IconCalendar,
  IconUserCircle
} from "@tabler/icons-react";

export function DetallesCliente() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [cliente, setCliente] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const obtenerCliente = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("CLIENTES")
          .select("*")
          .eq("IdCliente", id)
          .single();
        
        if (error) {
          console.log(error);
        } else {
          setCliente(data);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    obtenerCliente();
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

  if (!cliente) {
    return (
      <Paper shadow="xs" p="xl" radius="md" w="100%" h="100%" withBorder>
        <Flex align="center" justify="center" direction="column" gap="md">
          <IconUserCircle size={48} color="gray" />
          <Text size="lg" color="dimmed">Cliente no encontrado</Text>
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
              Detalle de Cliente
            </Title>
          </Group>
          <Badge 
            size="lg" 
            color="green" 
            variant="filled"
            leftSection={<IconUsers size={14} />}
          >
            Cliente
          </Badge>
        </Flex>

        <Divider />

        {/* Customer Info Card */}
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Card.Section p="md" bg="green.0">
            <Group position="apart">
              <Group>
                <Avatar 
                  size={60} 
                  radius="md" 
                  color="green"
                >
                  {getInitials(cliente.Nombre)}
                </Avatar>
                <Box>
                  <Text size="xl" weight={700}>{cliente.Nombre}</Text>
                  <Badge color="green" variant="light" size="sm">
                    ID: {cliente.IdCliente}
                  </Badge>
                </Box>
              </Group>
              <IconUsers size={32} color="#2b8a3e" />
            </Group>
          </Card.Section>

          <Grid mt="xl" gutter="xl">
            <Grid.Col xs={12} sm={6}>
              <InfoItem 
                icon={<IconId size="1.2rem" color="#2b8a3e" />}
                label="ID de Cliente"
                value={cliente.IdCliente}
              />
            </Grid.Col>
            <Grid.Col xs={12} sm={6}>
              <InfoItem 
                icon={<IconUser size="1.2rem" color="#2b8a3e" />}
                label="Nombre"
                value={cliente.Nombre}
                highlight
                highlightColor="green"
              />
            </Grid.Col>
            <Grid.Col xs={12}>
              <InfoItem 
                icon={<IconCalendar size="1.2rem" color="#2b8a3e" />}
                label="Fecha de Registro"
                value={new Date(cliente.created_at).toLocaleDateString("es-ES", {
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

        {/* Customer Stats Card */}
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Title order={4} mb="md">Información del Cliente</Title>
          <Grid>
            <Grid.Col xs={12} sm={6}>
              <Paper p="md" withBorder radius="md" bg="gray.0">
                <Flex direction="column" align="center" justify="center" py="md">
                  <IconCalendar size={24} color="#2b8a3e" />
                  <Text size="sm" color="dimmed" mt="xs">Cliente desde</Text>
                  <Text size="md" weight={600}>
                    {new Date(cliente.created_at).toLocaleDateString("es-ES", {
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                </Flex>
              </Paper>
            </Grid.Col>
            <Grid.Col xs={12} sm={6}>
              <Paper p="md" withBorder radius="md" bg="green.0">
                <Flex direction="column" align="center" justify="center" py="md">
                  <IconUserCircle size={24} color="#2b8a3e" />
                  <Text size="sm" color="dimmed" mt="xs">Estado</Text>
                  <Badge color="green" size="lg" variant="light" mt="xs">
                    Activo
                  </Badge>
                </Flex>
              </Paper>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Contact Information Card - Can be expanded with more customer details */}
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Title order={4} mb="md">Datos de Contacto</Title>
          <Paper p="md" withBorder radius="md" bg="gray.0">
            <Flex direction="column" align="center" justify="center" py="md">
              <IconUser size={32} color="#2b8a3e" />
              <Text size="lg" weight={600} mt="md" align="center">
                {cliente.Nombre}
              </Text>
              <Text color="dimmed" size="sm" align="center" mt="xs">
                Cliente #{cliente.IdCliente}
              </Text>
            </Flex>
          </Paper>
        </Card>
      </Flex>
    </Paper>
  );
}

// Helper component for displaying info items
function InfoItem({ icon, label, value, highlight = false, highlightColor = "blue" }: { icon: React.ReactNode; label: string; value: string | number; highlight?: boolean; highlightColor?: string }) {
  return (
    <Group position="apart" spacing="xs">
      <Group spacing="xs">
        {icon}
        <Text weight={600} color="dimmed" size="sm">{label}:</Text>
      </Group>
      <Text 
        weight={highlight ? 700 : 500} 
        color={highlight ? highlightColor : "dark"}
        size={highlight ? "md" : "sm"}
      >
        {value}
      </Text>
    </Group>
  );
}
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { obtenerProductoPorId } from "../services/ProductoService";
import { 
  ActionIcon, 
  Flex, 
  Text, 
  Paper, 
  Title, 
  Group, 
  Badge, 
  Divider, 
  Grid, 
  Skeleton,
  Box,
  Card,
  Avatar
} from "@mantine/core";
import { 
  IconArrowLeft, 
  IconTruckDelivery, 
  IconBarcode, 
  IconCategory, 
  IconRuler, 
  IconCoin, 
  IconShoppingCart, 
  IconPackage, 
  IconCalendar 
} from "@tabler/icons-react";

export function DetallesProducto() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [producto, setProducto] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const obtenerProducto = async () => {
      if (id) {
        try {
          setLoading(true);
          const data = await obtenerProductoPorId(parseInt(id));
          setProducto(data);
        } catch (error) {
          console.log(error);
        } finally {
          setLoading(false);
        }
      }
    };
    obtenerProducto();
  }, [id]);

  const formatCurrency = (value: number) => {
    return `$ ${value.toFixed(2)} MXN`;
  };

  if (loading) {
    return (
      <Paper shadow="xs" p="xl" radius="md" w="100%" h="100%">
        <Flex direction="column" gap="md">
          <Skeleton height={40} width="50%" mb="md" />
          <Skeleton height={25} width="70%" mb="sm" />
          <Skeleton height={25} width="60%" mb="sm" />
          <Skeleton height={25} width="80%" mb="sm" />
          <Skeleton height={25} width="40%" mb="sm" />
          <Skeleton height={25} width="65%" mb="sm" />
          <Skeleton height={25} width="55%" mb="sm" />
        </Flex>
      </Paper>
    );
  }

  if (!producto) {
    return (
      <Paper shadow="xs" p="xl" radius="md" w="100%" h="100%" withBorder>
        <Flex align="center" justify="center" direction="column" gap="md">
          <IconPackage size={48} color="gray" />
          <Text size="lg" color="dimmed">Producto no encontrado</Text>
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
              Detalle de Producto
            </Title>
          </Group>
          <Badge 
            size="lg" 
            color={producto.Stock > 10 ? "green" : "red"} 
            variant="filled"
            leftSection={<IconPackage size={14} />}
          >
            Stock: {producto.Stock}
          </Badge>
        </Flex>

        <Divider />

        {/* Product Info Card */}
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Card.Section p="md" bg="blue.0">
            <Group position="apart">
              <Group>
                <Avatar 
                  size={60} 
                  radius="md" 
                  color="blue"
                >
                  {producto.Codigo.substring(0, 2)}
                </Avatar>
                <Box>
                  <Text size="xl" weight={700}>{producto.Descripcion}</Text>
                  <Badge color="teal" variant="light" size="sm">
                    {producto.Categoria}
                  </Badge>
                </Box>
              </Group>
              <Badge 
                size="lg" 
                color="blue" 
                variant="outline"
                leftSection={<IconBarcode size={14} />}
              >
                {producto.Codigo}
              </Badge>
            </Group>
          </Card.Section>

          <Grid mt="xl" gutter="xl">
            <Grid.Col xs={12} sm={6}>
              <InfoItem 
                icon={<IconCategory size="1.2rem" color="#228be6" />}
                label="Categoría"
                value={producto.Categoria}
              />
            </Grid.Col>
            <Grid.Col xs={12} sm={6}>
              <InfoItem 
                icon={<IconRuler size="1.2rem" color="#228be6" />}
                label="Medida"
                value={producto.Medida}
              />
            </Grid.Col>
            <Grid.Col xs={12} sm={6}>
              <InfoItem 
                icon={<IconCoin size="1.2rem" color="#228be6" />}
                label="Precio de Compra"
                value={formatCurrency(producto.PrecioCompra)}
                highlight
              />
            </Grid.Col>
            <Grid.Col xs={12} sm={6}>
              <InfoItem 
                icon={<IconShoppingCart size="1.2rem" color="#228be6" />}
                label="Precio de Venta"
                value={formatCurrency(producto.PrecioVenta)}
                highlight
              />
            </Grid.Col>
            <Grid.Col xs={12}>
              <InfoItem 
                icon={<IconCalendar size="1.2rem" color="#228be6" />}
                label="Fecha de Creación"
                value={producto.created_at &&
                  new Date(producto.created_at).toLocaleDateString("es-ES", {
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

        {/* Price Comparison
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Title order={4} mb="md">Análisis de Precios</Title>
          <Grid>
            <Grid.Col span={6}>
              <Paper p="md" withBorder radius="md" bg="gray.0">
                <Flex direction="column" align="center">
                  <Text size="sm" color="dimmed">Precio de Compra</Text>
                  <Text size="xl" weight={700} color="dark">
                    {formatCurrency(producto.PrecioCompra)}
                  </Text>
                </Flex>
              </Paper>
            </Grid.Col>
            <Grid.Col span={6}>
              <Paper p="md" withBorder radius="md" bg="blue.0">
                <Flex direction="column" align="center">
                  <Text size="sm" color="dimmed">Precio de Venta</Text>
                  <Text size="xl" weight={700} color="blue">
                    {formatCurrency(producto.PrecioVenta)}
                  </Text>
                </Flex>
              </Paper>
            </Grid.Col>
            <Grid.Col span={12}>
              <Paper p="md" withBorder radius="md" bg="green.0">
                <Flex direction="column" align="center">
                  <Text size="sm" color="dimmed">Margen de Ganancia</Text>
                  <Group spacing="xs">
                    <Text size="xl" weight={700} color="green">
                      {formatCurrency(producto.PrecioVenta - producto.PrecioCompra)}
                    </Text>
                    <Badge color="green" variant="light">
                      {((producto.PrecioVenta - producto.PrecioCompra) / producto.PrecioCompra * 100).toFixed(2)}%
                    </Badge>
                  </Group>
                </Flex>
              </Paper>
            </Grid.Col>
          </Grid>
        </Card> */}
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
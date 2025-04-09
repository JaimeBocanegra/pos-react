// Inicio.tsx - Improved main dashboard
import { useState, useEffect } from "react";
import {
  AppShell,
  Avatar,
  Burger,
  Button,
  Group,
  Header,
  MediaQuery,
  Navbar,
  NavLink,
  TextInput,
  FileInput,
  Stack,
  Title,
  Paper,
  Container,
  Text,
  Image,
  MantineProvider,
  LoadingOverlay,
  Alert,
  Box,
  Divider,
  useMantineTheme,
  Badge,
  Tooltip,
  ActionIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  IconUsers,
  IconBuildingStore,
  IconPackage,
  IconShoppingBagPlus,
  IconTruckDelivery,
  IconReport,
  IconSettings,
  IconLogout,
  IconUpload,
  IconAlertCircle,
  IconHome,
  IconBuildingSkyscraper,
  IconPhone,
  IconMapPin,
  IconFileDescription,
  IconCheck,
  IconEdit,
  IconDashboard,
  IconArrowLeft,
} from "@tabler/icons-react";
import { supabase } from "../../supabase/client";

function RegistroEmpresaForm({
  onSubmit,
  empresaData,
  onCancel,
}: { 
  onSubmit: (values: any) => Promise<void>; 
  empresaData?: any;
  onCancel?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const theme = useMantineTheme();

  // Inicializar el formulario con los datos existentes si están disponibles
  const form = useForm({
    initialValues: {
      nombre: empresaData?.nombre || "",
      rfc: empresaData?.rfc || "",
      direccion: empresaData?.direccion || "",
      telefono: empresaData?.telefono || "",
      logo: null as File | null,
    },
    validate: {
      nombre: (value) => (value.length < 2 ? "El nombre debe tener al menos 2 caracteres" : null),
      rfc: (value) =>
        /^([A-ZÑ&]{3,4})(\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01]))([A-Z\d]{2})([A\d])$/.test(value)
          ? null
          : "RFC inválido",
      direccion: (value) => (value.length < 5 ? "La dirección debe tener al menos 5 caracteres" : null),
      telefono: (value) => (/^\d{10}$/.test(value) ? null : "El teléfono debe tener 10 dígitos"),
    },
  });

  // Establecer la vista previa del logo existente si hay datos de empresa
  useEffect(() => {
    if (empresaData?.logo) {
      setPreviewUrl(empresaData.logo);
    }
  }, [empresaData]);

  // Crear una vista previa cuando se selecciona un archivo
  useEffect(() => {
    const file = form.values.logo;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [form.values.logo]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      setLoading(true);
      setError(null);
      await onSubmit(values);
    } catch (err) {
      console.error("Error al enviar el formulario:", err);
      setError(err instanceof Error ? err.message : "Error al registrar la empresa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper shadow="sm" p="xl" radius="md" pos="relative" withBorder>
      <LoadingOverlay visible={loading} overlayBlur={2} />
      
      <Group position="apart" mb="xl">
        <Title order={2} color={theme.colors.blue[7]}>
          {empresaData ? "Editar Información de Empresa" : "Registro de Empresa"}
        </Title>
        <IconBuildingSkyscraper size={32} color={theme.colors.blue[6]} />
      </Group>

      <Divider mb="xl" />

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" mb="xl" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack spacing="lg">
          <Group grow align="flex-start">
            <Box>
              <TextInput
                required
                label="Nombre de la empresa"
                placeholder="Ingrese el nombre de la empresa"
                icon={<IconBuildingStore size={16} />}
                {...form.getInputProps("nombre")}
                size="md"
                radius="md"
              />
              
              <TextInput 
                required 
                label="RFC" 
                placeholder="Ingrese el RFC de la empresa" 
                icon={<IconFileDescription size={16} />}
                {...form.getInputProps("rfc")} 
                mt="md"
                size="md"
                radius="md"
              />
            </Box>
            
            <Box>
              <TextInput
                required
                label="Dirección"
                placeholder="Ingrese la dirección de la empresa"
                icon={<IconMapPin size={16} />}
                {...form.getInputProps("direccion")}
                size="md"
                radius="md"
              />
              
              <TextInput
                required
                label="Teléfono"
                placeholder="Ingrese el teléfono de la empresa"
                icon={<IconPhone size={16} />}
                {...form.getInputProps("telefono")}
                type="number"
                mt="md"
                size="md"
                radius="md"
              />
            </Box>
          </Group>

          <Divider label="Logo de la empresa" labelPosition="center" />

          <Group position="center" spacing="xl">
            <Box sx={{ width: '200px' }}>
              <FileInput
                label="Seleccionar logo"
                accept="image/*"
                icon={<IconUpload size={14} />}
                {...form.getInputProps("logo")}
                clearable
                size="md"
                radius="md"
              />
            </Box>

            <Paper p="md" radius="md" withBorder sx={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {previewUrl ? (
                <Image
                  src={previewUrl || "/placeholder.svg"}
                  alt="Vista previa del logo"
                  width={180}
                  height={180}
                  fit="contain"
                  withPlaceholder
                  placeholder={<IconBuildingSkyscraper size={80} color={theme.colors.gray[3]} />}
                />
              ) : (
                <Box sx={{ textAlign: 'center' }}>
                  <IconBuildingSkyscraper size={80} color={theme.colors.gray[3]} />
                  <Text color="dimmed" size="sm" mt="xs">Vista previa del logo</Text>
                </Box>
              )}
            </Paper>
          </Group>

          <Group position="right" mt="xl" spacing="md">
            {empresaData && (
              <Button 
                variant="outline" 
                color="gray" 
                onClick={onCancel} 
                size="md"
                radius="md"
              >
                Cancelar
              </Button>
            )}
            <Button 
              type="submit" 
              loading={loading} 
              size="md"
              radius="md"
              leftIcon={<IconCheck size={16} />}
            >
              {empresaData ? "Actualizar empresa" : "Registrar empresa"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}

function DatosEmpresa({ empresa, onEdit }: { empresa: any; onEdit: () => void }) {
  const theme = useMantineTheme();
  
  return (
    <Paper shadow="sm" p="xl" radius="md" withBorder>
      <Group position="apart" mb="md">
        <Title order={2} color={theme.colors.blue[7]}>
          Información de la Empresa
        </Title>
        <Tooltip label="Editar información">
          <ActionIcon color="blue" variant="light" onClick={onEdit} size="lg" radius="md">
            <IconEdit size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>
      
      <Divider mb="xl" />
      
      <Group position="apart" align="flex-start">
        <Stack spacing="lg" sx={{ flex: 1 }}>
          <Group spacing="md">
            <IconBuildingStore size={20} color={theme.colors.blue[6]} />
            <Box>
              <Text size="xs" color="dimmed">Nombre de la Empresa</Text>
              <Text weight={600} size="lg">{empresa.nombre}</Text>
            </Box>
          </Group>
          
          <Group spacing="md">
            <IconFileDescription size={20} color={theme.colors.blue[6]} />
            <Box>
              <Text size="xs" color="dimmed">RFC</Text>
              <Text weight={600}>{empresa.rfc}</Text>
            </Box>
          </Group>
          
          <Group spacing="md">
            <IconMapPin size={20} color={theme.colors.blue[6]} />
            <Box>
              <Text size="xs" color="dimmed">Dirección</Text>
              <Text weight={600}>{empresa.direccion}</Text>
            </Box>
          </Group>
          
          <Group spacing="md">
            <IconPhone size={20} color={theme.colors.blue[6]} />
            <Box>
              <Text size="xs" color="dimmed">Teléfono</Text>
              <Text weight={600}>{empresa.telefono}</Text>
            </Box>
          </Group>
        </Stack>
        
        <Paper p="lg" radius="md" withBorder sx={{ width: '250px', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {empresa.logo ? (
            <Image
              src={empresa.logo || "/placeholder.svg"}
              alt="Logo de la empresa"
              width={220}
              height={220}
              fit="contain"
              withPlaceholder
              placeholder={<IconBuildingSkyscraper size={80} color={theme.colors.gray[3]} />}
            />
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <IconBuildingSkyscraper size={80} color={theme.colors.gray[3]} />
              <Text color="dimmed" size="sm" mt="xs">Sin logo</Text>
            </Box>
          )}
        </Paper>
      </Group>
      
      <Box mt="xl">
        <Badge size="lg" color="blue" variant="filled">
          Empresa Registrada
        </Badge>
      </Box>
    </Paper>
  );
}

export function Inicio() {
  const [opened, setOpened] = useState(false);
  const [empresa, setEmpresa] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useMantineTheme();

  const cargarDatosEmpresa = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.from("empresas").select("*").limit(1);

      if (error && error.code !== "PGRST116") {
        console.error("Error al cargar datos de empresa:", error);
        setError("Error al cargar datos de la empresa");
      }

      if (data && data.length > 0) {
        setEmpresa(data[0]);
      }
    } catch (err) {
      console.error("Error inesperado:", err);
      setError("Error inesperado al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosEmpresa();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleRegistroEmpresa = async (values: any) => {
    try {
      // Primero subimos el logo si existe
      let logoUrl = null;
      if (values.logo) {
        // Generar nombre único para el archivo
        const fileExt = values.logo.name.split(".").pop();
        const fileName = `logo_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Subir el archivo
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("empresas")
          .upload(filePath, values.logo, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Error al subir logo: ${uploadError.message}`);
        }

        // Obtener URL pública
        const { data } = supabase.storage.from("empresas").getPublicUrl(filePath);

        logoUrl = data.publicUrl;
      } else if (empresa?.logo && editMode) {
        // Mantener el logo existente si estamos en modo edición
        logoUrl = empresa.logo;
      }

      // Preparamos los datos para guardar
      const empresaData = {
        nombre: values.nombre,
        rfc: values.rfc,
        direccion: values.direccion,
        telefono: values.telefono,
        logo: logoUrl,
      };

      let result;
      if (empresa?.id_empresa) {
        // Si existe, actualizamos
        const { data: updatedData, error: updateError } = await supabase
          .from("empresas")
          .update(empresaData)
          .eq("id_empresa", empresa.id_empresa)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Error al actualizar empresa: ${updateError.message}`);
        }

        result = updatedData;
      } else {
        // Si no existe, insertamos
        const { data: insertedData, error: insertError } = await supabase
          .from("empresas")
          .insert([empresaData])
          .select()
          .single();

        if (insertError) {
          throw new Error(`Error al insertar empresa: ${insertError.message}`);
        }

        result = insertedData;
      }

      // Actualizamos el estado para mostrar los datos en lugar del formulario
      setEmpresa(result);
      setEditMode(false);
    } catch (err) {
      throw err;
    }
  };

  const handleEditClick = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
  };

  const collections = [
    { icono: <IconDashboard size={20} />, label: "Inicio", link: "/" },
    { icono: <IconUsers size={20} />, label: "Clientes", link: "/clientes" },
    { icono: <IconTruckDelivery size={20} />, label: "Proveedores", link: "/proveedores" },
    { icono: <IconPackage size={20} />, label: "Productos", link: "/productos" },
    { icono: <IconShoppingBagPlus size={20} />, label: "Compras", link: "/compras" },
    { icono: <IconBuildingStore size={20} />, label: "Ventas", link: "/ventas" },
    { icono: <IconReport size={20} />, label: "Reportes", link: "/reportes" },
    { icono: <IconSettings size={20} />, label: "Configuraciones", link: "/configuraciones" },
  ];

  const handleLinkClick = () => {
    setOpened(false);
  };

  const collectionLinks = collections.map((item, index) => (
    <NavLink
      key={index}
      label={item.label}
      icon={item.icono}
      component={Link}
      to={item.link}
      variant="light"
      color="blue"
      active={location.pathname === item.link || (item.link !== "/" && location.pathname.startsWith(item.link))}
      onClick={handleLinkClick}
      sx={(theme) => ({
        borderRadius: theme.radius.md,
        marginBottom: 4,
        fontWeight: 500
      })}
    />
  ));

  const isHomePage = location.pathname === "/";

  const renderContent = () => {
    if (loading) {
      return (
        <Paper shadow="xs" p="xl" radius="md" withBorder>
          <LoadingOverlay visible={true} overlayBlur={2} />
          <div style={{ height: "300px" }}></div>
        </Paper>
      );
    }

    if (error) {
      return (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" withCloseButton onClose={() => setError(null)}>
          {error}
          <Button onClick={cargarDatosEmpresa} mt="md" variant="outline">
            Reintentar
          </Button>
        </Alert>
      );
    }

    if (editMode) {
      // Pasar los datos de la empresa al formulario cuando está en modo edición
      return <RegistroEmpresaForm onSubmit={handleRegistroEmpresa} empresaData={empresa} onCancel={handleCancelEdit} />;
    }

    if (!empresa) {
      // Si no hay empresa, mostrar el formulario de registro sin datos
      return <RegistroEmpresaForm onSubmit={handleRegistroEmpresa} />;
    }

    return <DatosEmpresa empresa={empresa} onEdit={handleEditClick} />;
  };

  return (
    <MantineProvider withGlobalStyles withNormalizeCSS theme={{ colorScheme: 'light', primaryColor: 'blue' }}>
      <AppShell
        navbarOffsetBreakpoint="sm"
        asideOffsetBreakpoint="sm"
        navbar={
          <Navbar p="md" hiddenBreakpoint="sm" hidden={!opened} width={{ sm: 250, lg: 300 }} sx={{ boxShadow: theme.shadows.sm }}>
            {/* <Navbar.Section mb="lg">
              <Group position="apart" mb="md">
                <Title order={3} color={theme.colors.blue[7]}>POS React</Title>
                <MediaQuery largerThan="sm" styles={{ display: "none" }}>
                  <ActionIcon onClick={() => setOpened(false)} variant="light">
                    <IconArrowLeft size={18} />
                  </ActionIcon>
                </MediaQuery>
              </Group>
              <Divider />
            </Navbar.Section> */}
            
            <Navbar.Section grow>
              {collectionLinks}
            </Navbar.Section>
            
            <Navbar.Section>
              <Divider my="md" />
              <Group position="apart">
                <Group>
                  <Avatar radius="xl" size="md" color="blue" />
                  <Box>
                    <Text size="sm" weight={500}>Administrador</Text>
                    <Text size="xs" color="dimmed">admin@sistema.com</Text>
                  </Box>
                </Group>
                <ActionIcon color="red" variant="light" onClick={handleLogout} title="Cerrar sesión">
                  <IconLogout size={18} />
                </ActionIcon>
              </Group>
            </Navbar.Section>
          </Navbar>
        }
        header={
          <Header height={70} p="md" sx={{ boxShadow: theme.shadows.sm }}>
            <Group position="apart" sx={{ height: "100%" }}>
              <Group>
                <MediaQuery largerThan="sm" styles={{ display: "none" }}>
                  <Burger opened={opened} onClick={() => setOpened((o) => !o)} size="sm" />
                </MediaQuery>
                <MediaQuery smallerThan="sm" styles={{ fontSize: "1.2rem" }}>
                  <Title order={3} color={theme.colors.blue[7]}>POS React</Title>
                </MediaQuery>
              </Group>
              
              <Group>
                <MediaQuery smallerThan="sm" styles={{ display: "none" }}>
                  <Text>Bienvenido al Sistema</Text>
                </MediaQuery>
                <Button 
                  variant="light" 
                  color="red" 
                  leftIcon={<IconLogout size={16} />} 
                  onClick={handleLogout}
                  radius="md"
                >
                  <MediaQuery smallerThan="sm" styles={{ display: "none" }}>
                    <span>Cerrar Sesión</span>
                  </MediaQuery>
                </Button>
              </Group>
            </Group>
          </Header>
        }
      >
        <Container size="xl" py="xl">
          {isHomePage ? renderContent() : <Outlet />}
        </Container>
      </AppShell>
    </MantineProvider>
  );
}
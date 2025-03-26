import { useState, useEffect } from "react"
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
} from "@mantine/core"
import { useForm } from "@mantine/form"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
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
} from "@tabler/icons-react"
import { supabase } from "../../supabase/client"

function RegistroEmpresaForm({
  onSubmit,
  empresaData,
}: { onSubmit: (values: any) => Promise<void>; empresaData?: any }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

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
  })

  // Establecer la vista previa del logo existente si hay datos de empresa
  useEffect(() => {
    if (empresaData?.logo) {
      setPreviewUrl(empresaData.logo)
    }
  }, [empresaData])

  // Crear una vista previa cuando se selecciona un archivo
  useEffect(() => {
    const file = form.values.logo
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [form.values.logo])

  const handleSubmit = async (values: typeof form.values) => {
    try {
      setLoading(true)
      setError(null)
      await onSubmit(values)
    } catch (err) {
      console.error("Error al enviar el formulario:", err)
      setError(err instanceof Error ? err.message : "Error al registrar la empresa")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper shadow="xs" p="md" pos="relative">
      <LoadingOverlay visible={loading} />
      <Title order={2} align="center" mb="md">
        {empresaData ? "Editar Empresa" : "Registro de Empresa"}
      </Title>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" mb="md">
          {error}
        </Alert>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack spacing="md">
          <TextInput
            required
            label="Nombre de la empresa"
            placeholder="Ingrese el nombre de la empresa"
            {...form.getInputProps("nombre")}
          />
          <TextInput required label="RFC" placeholder="Ingrese el RFC de la empresa" {...form.getInputProps("rfc")} />
          <TextInput
            required
            label="Dirección"
            placeholder="Ingrese la dirección de la empresa"
            {...form.getInputProps("direccion")}
          />
          <TextInput
            required
            label="Teléfono"
            placeholder="Ingrese el teléfono de la empresa"
            {...form.getInputProps("telefono")}
            type="number"
          />

          <FileInput
            label="Logo de la empresa"
            accept="image/*"
            icon={<IconUpload size={14} />}
            {...form.getInputProps("logo")}
            clearable
          />

          {previewUrl && (
            <div className="text-center">
              <p className="mb-2">Vista previa:</p>
              <Image
                src={previewUrl || "/placeholder.svg"}
                alt="Vista previa del logo"
                width={150}
                height={150}
                fit="contain"
                mx="auto"
                radius="md"
                withPlaceholder
              />
            </div>
          )}

          <Button type="submit" loading={loading} fullWidth>
            {empresaData ? "Actualizar empresa" : "Registrar empresa"}
          </Button>

          {empresaData && (
            <Button variant="outline" color="gray" onClick={() => window.location.reload()} fullWidth>
              Cancelar
            </Button>
          )}
        </Stack>
      </form>
    </Paper>
  )
}

function DatosEmpresa({ empresa, onEdit }: { empresa: any; onEdit: () => void }) {
  return (
    <Paper shadow="xs" p="md">
      <Title order={2} align="center" mb="md">
        Datos de la Empresa
      </Title>
      <Stack spacing="md">
        {empresa.logo && (
          <div className="text-center">
            <Image
              src={empresa.logo || "/placeholder.svg"}
              alt="Logo de la empresa"
              width={200}
              height={200}
              fit="contain"
              mx="auto"
              radius="md"
              withPlaceholder
            />
          </div>
        )}
        <Group>
          <Text weight={700}>Nombre:</Text>
          <Text>{empresa.nombre}</Text>
        </Group>
        <Group>
          <Text weight={700}>RFC:</Text>
          <Text>{empresa.rfc}</Text>
        </Group>
        <Group>
          <Text weight={700}>Dirección:</Text>
          <Text>{empresa.direccion}</Text>
        </Group>
        <Group>
          <Text weight={700}>Teléfono:</Text>
          <Text>{empresa.telefono}</Text>
        </Group>
        <Button onClick={onEdit} fullWidth mt="md">
          Editar información
        </Button>
      </Stack>
    </Paper>
  )
}

export function Inicio() {
  const [opened, setOpened] = useState(false)
  const [empresa, setEmpresa] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  const cargarDatosEmpresa = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.from("empresas").select("*").single()

      if (error && error.code !== "PGRST116") {
        console.error("Error al cargar datos de empresa:", error)
        setError("Error al cargar datos de la empresa")
      }

      if (data) {
        console.log("Datos de empresa cargados:", data)
        setEmpresa(data)
      }
    } catch (err) {
      console.error("Error inesperado:", err)
      setError("Error inesperado al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatosEmpresa()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  const handleRegistroEmpresa = async (values: any) => {
    try {
      console.log("Iniciando registro/actualización de empresa con valores:", values)

      // Primero subimos el logo si existe
      let logoUrl = null
      if (values.logo) {
        // Generar nombre único para el archivo
        const fileExt = values.logo.name.split(".").pop()
        const fileName = `logo_${Date.now()}.${fileExt}`
        const filePath = `${fileName}`

        console.log(`Subiendo archivo a: empresas/${filePath}`)

        // Subir el archivo
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("empresas")
          .upload(filePath, values.logo, {
            cacheControl: "3600",
            upsert: true,
          })

        if (uploadError) {
          throw new Error(`Error al subir logo: ${uploadError.message}`)
        }

        console.log("Archivo subido exitosamente:", uploadData)

        // Obtener URL pública
        const { data } = supabase.storage.from("empresas").getPublicUrl(filePath)

        logoUrl = data.publicUrl
        console.log("URL pública del logo:", logoUrl)
      } else if (empresa?.logo && editMode) {
        // Mantener el logo existente si estamos en modo edición
        logoUrl = empresa.logo
      }

      // Preparamos los datos para guardar
      const empresaData = {
        nombre: values.nombre,
        rfc: values.rfc,
        direccion: values.direccion,
        telefono: values.telefono,
        logo: logoUrl,
      }

      console.log("Datos a guardar:", empresaData)

      let result
      if (empresa?.id) {
        // Si existe, actualizamos
        console.log(`Actualizando empresa con ID: ${empresa.id}`)
        const { data: updatedData, error: updateError } = await supabase
          .from("empresas")
          .update(empresaData)
          .eq("id", empresa.id)
          .select()
          .single()

        if (updateError) {
          throw new Error(`Error al actualizar empresa: ${updateError.message}`)
        }

        console.log("Empresa actualizada:", updatedData)
        result = updatedData
      } else {
        // Si no existe, insertamos
        console.log("Insertando nueva empresa")
        const { data: insertedData, error: insertError } = await supabase
          .from("empresas")
          .insert([empresaData])
          .select()
          .single()

        if (insertError) {
          throw new Error(`Error al insertar empresa: ${insertError.message}`)
        }

        console.log("Nueva empresa insertada:", insertedData)
        result = insertedData
      }

      // Actualizamos el estado para mostrar los datos en lugar del formulario
      setEmpresa(result)
      setEditMode(false)
      console.log("Operación completada exitosamente")
    } catch (err) {
      console.error("Error al registrar/actualizar la empresa:", err)
      throw err
    }
  }

  const handleEditClick = () => {
    setEditMode(true)
  }

  const collections = [
    { icono: <IconUsers />, label: "Clientes", link: "/clientes" },
    { icono: <IconTruckDelivery />, label: "Proveedores", link: "/proveedor" },
    { icono: <IconPackage />, label: "Productos", link: "/productos" },
    { icono: <IconShoppingBagPlus />, label: "Compras", link: "/compras" },
    { icono: <IconBuildingStore />, label: "Ventas", link: "/ventas" },
    { icono: <IconReport />, label: "Reportes", link: "/reportes" },
    { icono: <IconSettings />, label: "Configuraciones", link: "/configuraciones" },
  ]

  const handleLinkClick = () => {
    setOpened(false)
  }

  const collectionLinks = collections.map((item, index) => (
    <NavLink
      key={index}
      label={item.label}
      icon={item.icono}
      component={Link}
      to={item.link}
      variant="filled"
      color="indigo"
      active={location.pathname.startsWith(item.link)}
      onClick={handleLinkClick}
    />
  ))

  const isHomePage = location.pathname === "/"

  const renderContent = () => {
    if (loading) {
      return (
        <Paper shadow="xs" p="md">
          <LoadingOverlay visible={true} />
          <div style={{ height: "200px" }}></div>
        </Paper>
      )
    }

    if (error) {
      return (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red">
          {error}
          <Button onClick={cargarDatosEmpresa} mt="md" variant="outline">
            Reintentar
          </Button>
        </Alert>
      )
    }

    if (editMode) {
      // Pasar los datos de la empresa al formulario cuando está en modo edición
      return <RegistroEmpresaForm onSubmit={handleRegistroEmpresa} empresaData={empresa} />
    }

    if (!empresa) {
      // Si no hay empresa, mostrar el formulario de registro sin datos
      return <RegistroEmpresaForm onSubmit={handleRegistroEmpresa} />
    }

    return <DatosEmpresa empresa={empresa} onEdit={handleEditClick} />
  }

  return (
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <AppShell
        navbarOffsetBreakpoint="sm"
        asideOffsetBreakpoint="sm"
        navbar={
          <Navbar p="md" hiddenBreakpoint="sm" hidden={!opened} width={{ sm: 200, lg: 300 }}>
            {collectionLinks}
          </Navbar>
        }
        header={
          <Header height={80} px={10}>
            <Group position="apart" align="center" sx={{ height: "100%" }}>
              <MediaQuery largerThan="sm" styles={{ display: "none" }}>
                <Burger opened={opened} onClick={() => setOpened((o) => !o)} size="sm" mr="xl" />
              </MediaQuery>
              <MediaQuery smallerThan="sm" styles={{ fontSize: "1rem" }}>
                <h1>POS React</h1>
              </MediaQuery>
              <Group>
                <Avatar src="ruta_a_la_foto_de_usuario" alt="Usuario" radius="xl" size="md" />
                <MediaQuery smallerThan="sm" styles={{ fontSize: "0.8rem", padding: "0.5rem" }}>
                  <Button variant="filled" color="red" leftIcon={<IconLogout />} onClick={handleLogout}>
                    <MediaQuery smallerThan="sm" styles={{ display: "none" }}>
                      <span>Cerrar Sesión</span>
                    </MediaQuery>
                  </Button>
                </MediaQuery>
              </Group>
            </Group>
          </Header>
        }
      >
        <Container size="lg" py="xl">
          {isHomePage ? renderContent() : <Outlet />}
        </Container>
      </AppShell>
    </MantineProvider>
  )
}


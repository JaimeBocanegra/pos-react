"use client"

import { 
  Button,
  Flex,
  TextInput,
  Select,
  Textarea,
  Switch,
  NumberInput,
  ActionIcon,
  Paper,
  Title,
  Group,
  Box,
  Text,
  Alert,
  LoadingOverlay,
  PasswordInput,
  Tooltip,
  Badge,
} from "@mantine/core"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { 
  IconArrowLeft,
  IconAlertCircle,
  IconDeviceFloppy,
  IconLock,
  IconEye,
  IconEyeOff,
  IconKey,
  IconShieldLock,
} from "@tabler/icons-react"
import { ConfiguracionService } from "../services/ConfiguracionService"
import Swal from "sweetalert2"

export default function NewConfiguracion() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    clave: '',
    valor: '',
    tipo: 'texto',
    descripcion: '',
    categoria: 'general',
    editable: true,
    requiere_permiso: 'admin'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSensitive, setIsSensitive] = useState(false)

  // Determinar si una configuración es sensible
  const checkSensitiveConfig = (clave: string, tipo: string) => {
    return tipo === 'password' || 
           clave.toLowerCase().includes('password') || 
           clave.toLowerCase().includes('clave') ||
           clave.toLowerCase().includes('secret')
  }

  // Manejar cambios en el formulario
  const handleChange = (field: string, value: any) => {
    const updatedForm = {
      ...form,
      [field]: value
    }
    
    // Verificar si es una configuración sensible al cambiar clave o tipo
    if (field === 'clave' || field === 'tipo') {
      setIsSensitive(checkSensitiveConfig(
        field === 'clave' ? value : form.clave,
        field === 'tipo' ? value : form.tipo
      ))
    }
    
    setForm(updatedForm)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validación básica
    if (!form.clave.trim()) {
      setError("La clave es requerida")
      return
    }

    if (!form.valor && form.tipo !== 'booleano') {
      setError("El valor es requerido")
      return
    }

    // Validar categoría
    const categoriasPermitidas = ['general', 'seguridad', 'inventario', 'ventas', 'sistema']
    if (!categoriasPermitidas.includes(form.categoria)) {
      setError(`Categoría no válida. Use una de: ${categoriasPermitidas.join(', ')}`)
      return
    }

    setLoading(true)

    try {
      await ConfiguracionService.create(form)
      
      await Swal.fire({
        icon: 'success',
        title: '¡Configuración creada!',
        text: 'La nueva configuración se ha guardado correctamente',
        showConfirmButton: false,
        timer: 1500
      })
      
      navigate('/configuraciones')
    } catch (error: any) {
      console.error("Error al crear configuración:", error)
      let mensajeError = error.message || "Ocurrió un error al crear la configuración"
      
      // Manejar específicamente el error de restricción
      if (error.message.includes('violates check constraint')) {
        mensajeError = "Datos no válidos. Verifique los valores ingresados."
      }
      
      setError(mensajeError)
    } finally {
      setLoading(false)
    }
  }

  // Opciones para selects
  const tipos = [
    { value: 'texto', label: 'Texto' },
    { value: 'entero', label: 'Número entero' },
    { value: 'decimal', label: 'Número decimal' },
    { value: 'booleano', label: 'Booleano (Sí/No)' },
    { value: 'password', label: 'Contraseña' },
  ]

  const categorias = [
    { value: 'general', label: 'General' },
    { value: 'seguridad', label: 'Seguridad' },
    { value: 'inventario', label: 'Inventario' },
    { value: 'ventas', label: 'Ventas' },
    { value: 'sistema', label: 'Sistema' },
  ]

  const permisos = [
    { value: 'admin', label: 'Administrador' },
    { value: 'manager', label: 'Gerente' },
    { value: 'user', label: 'Usuario' },
  ]

  return (
    <Paper shadow="xs" p="xl" radius="md" w="100%" h="100%">
      <form onSubmit={handleSubmit} style={{ height: "100%" }}>
        <Flex direction="column" h="100%" gap="xl">
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
              <Title
                order={2}
                sx={(theme) => ({
                  fontSize: "calc(1.1rem + 0.5vw)",
                  color: theme.colors.blue[7],
                })}
              >
                Nueva Configuración
                {isSensitive && (
                  <Badge ml="sm" color="red" leftSection={<IconShieldLock size={14} />}>
                    Sensible
                  </Badge>
                )}
              </Title>
            </Group>
          </Flex>

          {/* Form Content */}
          <Box
            sx={{
              maxWidth: "800px",
              width: "100%",
              margin: "0 auto",
              flex: 1,
              position: "relative",
            }}
          >
            <LoadingOverlay visible={loading} overlayBlur={2} />

            <Paper p="lg" radius="md" withBorder>
              <Title order={4} mb="md">
                Detalles de Configuración
              </Title>

              <Group grow mb="md">
                <TextInput
                  label="Clave"
                  placeholder="Nombre de la configuración"
                  value={form.clave}
                  onChange={(e) => handleChange("clave", e.target.value)}
                  required
                  size="md"
                  radius="md"
                  icon={isSensitive ? <IconShieldLock size={16} /> : null}
                />

                <Select
                  label="Tipo"
                  placeholder="Seleccione tipo"
                  data={tipos}
                  value={form.tipo}
                  onChange={(value) => handleChange("tipo", value || 'texto')}
                  size="md"
                  radius="md"
                  required
                />
              </Group>

              <Group grow mb="md">
                <Select
                  label="Categoría"
                  placeholder="Seleccione categoría"
                  data={categorias}
                  value={form.categoria}
                  onChange={(value) => handleChange("categoria", value || 'general')}
                  size="md"
                  radius="md"
                  required
                />

                <Select
                  label="Permiso requerido"
                  placeholder="Seleccione permiso"
                  data={permisos}
                  value={form.requiere_permiso}
                  onChange={(value) => handleChange("requiere_permiso", value || 'admin')}
                  size="md"
                  radius="md"
                />
              </Group>

              {form.tipo === 'booleano' ? (
                <Switch
                  label="Valor"
                  checked={form.valor === 'true'}
                  onChange={(e) => handleChange("valor", e.currentTarget.checked ? 'true' : 'false')}
                  size="md"
                  mt="md"
                  mb="md"
                />
              ) : form.tipo === 'entero' || form.tipo === 'decimal' ? (
                <NumberInput
                  label="Valor"
                  value={Number(form.valor) || 0}
                  onChange={(value) => handleChange("valor", value.toString())}
                  precision={form.tipo === 'decimal' ? 2 : 0}
                  size="md"
                  mb="md"
                />
              ) : form.tipo === 'password' ? (
                <PasswordInput
                  label="Valor"
                  value={form.valor}
                  onChange={(e) => handleChange("valor", e.target.value)}
                  size="md"
                  radius="md"
                  mb="md"
                  icon={<IconKey size={16} />}
                  visibilityToggleIcon={({ reveal }) =>
                    reveal ? (
                      <Tooltip label="Ocultar valor">
                        <IconEyeOff size={16} />
                      </Tooltip>
                    ) : (
                      <Tooltip label="Mostrar valor">
                        <IconEye size={16} />
                      </Tooltip>
                    )
                  }
                />
              ) : (
                <TextInput
                  label="Valor"
                  value={form.valor}
                  onChange={(e) => handleChange("valor", e.target.value)}
                  size="md"
                  radius="md"
                  mb="md"
                />
              )}

              <Textarea
                label="Descripción"
                placeholder="Descripción de la configuración"
                value={form.descripcion}
                onChange={(e) => handleChange("descripcion", e.target.value)}
                size="md"
                radius="md"
                mb="md"
                autosize
                minRows={2}
                maxRows={4}
              />

              <Switch
                label="Editable"
                checked={form.editable}
                onChange={(e) => handleChange("editable", e.currentTarget.checked)}
                size="md"
                mb="xl"
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
                  leftIcon={<IconDeviceFloppy size={16} />}
                >
                  Guardar Configuración
                </Button>
              </Group>
            </Paper>
          </Box>

          <Box>
            <Text align="center" size="sm" color="dimmed">
              Las configuraciones afectan el comportamiento del sistema.
            </Text>
          </Box>
        </Flex>
      </form>
    </Paper>
  )
}
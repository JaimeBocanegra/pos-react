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
  Modal,
  PasswordInput,
  Tooltip,
  Divider,
  Collapse,
  Badge,
} from "@mantine/core"
import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { 
  IconArrowLeft,
  IconAlertCircle,
  IconDeviceFloppy,
  IconLock,
  IconEye,
  IconEyeOff,
  IconKey,
  IconShieldLock,
  IconCheck,
  IconRefresh,
} from "@tabler/icons-react"
import { Configuracion, ConfiguracionService } from "../services/ConfiguracionService"
import Swal from "sweetalert2"
import { useDisclosure } from "@mantine/hooks"

export default function EditConfiguracion() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [configuracion, setConfiguracion] = useState<Configuracion | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState("")
  const [showClaveMaestra, setShowClaveMaestra] = useState(false)
  const [claveIngresada, setClaveIngresada] = useState("")
  const [claveCorrecta, setClaveCorrecta] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [isSensitive, setIsSensitive] = useState(false)
  const [isEditingPassword, setIsEditingPassword] = useState(false)
  const [openedChangeMaster, { toggle: toggleChangeMaster }] = useDisclosure(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  // Determinar si una configuración es sensible
  const isSensitiveConfig = (config: Configuracion) => {
    return config.tipo === 'password' || 
           config.clave.toLowerCase().includes('password') || 
           config.clave.toLowerCase().includes('clave') ||
           config.clave.toLowerCase().includes('secret')
  }

  // Determinar si es la configuración de clave maestra
  const isMasterKeyConfig = (config: Configuracion | null) => {
    return config?.clave.toLowerCase().includes('clave_maestra')
  }

  // Obtener datos de la configuración
  useEffect(() => {
    const loadConfiguracion = async () => {
      try {
        setFetching(true)
        const data = await ConfiguracionService.getById(Number(id))
        
        // Determinar si es sensible antes de setear el estado
        const sensitive = isSensitiveConfig(data)
        setIsSensitive(sensitive)
        
        // Si es sensible, enmascarar el valor
        if (sensitive) {
          data.valor = '••••••••'
        }
        
        setConfiguracion(data)
      } catch (error) {
        console.error("Error al obtener configuración:", error)
        setError("No se pudo cargar la configuración")
      } finally {
        setFetching(false)
      }
    }

    if (id) loadConfiguracion()
  }, [id])

  // Función para verificar la clave maestra
  const verificarClaveMaestra = async () => {
    try {
      const config = await ConfiguracionService.getByKey('clave_maestra_configuracion')
      
      if (!config) throw new Error("No se encontró la configuración")

      if (config.valor === claveIngresada) {
        setClaveCorrecta(true)
        setShowClaveMaestra(false)
        setClaveIngresada("")
        
        await Swal.fire({
          icon: 'success',
          title: 'Verificación exitosa',
          text: 'Ahora puedes editar la configuración sensible',
          showConfirmButton: false,
          timer: 1500
        })
        
        return true
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Clave incorrecta',
          text: 'La clave maestra ingresada no es válida',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Entendido'
        })
        return false
      }
    } catch (error) {
      console.error("Error al verificar clave maestra:", error)
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al verificar la clave maestra',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Entendido'
      })
      return false
    }
  }

  const handleChange = (field: keyof Configuracion, value: any) => {
    if (!configuracion) return
    
    // Si estamos editando un campo sensible y es la primera vez
    if (field === 'valor' && isSensitive && !isEditingPassword && value !== '••••••••') {
      setIsEditingPassword(true)
      setConfiguracion({
        ...configuracion,
        [field]: value
      })
    } else {
      setConfiguracion({
        ...configuracion,
        [field]: value
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validación básica
    if (!configuracion?.clave) {
      setError("La clave es requerida")
      return
    }
    if (!configuracion?.tipo) {
      setError("El tipo es requerido")
      return
    }

    // Validar clave maestra para configuraciones sensibles
    if (isSensitive && !claveCorrecta) {
      setShowClaveMaestra(true)
      return
    }

    setLoading(true)

    try {
      if (configuracion) {
        // Si es un campo sensible y no se modificó, mantener el valor original
        let valorActual = configuracion.valor
        if (isSensitive && valorActual === '••••••••') {
          const original = await ConfiguracionService.getById(configuracion.id)
          valorActual = original.valor
        }

        await ConfiguracionService.update(configuracion.id, {
          ...configuracion,
          valor: valorActual
        })
        
        await Swal.fire({
          icon: 'success',
          title: '¡Configuración actualizada!',
          text: 'Los cambios se han guardado correctamente',
          showConfirmButton: false,
          timer: 1500
        })
        
        navigate('/configuraciones')
      }
    } catch (error: any) {
      console.error("Error al actualizar configuración:", error)
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || "Ocurrió un error al actualizar la configuración",
        confirmButtonColor: '#3085d6'
      })
    } finally {
      setLoading(false)
    }
  }

  // Función para cambiar la clave maestra
  const handleChangeMasterKey = async () => {
    setError("")

    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Todos los campos son obligatorios")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Las nuevas contraseñas no coinciden")
      return
    }

    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres")
      return
    }

    setChangingPassword(true)

    try {
      // 1. Verificar la clave actual
      const currentConfig = await ConfiguracionService.getByKey('clave_maestra_configuracion')
      
      if (!currentConfig || currentConfig.valor !== currentPassword) {
        throw new Error("La contraseña actual es incorrecta")
      }

      // 2. Actualizar la nueva clave
      await ConfiguracionService.update(currentConfig.id, {
        ...currentConfig,
        valor: newPassword
      })

      await Swal.fire({
        icon: 'success',
        title: '¡Clave maestra actualizada!',
        text: 'La clave maestra ha sido cambiada correctamente',
        showConfirmButton: false,
        timer: 1500
      })

      // Resetear campos
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toggleChangeMaster()
      
      // Actualizar la configuración en el estado
      if (configuracion) {
        setConfiguracion({
          ...configuracion,
          valor: '••••••••' // Volver a enmascarar
        })
      }
    } catch (error: any) {
      console.error("Error al cambiar clave maestra:", error)
      setError(error.message || "Ocurrió un error al cambiar la clave")
    } finally {
      setChangingPassword(false)
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
    { value: 'notificaciones', label: 'Notificaciones' },
  ]

  if (!configuracion) return null

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
                Editar Configuración
                {isSensitive && (
                  <Badge ml="sm" color="red" leftSection={<IconShieldLock size={14} />}>
                    Sensible
                  </Badge>
                )}
              </Title>
            </Group>
            <Text size="sm" color="dimmed">
              ID: {configuracion.id}
            </Text>
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
            <LoadingOverlay visible={fetching || changingPassword} overlayBlur={2} />

            <Paper p="lg" radius="md" withBorder>
              <Title order={4} mb="md">
                Detalles de Configuración
              </Title>

              <Group grow mb="md">
                <TextInput
                  label="Clave"
                  placeholder="Nombre de la configuración"
                  value={configuracion.clave}
                  onChange={(e) => handleChange("clave", e.target.value)}
                  required
                  size="md"
                  radius="md"
                  disabled={isSensitive}
                  icon={isSensitive ? <IconShieldLock size={16} /> : null}
                />

                <Select
                  label="Tipo"
                  placeholder="Seleccione tipo"
                  data={tipos}
                  value={configuracion.tipo}
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
                  value={configuracion.categoria}
                  onChange={(value) => handleChange("categoria", value || 'general')}
                  size="md"
                  radius="md"
                />

                {configuracion.tipo === 'booleano' ? (
                  <Switch
                    label="Valor"
                    checked={configuracion.valor === 'true'}
                    onChange={(e) => handleChange("valor", e.currentTarget.checked ? 'true' : 'false')}
                    size="md"
                    mt="md"
                  />
                ) : configuracion.tipo === 'entero' || configuracion.tipo === 'decimal' ? (
                  <NumberInput
                    label="Valor"
                    value={Number(configuracion.valor) || 0}
                    onChange={(value) => handleChange("valor", value.toString())}
                    precision={configuracion.tipo === 'decimal' ? 2 : 0}
                    size="md"
                  />
                ) : isSensitive ? (
                  <PasswordInput
                    label="Valor"
                    value={isEditingPassword ? configuracion.valor : '••••••••'}
                    onChange={(e) => handleChange("valor", e.target.value)}
                    size="md"
                    radius="md"
                    placeholder={isEditingPassword ? "Nuevo valor" : "Ingrese clave maestra para editar"}
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
                    disabled={!isEditingPassword && !claveCorrecta}
                  />
                ) : (
                  <TextInput
                    label="Valor"
                    value={configuracion.valor}
                    onChange={(e) => handleChange("valor", e.target.value)}
                    size="md"
                    radius="md"
                  />
                )}
              </Group>

              <Textarea
                label="Descripción"
                placeholder="Descripción de la configuración"
                value={configuracion.descripcion || ''}
                onChange={(e) => handleChange("descripcion", e.target.value)}
                size="md"
                radius="md"
                mb="md"
                autosize
                minRows={2}
                maxRows={4}
              />

              {/* Sección para cambiar clave maestra (solo visible cuando se edita esa configuración) */}
              {isMasterKeyConfig(configuracion) && (
                <>
                  <Divider 
                    my="md" 
                    label={
                      <Group spacing="xs">
                        <IconRefresh size={14} />
                        <Text size="sm">Cambiar Clave Maestra</Text>
                      </Group>
                    } 
                    labelPosition="center"
                  />
                  
                  <Button 
                    fullWidth 
                    variant="light" 
                    onClick={toggleChangeMaster}
                    mb="md"
                    leftIcon={<IconLock size={16} />}
                  >
                    {openedChangeMaster ? 'Ocultar' : 'Cambiar Clave Maestra'}
                  </Button>

                  <Collapse in={openedChangeMaster}>
                    <Paper p="md" withBorder>
                      <PasswordInput
                        label="Contraseña actual"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Ingrese la clave actual"
                        mb="md"
                        required
                      />

                      <PasswordInput
                        label="Nueva contraseña"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Ingrese la nueva clave"
                        mb="md"
                        required
                        description="Mínimo 8 caracteres"
                      />

                      <PasswordInput
                        label="Confirmar nueva contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita la nueva clave"
                        mb="md"
                        required
                      />

                      <Button 
                        fullWidth 
                        onClick={handleChangeMasterKey}
                        leftIcon={<IconCheck size={16} />}
                      >
                        Actualizar Clave Maestra
                      </Button>
                    </Paper>
                  </Collapse>
                </>
              )}

              {isSensitive && !claveCorrecta && !isMasterKeyConfig(configuracion) && (
                <Alert icon={<IconLock size={16} />} color="orange" mb="md">
                  Esta configuración es sensible. Debes verificar la clave maestra para modificarla.
                </Alert>
              )}

              <Modal
                opened={showClaveMaestra}
                onClose={() => {
                  setShowClaveMaestra(false)
                  setClaveIngresada("")
                }}
                title="Verificación de clave maestra"
              >
                <PasswordInput
                  label="Ingrese la clave maestra"
                  value={claveIngresada}
                  onChange={(e) => setClaveIngresada(e.target.value)}
                  placeholder="Clave de seguridad"
                  mb="md"
                  icon={<IconKey size={16} />}
                  visibilityToggleIcon={({ reveal }) =>
                    reveal ? (
                      <Tooltip label="Ocultar clave">
                        <IconEyeOff size={16} />
                      </Tooltip>
                    ) : (
                      <Tooltip label="Mostrar clave">
                        <IconEye size={16} />
                      </Tooltip>
                    )
                  }
                />
                <Group position="right">
                  <Button
                    variant="default"
                    onClick={() => {
                      setShowClaveMaestra(false)
                      setClaveIngresada("")
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    color="blue"
                    onClick={async () => {
                      const valido = await verificarClaveMaestra()
                      if (valido) {
                        setIsEditingPassword(true)
                        setClaveIngresada("")
                      }
                    }}
                  >
                    Verificar
                  </Button>
                </Group>
              </Modal>

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
                  disabled={isSensitive && !claveCorrecta}
                >
                  Guardar Cambios
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
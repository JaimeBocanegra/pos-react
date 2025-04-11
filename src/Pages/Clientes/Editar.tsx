"use client"

import { Flex, ActionIcon, Input, Button, Paper, Title, Group, Switch, Box, Alert } from "@mantine/core"
import type React from "react"
import { useEffect, useState } from "react"
import { IconUsers, IconArrowLeft, IconCheck, IconAlertCircle, IconReceipt, IconUserCircle } from "@tabler/icons-react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "../../supabase/client"

export function Editar() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cliente, setCliente] = useState<any | null>(null)
  const [nombre, setNombre] = useState("")
  const [iva, setIva] = useState(false)
  const [empleadoRequerido, setEmpleadoRequerido] = useState(false)
  const [requiereNumeroEmpleado, setRequiereNumeroEmpleado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const obtenerCliente = async () => {
      if (id) {
        try {
          const { data, error } = await supabase.from("CLIENTES").select("*").eq("IdCliente", id).single()

          if (error) {
            throw error
          }

          setCliente(data)
          setNombre(data?.Nombre || "")
          setIva(data?.Iva || false)
          setEmpleadoRequerido(data?.EmpleadoRequerido || false)
          setRequiereNumeroEmpleado(data?.RequiereNumeroEmpleado || false)
        } catch (error: any) {
          console.error("Error al obtener cliente:", error)
          setError(error.message || "Error al cargar los datos del cliente")
        }
      }
    }

    obtenerCliente()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset states
    setError("")
    setSuccess(false)

    // Validate input
    if (nombre.trim() === "") {
      setError("Por favor ingrese el nombre del cliente")
      return
    }

    setLoading(true)

    try {
      const { data, error: supabaseError } = await supabase
        .from("CLIENTES")
        .update({
          Nombre: nombre,
          Iva: iva,
          EmpleadoRequerido: empleadoRequerido,
          RequiereNumeroEmpleado: requiereNumeroEmpleado,
        })
        .eq("IdCliente", id)

      if (supabaseError) {
        throw supabaseError
      }

      console.log("Cliente actualizado:", data)
      setSuccess(true)

      // Navigate back after a short delay to show success message
      setTimeout(() => {
        navigate(-1)
      }, 1500)
    } catch (error: any) {
      console.error("Error al actualizar cliente:", error)
      setError(error.message || "Ocurrió un error al actualizar el cliente")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Paper shadow="xs" p="xl" radius="md" w="100%" h="100%">
      <form onSubmit={handleSubmit} style={{ height: "100%" }}>
        <Flex direction="column" h="100%" gap="xl">
          {/* Header */}
          <Flex w="100%" align="center" justify="space-between">
            <Group>
              <ActionIcon color="blue" size="lg" variant="light" onClick={() => navigate(-1)} radius="xl">
                <IconArrowLeft size="1.2rem" />
              </ActionIcon>
              <Title
                order={2}
                sx={(theme) => ({
                  fontSize: "calc(1.1rem + 0.5vw)",
                  color: theme.colors.blue[7],
                })}
              >
                Editar Cliente
              </Title>
            </Group>
            <IconUsers size={28} color="#228be6" />
          </Flex>

          {/* Form Content */}
          <Box
            sx={{
              maxWidth: "600px",
              width: "100%",
              margin: "0 auto",
              flex: 1,
            }}
          >
            {success && (
              <Alert
                icon={<IconCheck size={16} />}
                title="¡Cliente actualizado con éxito!"
                color="green"
                mb="lg"
                withCloseButton
                onClose={() => setSuccess(false)}
              >
                El cliente ha sido actualizado correctamente.
              </Alert>
            )}

            <Paper p="lg" radius="md" withBorder>
              <Title order={4} mb="md">
                Información del Cliente
              </Title>

              <Input.Wrapper id="nombre-label" label="Nombre del cliente" required mb="md">
                <Input
                  id="nombre"
                  placeholder="Nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.currentTarget.value)}
                  size="md"
                  radius="md"
                />
              </Input.Wrapper>

              <Switch
                label="Aplicar IVA"
                checked={iva}
                onChange={(event) => setIva(event.currentTarget.checked)}
                mb="md"
                size="md"
                color="blue"
                description="Si está activado, se aplicará IVA automáticamente en las ventas"
              />

              <Switch
                label="Requiere Empleado"
                checked={empleadoRequerido}
                onChange={(event) => {
                  const newValue = event.currentTarget.checked
                  setEmpleadoRequerido(newValue)
                  if (!newValue) {
                    setRequiereNumeroEmpleado(false)
                  }
                }}
                mb="md"
                size="md"
                color="blue"
                description="Si está activado, se requerirá un empleado para las ventas"
              />

              <Switch
                label="Requiere Número de Empleado"
                checked={requiereNumeroEmpleado}
                onChange={(event) => setRequiereNumeroEmpleado(event.currentTarget.checked)}
                disabled={!empleadoRequerido}
                mb="md"
                size="md"
                color="blue"
                description="Si está activado, se requerirá el número de empleado para las ventas"
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
                <Button variant="outline" color="gray" onClick={() => navigate(-1)} radius="md">
                  Cancelar
                </Button>
                <Button type="submit" color="blue" radius="md" loading={loading}>
                  Actualizar Cliente
                </Button>
              </Group>
            </Paper>
          </Box>
        </Flex>
      </form>
    </Paper>
  )
}

export default Editar

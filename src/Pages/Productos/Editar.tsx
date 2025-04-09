"use client";

import {
  Button,
  Flex,
  TextInput,
  NumberInput,
  Select,
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
} from "@mantine/core";
import { useState, useEffect } from "react";
import {
  IconPackage,
  IconArrowLeft,
  IconCheck,
  IconAlertCircle,
  IconCurrencyDollar,
  IconBarcode,
  IconRulerMeasure,
  IconDeviceFloppy,
  IconTruckDelivery,
  IconLock,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../supabase/client";
import { obtenerProveedores } from "../services/ProveedorService";
import { actualizarProducto } from "../services/ProductoService";
import Swal from "sweetalert2";

export function Editar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    codigo: "",
    descripcion: "",
    proveedor: "",
    medida: "",
    precioCompra: "",
    precioVenta: "",
    stock: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [loadingProveedores, setLoadingProveedores] = useState(true);
  const [showClaveMaestra, setShowClaveMaestra] = useState(false);
  const [claveIngresada, setClaveIngresada] = useState("");
  const [claveCorrecta, setClaveCorrecta] = useState(false);
  const [stockOriginal, setStockOriginal] = useState("0");
  const [configuraciones, setConfiguraciones] = useState({
    permitir_venta_stock_cero: false,
    stock_minimo_default: 3,
  });
  const [showPassword, setShowPassword] = useState(false);

  // Obtener configuraciones del sistema
  useEffect(() => {
    const fetchConfiguraciones = async () => {
      try {
        const { data, error } = await supabase
          .from('configuraciones')
          .select('clave, valor, tipo')
          .in('clave', ['permitir_venta_stock_cero', 'stock_minimo_default']);

        if (error) throw error;

        const configMap = data.reduce<Record<string, any>>((acc, item) => {
          acc[item.clave] = convertirValor(item.valor, item.tipo);
          return acc;
        }, {});

        setConfiguraciones(prev => ({ ...prev, ...configMap }));
      } catch (error) {
        console.error("Error cargando configuraciones:", error);
      }
    };

    fetchConfiguraciones();
  }, []);

  const convertirValor = (valor: string, tipo: string) => {
    switch(tipo) {
      case 'booleano': return valor === 'true';
      case 'entero': return parseInt(valor, 10);
      case 'decimal': return parseFloat(valor);
      default: return valor;
    }
  };

  // Obtener lista de proveedores
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const data = await obtenerProveedores();
        setProveedores(data);
      } catch (error) {
        console.error("Error al obtener proveedores:", error);
        setError("No se pudieron cargar los proveedores");
      } finally {
        setLoadingProveedores(false);
      }
    };

    fetchProveedores();
  }, []);

  async function obtenerStockOriginal(id: string) {
    try {
      const { data, error } = await supabase
        .from("Productos")
        .select("Stock")
        .eq("Id_producto", id)
        .single();

      if (error) throw error;
      return data?.Stock || 0;
    } catch (error) {
      console.error("Error al obtener stock original:", error);
      return 0;
    }
  }

  // Opciones para selects
  const medidas = [
    { value: "Pieza", label: "Pieza" },
    { value: "Kilogramo", label: "Kilogramo" },
    { value: "Litro", label: "Litro" },
    { value: "Metro", label: "Metro" },
    { value: "Paquete", label: "Paquete" },
    { value: "Caja", label: "Caja" },
  ];

  // Función para verificar la clave maestra con SweetAlert2
  const verificarClaveMaestra = async () => {
    try {
      const { data, error } = await supabase
        .from("configuraciones")
        .select("valor")
        .eq("clave", "clave_maestra_stock")
        .single();

      if (error) throw error;

      if (data && data.valor === claveIngresada) {
        setClaveCorrecta(true);
        setShowClaveMaestra(false);
        setClaveIngresada(""); // Limpiar campo después de verificación exitosa
        return true;
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Clave incorrecta',
          text: 'La clave maestra ingresada no es válida',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'Entendido'
        });
        return false;
      }
    } catch (error) {
      console.error("Error al verificar clave maestra:", error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error al verificar la clave maestra',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Entendido'
      });
      return false;
    }
  };

  // Obtener datos del producto a editar
  useEffect(() => {
    const fetchProducto = async () => {
      try {
        const { data, error } = await supabase
          .from("Productos")
          .select("*")
          .eq("Id_producto", id)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            codigo: data.Codigo || "",
            descripcion: data.Descripcion || "",
            proveedor: data.Categoria || "",
            medida: data.Medida || "",
            precioCompra: data.PrecioCompra?.toString() || "",
            precioVenta: data.PrecioVenta?.toString() || "",
            stock: data.Stock?.toString() || "0",
          });
          
          if (id) {
            const originalStock = await obtenerStockOriginal(id);
            setStockOriginal(originalStock.toString());
          }
        }
      } catch (error) {
        console.error("Error al obtener producto:", error);
        setError("No se pudo cargar el producto");
      } finally {
        setFetching(false);
      }
    };

    if (id) fetchProducto();
  }, [id]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset states
    setError("");
    setSuccess(false);

    // Validación básica
    if (!formData.codigo.trim()) {
      setError("El código del producto es requerido");
      return;
    }
    if (!formData.descripcion.trim()) {
      setError("La descripción del producto es requerida");
      return;
    }
    if (!formData.proveedor.trim()) {
      setError("Debe seleccionar un proveedor");
      return;
    }
    if (!formData.precioCompra || Number.parseFloat(formData.precioCompra) <= 0) {
      setError("El precio de compra debe ser mayor a 0");
      return;
    }
    if (!formData.precioVenta || Number.parseFloat(formData.precioVenta) <= 0) {
      setError("El precio de venta debe ser mayor a 0");
      return;
    }
    if (Number.parseFloat(formData.precioVenta) < Number.parseFloat(formData.precioCompra)) {
      setError("El precio de venta no puede ser menor al precio de compra");
      return;
    }
    if (!configuraciones.permitir_venta_stock_cero && Number(formData.stock) <= 0) {
      setError("No se permiten productos con stock cero");
      return;
    }

    // Validar clave maestra si se modificó el stock
    if (formData.stock !== stockOriginal) {
      if (!claveCorrecta) {
        setShowClaveMaestra(true);
        return;
      }
    }

    setLoading(true);

    try {
      await actualizarProducto(
        Number(id),
        formData.codigo,
        formData.descripcion,
        formData.proveedor,
        formData.medida,
        Number.parseFloat(formData.precioCompra),
        Number.parseFloat(formData.precioVenta),
        Number(formData.stock)
      );

      await Swal.fire({
        icon: 'success',
        title: '¡Producto actualizado!',
        text: 'Los cambios se han guardado correctamente',
        showConfirmButton: false,
        timer: 1500
      });
      
      navigate(-1);
    } catch (error: any) {
      console.error("Error al actualizar producto:", error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || "Ocurrió un error al actualizar el producto",
        confirmButtonColor: '#3085d6'
      });
    } finally {
      setLoading(false);
    }
  };

  // Convertir proveedores a formato para Select
  const opcionesProveedores = proveedores.map((proveedor) => ({
    value: proveedor.NombreCompleto,
    label: proveedor.NombreCompleto,
  }));

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
                Editar Producto
              </Title>
            </Group>
            <IconPackage size={28} color="#228be6" />
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
            <LoadingOverlay visible={fetching || loadingProveedores} overlayBlur={2} />

            <Paper p="lg" radius="md" withBorder>
              <Title order={4} mb="md">
                Información del Producto
              </Title>

              <Group grow mb="md">
                <TextInput
                  label="Código"
                  placeholder="Código de barras o SKU"
                  value={formData.codigo}
                  onChange={(e) => handleChange("codigo", e.target.value)}
                  required
                  icon={<IconBarcode size={16} />}
                  size="md"
                  radius="md"
                />

                <TextInput
                  label="Descripción"
                  placeholder="Nombre del producto"
                  value={formData.descripcion}
                  onChange={(e) => handleChange("descripcion", e.target.value)}
                  required
                  icon={<IconPackage size={16} />}
                  size="md"
                  radius="md"
                />
              </Group>

              <Group grow mb="md">
                <Select
                  label="Proveedor"
                  placeholder="Seleccione proveedor"
                  data={opcionesProveedores}
                  value={formData.proveedor}
                  onChange={(value) => handleChange("proveedor", value || "")}
                  icon={<IconTruckDelivery size={16} />}
                  size="md"
                  radius="md"
                  searchable
                  nothingFound="No se encontraron proveedores"
                  disabled={loadingProveedores}
                />

                <Select
                  label="Unidad de Medida"
                  placeholder="Seleccione medida"
                  data={medidas}
                  value={formData.medida}
                  onChange={(value) => handleChange("medida", value || "")}
                  icon={<IconRulerMeasure size={16} />}
                  size="md"
                  radius="md"
                />
              </Group>

              <Group grow mb="md">
                <NumberInput
                  label="Precio de Compra (MXN)"
                  placeholder="0.00"
                  value={formData.precioCompra ? Number(formData.precioCompra) : undefined}
                  onChange={(value) => handleChange("precioCompra", value.toString())}
                  precision={2}
                  min={0}
                  step={0.5}
                  required
                  icon={<IconCurrencyDollar size={16} />}
                  size="md"
                  radius="md"
                  parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                  formatter={(value) =>
                    !Number.isNaN(Number(value)) 
                      ? `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",") 
                      : "$ "
                  }
                />

                <NumberInput
                  label="Precio de Venta (MXN)"
                  placeholder="0.00"
                  value={formData.precioVenta ? Number(formData.precioVenta) : undefined}
                  onChange={(value) => handleChange("precioVenta", value.toString())}
                  precision={2}
                  min={0}
                  step={0.5}
                  required
                  icon={<IconCurrencyDollar size={16} />}
                  size="md"
                  radius="md"
                  parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                  formatter={(value) =>
                    !Number.isNaN(Number(value))
                      ? `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                      : "$ "
                  }
                />
              </Group>

              <NumberInput
                label="Stock"
                placeholder="Cantidad en inventario"
                value={formData.stock ? Number(formData.stock) : undefined}
                onChange={(value) => handleChange("stock", value.toString())}
                min={configuraciones.permitir_venta_stock_cero ? 0 : 1}
                step={1}
                icon={<IconPackage size={16} />}
                size="md"
                radius="md"
                mb="md"
                disabled={!claveCorrecta}
                description={`Stock mínimo recomendado: ${configuraciones.stock_minimo_default}`}
              />

              {!claveCorrecta && (
                <Button
                  variant="outline"
                  onClick={() => setShowClaveMaestra(true)}
                  leftIcon={<IconLock size={16} />}
                  mb="xl"
                >
                  Desbloquear para modificar stock
                </Button>
              )}

              <Modal
                opened={showClaveMaestra}
                onClose={() => {
                  setShowClaveMaestra(false);
                  setClaveIngresada(""); // Limpiar campo al cerrar
                }}
                title="Verificación de clave maestra"
              >
                <PasswordInput
                  label="Ingrese la clave maestra"
                  value={claveIngresada}
                  onChange={(e) => setClaveIngresada(e.target.value)}
                  placeholder="Clave de seguridad"
                  mb="md"
                  visibilityToggleIcon={({ reveal }) =>
                    reveal ? <IconEyeOff size={16} /> : <IconEye size={16} />
                  }
                />
                <Group position="right">
                  <Button
                    variant="default"
                    onClick={() => {
                      setShowClaveMaestra(false);
                      setClaveIngresada(""); // Limpiar campo al cancelar
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={async () => {
                      const valido = await verificarClaveMaestra();
                      if (valido) {
                        setClaveIngresada(""); // Limpiar campo después de verificación exitosa
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
                >
                  Guardar Cambios
                </Button>
              </Group>
            </Paper>
          </Box>

          <Box>
            <Text align="center" size="sm" color="dimmed">
              Los cambios se reflejarán inmediatamente en el inventario.
            </Text>
          </Box>
        </Flex>
      </form>
    </Paper>
  );
}
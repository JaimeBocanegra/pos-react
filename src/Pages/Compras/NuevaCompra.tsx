"use client";

import {
  ActionIcon,
  Button,
  Flex,
  Paper,
  Title,
  Group,
  Box,
  Text,
  TextInput,
  Select,
  NumberInput,
  Table,
  ScrollArea,
  Badge,
  Divider,
  Alert,
  LoadingOverlay,
  Tooltip,
  Kbd,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconShoppingCart,
  IconTrash,
  IconReceipt,
  IconTruckDelivery,
  IconCalendar,
  IconSearch,
  IconCheck,
  IconAlertCircle,
  IconBarcode,
} from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DateInput } from "@mantine/dates";
import { obtenerProveedores } from "../services/ProveedorService";
import { obtenerProductos } from "../services/ProductoService";
import { crearCompra } from "../services/CompraService";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../../supabase/client";
import { getBase64ImageFromUrl } from "../services/GolbalService";
import Swal from "sweetalert2";

// Extend jsPDF to include lastAutoTable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: { finalY: number };
  }
}

interface DetalleCompraForm {
  IdProducto: number;
  CodigoProducto: string;
  DescripcionProducto: string;
  CategoriaProducto: string;
  MedidaProducto: string;
  PrecioCompra: number;
  PrecioVenta: number;
  Cantidad: number;
  SubTotal: number;
}

export function NuevaCompra() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingProveedores, setLoadingProveedores] = useState(true);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [productosFiltrados, setProductosFiltrados] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [barcodeScannerActive, setBarcodeScannerActive] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [empresa, setEmpresa] = useState<any>(null);

  // Estado para el formulario de compra
  const [compra, setCompra] = useState({
    numeroDocumento: "",
    fechaRegistro: new Date(),
    documentoProveedor: "",
    nombreProveedor: "",
  });

  // Estado para el producto seleccionado actualmente
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null);
  const [cantidad, setCantidad] = useState<number | "">(1);

  // Estado para la lista de productos en la compra
  const [detallesCompra, setDetallesCompra] = useState<DetalleCompraForm[]>([]);

  // Cargar datos de la empresa
  useEffect(() => {
    const cargarDatosEmpresa = async () => {
      try {
        const { data, error } = await supabase.from("empresas").select("*").limit(1);

        if (error) {
          console.error("Error al cargar datos de empresa:", error);
          return;
        }

        if (data && data.length > 0) {
          setEmpresa(data[0]);
        }
      } catch (err) {
        console.error("Error inesperado al cargar datos de empresa:", err);
      }
    };

    cargarDatosEmpresa();
  }, []);

  // Cargar proveedores
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

  // Cargar productos solo cuando se selecciona un proveedor
  const cargarProductosPorProveedor = async (proveedorId: string) => {
    setLoadingProductos(true);
    try {
      const data = await obtenerProductos();
      const proveedorSeleccionado = proveedores.find(p => p.IdProveedor.toString() === proveedorId);
      
      if (proveedorSeleccionado) {
        const productosProveedor = data.filter((producto: any) => 
          producto.Categoria.toLowerCase() === proveedorSeleccionado.NombreCompleto.toLowerCase()
        );
        setProductos(productosProveedor);
        setProductosFiltrados(productosProveedor);
      }
    } catch (error) {
      console.error("Error al obtener productos:", error);
      setError("No se pudieron cargar los productos");
    } finally {
      setLoadingProductos(false);
    }
  };

  // Filtrar productos según término de búsqueda (insensible a mayúsculas/minúsculas)
  useEffect(() => {
    if (searchTerm.trim() !== "") {
      const filtered = productos.filter(
        (producto) =>
          producto.Codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          producto.Descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
          producto.Categoria.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setProductosFiltrados(filtered);
    } else {
      setProductosFiltrados(productos);
    }
  }, [searchTerm, productos]);

  // Opciones para el select de proveedores
  const opcionesProveedores = proveedores.map((proveedor) => ({
    value: proveedor.IdProveedor.toString(),
    label: proveedor.NombreCompleto,
  }));

  // Manejar cambio de proveedor
  const handleProveedorChange = async (value: string | null) => {
    if (value) {
      const proveedorSeleccionado = proveedores.find((p) => p.IdProveedor.toString() === value);
      if (proveedorSeleccionado) {
        const nuevoNombreProveedor = proveedorSeleccionado.NombreCompleto;

        // Si hay productos en la lista y se cambia el proveedor, eliminar automáticamente los productos que no corresponden
        if (detallesCompra.length > 0 && compra.nombreProveedor !== nuevoNombreProveedor) {
          // Filtrar los productos que no corresponden al nuevo proveedor
          const detallesFiltrados = detallesCompra.filter(
            (detalle) => detalle.CategoriaProducto.toLowerCase() === nuevoNombreProveedor.toLowerCase()
          );

          // Actualizar la lista de detalles
          setDetallesCompra(detallesFiltrados);

          // Mostrar mensaje de confirmación
          const eliminados = detallesCompra.length - detallesFiltrados.length;
          if (eliminados > 0) {
            Swal.fire(
              "Productos eliminados",
              `Se han eliminado ${eliminados} productos que no corresponden al proveedor seleccionado.`,
              "success",
            );
          }
        }

        // Actualizar el proveedor en el estado de compra
        setCompra({
          ...compra,
          documentoProveedor: proveedorSeleccionado.IdProveedor.toString(),
          nombreProveedor: nuevoNombreProveedor,
        });

        // Cargar productos del proveedor seleccionado
        await cargarProductosPorProveedor(value);
      }
    } else {
      setCompra({
        ...compra,
        documentoProveedor: "",
        nombreProveedor: "",
      });
      setProductos([]);
      setProductosFiltrados([]);
    }
  };

  // Manejar selección de producto
  const handleProductoSeleccionado = (producto: any) => {
    setProductoSeleccionado(producto);
    setCantidad(1);
  };

  // Agregar producto a la compra
  const agregarProducto = () => {
    if (!productoSeleccionado) {
      setError("Debe seleccionar un producto");
      return;
    }

    if (!cantidad || cantidad <= 0) {
      setError("La cantidad debe ser mayor a 0");
      return;
    }

    // Verificar que el producto corresponda al proveedor seleccionado
    if (compra.nombreProveedor && 
        productoSeleccionado.Categoria.toLowerCase() !== compra.nombreProveedor.toLowerCase()) {
      setError(
        `Este producto pertenece al proveedor ${productoSeleccionado.Categoria} y no al proveedor seleccionado ${compra.nombreProveedor}`
      );
      return;
    }

    // Verificar si el producto ya está en la lista
    const productoExistente = detallesCompra.find(
      (detalle) => detalle.IdProducto === productoSeleccionado.Id_producto
    );

    if (productoExistente) {
      // Actualizar cantidad si ya existe
      const nuevosDetalles = detallesCompra.map((detalle) => {
        if (detalle.IdProducto === productoSeleccionado.Id_producto) {
          const nuevaCantidad = detalle.Cantidad + (cantidad as number);
          return {
            ...detalle,
            Cantidad: nuevaCantidad,
            SubTotal: nuevaCantidad * detalle.PrecioCompra,
          };
        }
        return detalle;
      });
      setDetallesCompra(nuevosDetalles);
    } else {
      // Agregar nuevo producto
      const nuevoDetalle: DetalleCompraForm = {
        IdProducto: productoSeleccionado.Id_producto,
        CodigoProducto: productoSeleccionado.Codigo,
        DescripcionProducto: productoSeleccionado.Descripcion,
        CategoriaProducto: productoSeleccionado.Categoria,
        MedidaProducto: productoSeleccionado.Medida,
        PrecioCompra: Number.parseFloat(productoSeleccionado.PrecioCompra),
        PrecioVenta: Number.parseFloat(productoSeleccionado.PrecioVenta),
        Cantidad: cantidad as number,
        SubTotal: (cantidad as number) * Number.parseFloat(productoSeleccionado.PrecioCompra),
      };
      setDetallesCompra([...detallesCompra, nuevoDetalle]);
    }

    // Limpiar selección
    setProductoSeleccionado(null);
    setCantidad(1);
    setSearchTerm("");
    setError("");
  };

  const formatearFecha = (fecha: string | Date) => {
    const date = new Date(fecha);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const imprimirComprobante = async (compraData: any, detallesData: any) => {
    if (!compraData || !detallesData.length) return;

    try {
      const doc = new jsPDF();

      // Configuración de la empresa
      const empresaInfo = {
        nombre: empresa?.nombre || "Mi Empresa",
        logo: empresa?.logo || "/logo.png",
        direccion: empresa?.direccion || "Dirección de la empresa",
        telefono: empresa?.telefono || "123-456-7890",
      };

      // Título
      doc.setFontSize(18);
      doc.text("Comprobante de Compra", 105, 15, { align: "center" });

      // Logo de la empresa
      let logoBase64 = "";
      if (empresaInfo.logo) {
        try {
          logoBase64 = await getBase64ImageFromUrl(empresaInfo.logo);
          doc.addImage(logoBase64, "PNG", 20, 1, 30, 30);
        } catch (error) {
          console.error("Error al cargar el logo:", error);
        }
      }

      // Información de la empresa
      doc.setFontSize(10);
      doc.text(empresaInfo.nombre, 160, 20);
      doc.text(empresaInfo.direccion, 160, 25);
      doc.text(`Tel: ${empresaInfo.telefono}`, 160, 30);

      // Información de la compra - asegurando que los valores no sean undefined
      doc.setFontSize(12);
      doc.text(`Compra: ${compraData.NumeroDocumento || "N/A"}`, 14, 40);
      doc.text(`Fecha: ${compraData.FechaRegistro ? formatearFecha(compraData.FechaRegistro) : "N/A"}`, 14, 48);
      doc.text(`Usuario: ${compraData.UsuarioRegistro || "Admin"}`, 14, 56);

      doc.text(`Proveedor: ${compraData.NombreProveedor || "N/A"}`, 120, 40);
      doc.text(`ID Proveedor: ${compraData.DocumentoProveedor || "N/A"}`, 120, 48);
      doc.text(`Productos: ${detallesData.length || 0}`, 120, 56);

      // Tabla de productos
      const tableColumn = ["Código", "Descripción", "Precio", "Cantidad", "Subtotal"];
      const tableRows = detallesData.map((detalle: any) => [
        detalle.CodigoProducto || "N/A",
        detalle.DescripcionProducto || "N/A",
        `$ ${Number.parseFloat(detalle.PrecioCompra || 0).toFixed(2)}`,
        detalle.Cantidad || 0,
        `$ ${Number.parseFloat(detalle.SubTotal || 0).toFixed(2)}`,
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 65,
        theme: "grid",
        styles: { fontSize: 10 },
        headStyles: { fillColor: [66, 139, 202] },
      });

      const finalY = doc.lastAutoTable?.finalY || 70;

      // Total
      const totalCompra = detallesData.reduce(
        (total: number, detalle: any) => total + Number.parseFloat(detalle.PrecioCompra || 0) * (detalle.Cantidad || 0),
        0,
      );

      doc.setFontSize(12);
      doc.text(`Total: $ ${totalCompra.toFixed(2)} MXN`, 150, finalY + 10, {
        align: "right",
      });

      // Pie de página
      doc.setFontSize(10);
      doc.text(`Documento generado el ${new Date().toLocaleString()}`, 105, 280, { align: "center" });

      // Habilitar impresión automática
      doc.autoPrint();

      // Abrir en nueva ventana para imprimir
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");

      // Liberar memoria
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
    } catch (error) {
      console.error("Error al generar PDF para imprimir:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo generar el comprobante para impresión",
      });
    }
  };

  // Eliminar producto de la compra
  const eliminarProducto = (idProducto: number) => {
    setDetallesCompra(detallesCompra.filter((detalle) => detalle.IdProducto !== idProducto));
  };

  // Calcular total de la compra
  const totalCompra = detallesCompra.reduce((total, detalle) => total + detalle.SubTotal, 0);

  // Guardar compra
  const guardarCompra = async () => {
    if (!compra.nombreProveedor) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "El nombre del proveedor es requerido",
        confirmButtonColor: "#3085d6",
        timer: 1500
      });
      return;
    }

    if (detallesCompra.length === 0) {
      setError("Debe agregar al menos un producto a la compra");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Preparar datos para el servicio
      const compraData = {
        NumeroDocumento: compra.numeroDocumento,
        FechaRegistro: compra.fechaRegistro.toISOString(),
        UsuarioRegistro: "Admin",
        DocumentoProveedor: compra.documentoProveedor,
        NombreProveedor: compra.nombreProveedor,
        CantidadProductos: detallesCompra.length.toString(),
        MontoTotal: totalCompra.toString(),
      };

      // Preparar detalles para el servicio
      const detallesData = detallesCompra.map((detalle) => ({
        IdProducto: detalle.IdProducto,
        CodigoProducto: detalle.CodigoProducto,
        DescripcionProducto: detalle.DescripcionProducto,
        CategoriaProducto: detalle.CategoriaProducto,
        MedidaProducto: detalle.MedidaProducto,
        PrecioCompra: detalle.PrecioCompra.toString(),
        PrecioVenta: detalle.PrecioVenta.toString(),
        Cantidad: detalle.Cantidad,
        SubTotal: detalle.SubTotal.toString(),
      }));

      // Llamar al servicio para crear la compra
      await crearCompra(compraData, detallesData);

      setSuccess(true);

      // Imprimir comprobante después de guardar
      await imprimirComprobante(compraData, detallesData);

      // Redirigir después de un breve retraso
      setTimeout(() => {
        navigate("/compras");
      }, 1500);
    } catch (error: any) {
      console.error("Error al guardar compra:", error);
      setError(error.message || "Ocurrió un error al guardar la compra");
    } finally {
      setLoading(false);
    }
  };

  // Función para procesar el código de barras escaneado (insensible a mayúsculas/minúsculas)
  const procesarCodigoBarras = (codigo: string) => {
    // Buscar el producto por código de barras (insensible a mayúsculas/minúsculas)
    const productoEncontrado = productos.find((p) => 
      p.Codigo.toLowerCase() === codigo.toLowerCase()
    );

    if (productoEncontrado) {
      // Verificar que el producto corresponda al proveedor seleccionado
      if (compra.nombreProveedor && 
          productoEncontrado.Categoria.toLowerCase() !== compra.nombreProveedor.toLowerCase()) {
        Swal.fire({
          icon: "error",
          title: "Proveedor incorrecto",
          text: `El producto escaneado pertenece al proveedor ${productoEncontrado.Categoria} y no al seleccionado ${compra.nombreProveedor}`,
          confirmButtonColor: "#3085d6",
        });
        return;
      }

      // Verificar si el producto ya está en la lista
      const productoExistente = detallesCompra.find((d) => d.IdProducto === productoEncontrado.Id_producto);

      if (productoExistente) {
        // Actualizar cantidad si ya existe
        const nuevosDetalles = detallesCompra.map((detalle) => {
          if (detalle.IdProducto === productoEncontrado.Id_producto) {
            const nuevaCantidad = detalle.Cantidad + 1;
            return {
              ...detalle,
              Cantidad: nuevaCantidad,
              SubTotal: nuevaCantidad * detalle.PrecioCompra,
            };
          }
          return detalle;
        });
        setDetallesCompra(nuevosDetalles);

        Swal.fire({
          position: "top-end",
          icon: "success",
          title: `Cantidad actualizada`,
          text: `Se incrementó la cantidad de ${productoEncontrado.Descripcion}`,
          showConfirmButton: false,
          timer: 1000,
          toast: true,
        });
      } else {
        // Agregar nuevo producto
        const nuevoDetalle: DetalleCompraForm = {
          IdProducto: productoEncontrado.Id_producto,
          CodigoProducto: productoEncontrado.Codigo,
          DescripcionProducto: productoEncontrado.Descripcion,
          CategoriaProducto: productoEncontrado.Categoria,
          MedidaProducto: productoEncontrado.Medida,
          PrecioCompra: Number.parseFloat(productoEncontrado.PrecioCompra),
          PrecioVenta: Number.parseFloat(productoEncontrado.PrecioVenta),
          Cantidad: 1,
          SubTotal: Number.parseFloat(productoEncontrado.PrecioCompra),
        };
        setDetallesCompra([...detallesCompra, nuevoDetalle]);

        Swal.fire({
          position: "top-end",
          icon: "success",
          title: `Producto agregado`,
          text: productoEncontrado.Descripcion,
          showConfirmButton: false,
          timer: 1000,
          toast: true,
        });
      }
    } else {
      Swal.fire({
        icon: "error",
        title: "Producto no encontrado",
        text: `No se encontró ningún producto con el código: ${codigo}`,
        confirmButtonColor: "#3085d6",
      });
    }
  };

  // Manejador de eventos para el escáner de código de barras
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Solo procesar si el escáner está activo
      if (!barcodeScannerActive) return;

      // Si es Enter, procesar el código de barras
      if (e.key === "Enter") {
        e.preventDefault();
        
        // Obtener el valor del input del escáner
        const codigo = barcodeInputRef.current?.value.trim();
        
        if (codigo && codigo.length > 0) {
          procesarCodigoBarras(codigo);
          
          // Limpiar el input después de procesar
          if (barcodeInputRef.current) {
            barcodeInputRef.current.value = "";
          }
        }
      }
      // Desactivar el escáner con Escape
      else if (e.key === "Escape") {
        setBarcodeScannerActive(false);
        if (barcodeInputRef.current) {
          barcodeInputRef.current.value = "";
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [barcodeScannerActive, productos, detallesCompra, compra.nombreProveedor]);

  // Activar/desactivar el escáner de código de barras
  const toggleBarcodeScanner = () => {
    const nuevoEstado = !barcodeScannerActive;
    setBarcodeScannerActive(nuevoEstado);
    
    if (nuevoEstado) {
      // Enfocar el input cuando se activa el escáner
      setTimeout(() => {
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
          barcodeInputRef.current.value = ""; // Limpiar el input al activar
        }
      }, 100);
      
      Swal.fire({
        position: "top-end",
        icon: "info",
        title: "Escáner activado",
        text: "Listo para escanear códigos de barras",
        showConfirmButton: false,
        timer: 1000,
        toast: true,
      });
    } else {
      Swal.fire({
        position: "top-end",
        icon: "info",
        title: "Escáner desactivado",
        showConfirmButton: false,
        timer: 1000,
        toast: true,
      });
    }
  };

  return (
    <Paper shadow="xs" p="xl" radius="md" w="100%" h="100%" pos="relative">
      <LoadingOverlay visible={loading} overlayBlur={2} />

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
              Nueva Compra
            </Title>
          </Group>
          <IconShoppingCart size={28} color="#228be6" />
        </Flex>

        {success && (
          <Alert
            icon={<IconCheck size={16} />}
            title="¡Compra registrada con éxito!"
            color="green"
            withCloseButton
            onClose={() => setSuccess(false)}
          >
            La compra ha sido registrada correctamente.
          </Alert>
        )}

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error"
            color="red"
            withCloseButton
            onClose={() => setError("")}
          >
            {error}
          </Alert>
        )}

        {/* Formulario de Compra */}
        <Paper p="md" radius="md" withBorder>
          <Title order={4} mb="md">
            Información de la Compra
          </Title>

          <Group grow mb="md">
            <TextInput
              label="Número de Documento"
              placeholder="Factura, Boleta, etc."
              value={compra.numeroDocumento}
              onChange={(e) => setCompra({ ...compra, numeroDocumento: e.target.value })}
              icon={<IconReceipt size={16} />}
              required
            />

            <DateInput
              label="Fecha"
              placeholder="Seleccione fecha"
              value={compra.fechaRegistro}
              onChange={(date) => date && setCompra({ ...compra, fechaRegistro: date })}
              icon={<IconCalendar size={16} />}
              required
            />
          </Group>

          <Select
            label="Proveedor"
            placeholder="Seleccione un proveedor"
            data={opcionesProveedores}
            value={compra.documentoProveedor}
            onChange={handleProveedorChange}
            icon={<IconTruckDelivery size={16} />}
            searchable
            nothingFound="No se encontraron proveedores"
            required
            disabled={loadingProveedores}
            mb="md"
          />
        </Paper>

        {/* Selección de Productos */}
        <Paper p="md" radius="md" withBorder>
          <Group position="apart" mb="md">
            <Title order={4}>Agregar Productos</Title>
            <Group>
              <Button
                variant={barcodeScannerActive ? "filled" : "light"}
                color={barcodeScannerActive ? "green" : "blue"}
                leftIcon={<IconBarcode size={16} />}
                onClick={toggleBarcodeScanner}
              >
                {barcodeScannerActive ? "Escáner Activo" : "Activar Escáner"}
              </Button>
              {barcodeScannerActive && (
                <Text size="sm" color="dimmed">
                  Escanee un código de barras o presione <Kbd>Esc</Kbd> para desactivar
                </Text>
              )}
            </Group>
          </Group>

          {/* Input oculto para el escáner de código de barras */}
          <TextInput
            ref={barcodeInputRef}
            type="text"
            style={{
              position: "absolute",
              opacity: 0,
              height: 0,
              width: 0,
              padding: 0,
              border: "none",
            }}
            onBlur={() => {
              if (barcodeScannerActive && barcodeInputRef.current) {
                barcodeInputRef.current.focus();
              }
            }}
          />

          <Group mb="md">
            <TextInput
              placeholder="Buscar producto por código o descripción"
              icon={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flex: 1 }}
              disabled={!compra.nombreProveedor}
            />
          </Group>

          <ScrollArea h={200} mb="md">
            <Table striped highlightOnHover>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {!compra.nombreProveedor ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center" }}>
                      Seleccione un proveedor para ver los productos disponibles
                    </td>
                  </tr>
                ) : productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center" }}>
                      {loadingProductos ? "Cargando productos..." : "No se encontraron productos"}
                    </td>
                  </tr>
                ) : (
                  productosFiltrados.map((producto) => (
                    <tr
                      key={producto.Id_producto}
                      style={{
                        backgroundColor:
                          productoSeleccionado?.Id_producto === producto.Id_producto
                            ? "rgba(34, 139, 230, 0.1)"
                            : undefined,
                        cursor: "pointer",
                      }}
                      onClick={() => handleProductoSeleccionado(producto)}
                    >
                      <td>{producto.Codigo}</td>
                      <td>{producto.Descripcion}</td>
                      <td>
                        <Badge color="teal" variant="light">
                          {producto.Categoria}
                        </Badge>
                      </td>
                      <td>$ {Number.parseFloat(producto.PrecioCompra).toFixed(2)}</td>
                      <td>
                        <Badge color={Number.parseInt(producto.Stock) <= 10 ? "red" : "green"} variant="light">
                          {producto.Stock}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          compact
                          variant="light"
                          color="blue"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProductoSeleccionado(producto);
                          }}
                        >
                          Seleccionar
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </ScrollArea>

          {productoSeleccionado && (
            <Box
              mb="md"
              p="md"
              sx={{
                backgroundColor: "rgba(34, 139, 230, 0.1)",
                borderRadius: "8px",
              }}
            >
              <Group position="apart" mb="xs">
                <Text weight={500}>Producto seleccionado: {productoSeleccionado.Descripcion}</Text>
                <Badge color="blue">
                  {productoSeleccionado.Codigo} - {productoSeleccionado.Medida}
                </Badge>
              </Group>
              <Group grow>
                <NumberInput label="Cantidad" value={cantidad} onChange={setCantidad} min={1} step={1} required />
                <Group position="right" mt="md">
                  <Button
                    variant="light"
                    color="red"
                    onClick={() => {
                      setProductoSeleccionado(null);
                      setCantidad(1);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button color="blue" onClick={agregarProducto}>
                    Agregar a la compra
                  </Button>
                </Group>
              </Group>
            </Box>
          )}
        </Paper>

        {/* Detalle de la Compra */}
        <Paper p="md" radius="md" withBorder>
          <Title order={4} mb="md">
            Detalle de la Compra
          </Title>

          {detallesCompra.length === 0 ? (
            <Text color="dimmed" align="center" py="xl">
              No hay productos agregados a la compra
            </Text>
          ) : (
            <>
              <ScrollArea h={200} mb="md">
                <Table striped highlightOnHover>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Descripción</th>
                      <th>Precio</th>
                      <th>Cantidad</th>
                      <th>Subtotal</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detallesCompra.map((detalle) => (
                      <tr key={detalle.IdProducto}>
                        <td>{detalle.CodigoProducto}</td>
                        <td>{detalle.DescripcionProducto}</td>
                        <td>$ {detalle.PrecioCompra.toFixed(2)}</td>
                        <td>{detalle.Cantidad}</td>
                        <td>$ {detalle.SubTotal.toFixed(2)}</td>
                        <td>
                          <Tooltip label="Eliminar producto">
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => eliminarProducto(detalle.IdProducto)}
                            >
                              <IconTrash size="1rem" />
                            </ActionIcon>
                          </Tooltip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </ScrollArea>

              <Divider my="md" />

              <Group position="apart">
                <Text size="lg" weight={700}>
                  Total:
                </Text>
                <Text size="lg" weight={700} color="blue">
                  $ {totalCompra.toFixed(2)} MXN
                </Text>
              </Group>
            </>
          )}
        </Paper>

        {/* Botones de Acción */}
        <Group position="right" mt="md">
          <Button variant="outline" color="gray" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button
            color="blue"
            leftIcon={<IconShoppingCart size={16} />}
            onClick={guardarCompra}
            disabled={detallesCompra.length === 0}
          >
            Registrar Compra
          </Button>
        </Group>
      </Flex>
    </Paper>
  );
}
"use client"

import {
  ActionIcon,
  Button,
  Flex,
  Paper,
  Title,
  Group,
  Text,
  Table,
  ScrollArea,
  Badge,
  Divider,
  LoadingOverlay,
  Grid,
  Card,
  Box,
} from "@mantine/core"
import {
  IconArrowLeft,
  IconShoppingCart,
  IconReceipt,
  IconTruckDelivery,
  IconCalendar,
  IconPackage,
  IconPrinter,
  IconFileDownload,
  IconCheck,
  IconBan,
  IconTrash,
} from "@tabler/icons-react"
import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import Swal from "sweetalert2"
import { obtenerCompraPorId, obtenerDetallesCompra, eliminarCompra } from "../services/CompraService"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { supabase } from "../../supabase/client"
import { getBase64ImageFromUrl } from "../services/GolbalService"

// Extend jsPDF to include lastAutoTable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: { finalY: number }
  }
}

export function DetalleCompra() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [compra, setCompra] = useState<any>(null)
  const [detalles, setDetalles] = useState<any[]>([])
  const [empresa, setEmpresa] = useState<any>(null)

  useEffect(() => {
    const cargarDatosEmpresa = async () => {
      try {
        const { data, error } = await supabase.from("empresas").select("*").limit(1)

        if (error) {
          console.error("Error al cargar datos de empresa:", error)
          return
        }

        if (data && data.length > 0) {
          setEmpresa(data[0])
        }
      } catch (err) {
        console.error("Error inesperado al cargar datos de empresa:", err)
      }
    }

    cargarDatosEmpresa()
  }, [])

  useEffect(() => {
    const fetchCompra = async () => {
      setLoading(true)
      try {
        // Obtener datos de la compra
        const compraData = await obtenerCompraPorId(Number(id))

        // Obtener detalles de la compra
        const detallesData = await obtenerDetallesCompra(Number(id))

        setCompra(compraData)
        setDetalles(detallesData)
      } catch (error) {
        console.error("Error al obtener datos de la compra:", error)
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar los datos de la compra",
        })
        navigate("/compras")
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchCompra()
  }, [id, navigate])

  // Formatear fecha
  const formatearFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr)
    return fecha.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Componente para renderizar estado
  const EstadoBadge = ({ activo }: { activo: boolean }) => {
    return activo ? (
      <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>
        Activa
      </Badge>
    ) : (
      <Badge color="red" variant="light" leftSection={<IconBan size={12} />}>
        Cancelada
      </Badge>
    )
  }

  // Cancelar compra
  const handleCancelarCompra = async () => {
    if (!compra?.Activo) return

    Swal.fire({
      title: `¿Estás seguro de cancelar la compra ${compra.NumeroDocumento}?`,
      text: "Esta acción reducirá el stock de los productos y no se puede revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "No cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await eliminarCompra(compra.IdCompra, true)
          Swal.fire("Cancelada", "La compra ha sido cancelada correctamente", "success")
          // Recargar datos
          const compraData = await obtenerCompraPorId(Number(id))
          setCompra(compraData)
        } catch (error) {
          console.error("Error al cancelar compra:", error)
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo cancelar la compra",
          })
        }
      }
    })
  }

  // Agregar marca de agua "CANCELADO" al PDF
  const agregarMarcaDeAguaCancelado = (doc: jsPDF) => {
    if (!compra || compra.Activo) return

    // Configurar estilo de la marca de agua - más claro
    doc.setTextColor(255, 100, 100) // Rojo más intenso para que se vea a través de la tabla
    doc.setFontSize(100) // Tamaño más grande
    doc.setFont("helvetica", "bold")

    // Obtener dimensiones de la página
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Posicionar y rotar el texto en el centro de la página
    doc.text("CANCELADO", 140, 240, {
      align: "center",
      angle: 45, // Rotación de 45 grados
    })

    // Restaurar color de texto para el resto del documento
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
  }

  // Imprimir comprobante
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
  
      // Agregar marca de agua si está cancelada (antes del contenido para que quede detrás)
      if (compraData.Activo === false) {
        agregarMarcaDeAguaCancelado(doc);
      }
  
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
  
      // Estado de la compra
      doc.setFontSize(12);
      doc.setTextColor(compraData.Activo !== false ? 0 : 255, 0, 0);
      doc.text(`Estado: ${compraData.Activo !== false ? "ACTIVA" : "CANCELADA"}`, 14, 30);
      doc.setTextColor(0, 0, 0);
  
      // Información de la empresa
      doc.setFontSize(10);
      doc.text(empresaInfo.nombre, 160, 20);
      doc.text(empresaInfo.direccion, 160, 25);
      doc.text(`Tel: ${empresaInfo.telefono}`, 160, 30);
  
      // Información de la compra - asegurando que los valores no sean undefined
      doc.setFontSize(12);
      doc.text(`Compra: ${compraData.NumeroDocumento || compraData.IdCompra || "N/A"}`, 14, 40);
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
        styles: {
          fontSize: 10,
          cellPadding: 3,
          fillColor: compraData.Activo !== false ? [255, 255, 255] : false, // Fondo blanco si está activa, transparente si está cancelada
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: [255, 255, 255],
        },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
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
      doc.text(`Compra #${compraData.IdCompra || compraData.NumeroDocumento || ""} - Generado el ${new Date().toLocaleString()}`, 105, 280, { align: "center" });
  
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
  
  // Función auxiliar para agregar marca de agua
  // (This duplicate declaration has been removed to avoid redeclaration errors)

  // Generar PDF
  const generarPDF = async () => {
    if (!compra || !detalles.length) return

    try {
      const doc = new jsPDF();
  
      // Configuración de la empresa
      const empresaInfo = {
        nombre: empresa?.nombre || "Mi Empresa",
        logo: empresa?.logo || "/logo.png",
        direccion: empresa?.direccion || "Dirección de la empresa",
        telefono: empresa?.telefono || "123-456-7890",
      };
  
      // Agregar marca de agua si está cancelada (antes del contenido para que quede detrás)
      if (compra.Activo === false) {
        agregarMarcaDeAguaCancelado(doc);
      }
  
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
  
      // Estado de la compra
      doc.setFontSize(12);
      doc.setTextColor(compra.Activo !== false ? 0 : 255, 0, 0);
      doc.text(`Estado: ${compra.Activo !== false ? "ACTIVA" : "CANCELADA"}`, 14, 30);
      doc.setTextColor(0, 0, 0);
  
      // Información de la empresa
      doc.setFontSize(10);
      doc.text(empresaInfo.nombre, 160, 20);
      doc.text(empresaInfo.direccion, 160, 25);
      doc.text(`Tel: ${empresaInfo.telefono}`, 160, 30);
  
      // Información de la compra - asegurando que los valores no sean undefined
      doc.setFontSize(12);
      doc.text(`Compra: ${compra.NumeroDocumento || compra.IdCompra || "N/A"}`, 14, 40);
      doc.text(`Fecha: ${compra.FechaRegistro ? formatearFecha(compra.FechaRegistro) : "N/A"}`, 14, 48);
      doc.text(`Usuario: ${compra.UsuarioRegistro || "Admin"}`, 14, 56);
  
      doc.text(`Proveedor: ${compra.NombreProveedor || "N/A"}`, 120, 40);
      doc.text(`ID Proveedor: ${compra.DocumentoProveedor || "N/A"}`, 120, 48);
      doc.text(`Productos: ${compra.length || 0}`, 120, 56);
  
      // Tabla de productos
      const tableColumn = ["Código", "Descripción", "Precio", "Cantidad", "Subtotal"];
      const tableRows = detalles.map((detalle: any) => [
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
        styles: {
          fontSize: 10,
          cellPadding: 3,
          fillColor: compra.Activo !== false ? [255, 255, 255] : false, // Fondo blanco si está activa, transparente si está cancelada
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: [255, 255, 255],
        },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
      });
  
      const finalY = doc.lastAutoTable?.finalY || 70;
  
      // Total
      const totalCompra = detalles.reduce(
        (total: number, detalle: any) => total + Number.parseFloat(detalle.PrecioCompra || 0) * (detalle.Cantidad || 0),
        0,
      );
  
      doc.setFontSize(12);
      doc.text(`Total: $ ${totalCompra.toFixed(2)} MXN`, 150, finalY + 10, {
        align: "right",
      });
  
      // Pie de página
      doc.setFontSize(10);
      doc.text(`Compra #${compra.IdCompra || compra.NumeroDocumento || ""} - Generado el ${new Date().toLocaleString()}`, 105, 280, { align: "center" });

      // Guardar PDF
      doc.save(`Compra_${compra.IdCompra}_${compra.NumeroDocumento}.pdf`)
    } catch (error) {
      console.error("Error al generar PDF:", error)
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo generar el PDF",
      })
    }
  }

  return (
    <Paper shadow="xs" p="xl" radius="md" w="100%" h="100%" pos="relative" id="comprobante-compra">
      <LoadingOverlay visible={loading} overlayBlur={2} />

      <Flex direction="column" h="100%" gap="xl">
        {/* Header */}
        <Flex w="100%" align="center" justify="space-between" className="no-print">
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
              Detalle de Compra
            </Title>
            {compra && <EstadoBadge activo={compra.Activo} />}
          </Group>
          <Group>
            <Button variant="light" color="green" leftIcon={<IconFileDownload size={16} />} onClick={generarPDF}>
              Descargar PDF
            </Button>
            <Button variant="light" color="blue" leftIcon={<IconPrinter size={16} />} onClick={() => imprimirComprobante(compra, detalles)}>
              Imprimir
            </Button>
            {compra?.Activo && (
              <Button variant="light" color="red" leftIcon={<IconTrash size={16} />} onClick={handleCancelarCompra}>
                Cancelar Compra
              </Button>
            )}
            <IconShoppingCart size={28} color="#228be6" />
          </Group>
        </Flex>

        {compra && (
          <>
            {/* Contenedor principal con marca de agua si está cancelada */}
            <Box
              sx={{
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Marca de agua CANCELADO para la vista en pantalla */}
              {!compra.Activo && (
                <Text
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%) rotate(-45deg)",
                    fontSize: "10rem",
                    fontWeight: 900,
                    color: "rgba(255, 0, 0, 0.07)", // Mucho más claro (7% opacidad)
                    whiteSpace: "nowrap",
                    zIndex: 0, // Asegura que esté detrás del contenido
                    pointerEvents: "none",
                    width: "150%",
                    textAlign: "center",
                  }}
                >
                  CANCELADO
                </Text>
              )}

              {/* Información de la Compra */}
              <Paper p="md" radius="md" withBorder sx={{ position: "relative", zIndex: 1 }}>
                <Flex justify="space-between" align="center" mb="md">
                  <Title order={3}>Comprobante de Compra</Title>
                  <EstadoBadge activo={compra.Activo} />
                </Flex>
                <Divider mb="md" />

                <Grid>
                  <Grid.Col span={6}>
                    <Card p="md" radius="md" withBorder>
                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          ID COMPRA:
                        </Text>
                        <Text weight={700}>{compra.IdCompra}</Text>
                      </Group>

                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          DOCUMENTO:
                        </Text>
                        <Group spacing="xs">
                          <IconReceipt size={16} color="#228be6" />
                          <Text weight={700}>{compra.NumeroDocumento}</Text>
                        </Group>
                      </Group>

                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          FECHA:
                        </Text>
                        <Group spacing="xs">
                          <IconCalendar size={16} color="#228be6" />
                          <Text>{formatearFecha(compra.FechaRegistro)}</Text>
                        </Group>
                      </Group>

                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          USUARIO:
                        </Text>
                        <Text>{compra.UsuarioRegistro}</Text>
                      </Group>
                    </Card>
                  </Grid.Col>

                  <Grid.Col span={6}>
                    <Card p="md" radius="md" withBorder>
                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          PROVEEDOR:
                        </Text>
                        <Group spacing="xs">
                          <IconTruckDelivery size={16} color="#228be6" />
                          <Text weight={500}>{compra.NombreProveedor}</Text>
                        </Group>
                      </Group>

                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          ID PROVEEDOR:
                        </Text>
                        <Text>{compra.DocumentoProveedor}</Text>
                      </Group>

                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          PRODUCTOS:
                        </Text>
                        <Badge color="blue">{compra.CantidadProductos}</Badge>
                      </Group>

                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          ESTADO:
                        </Text>
                        <EstadoBadge activo={compra.Activo} />
                      </Group>
                    </Card>
                  </Grid.Col>
                </Grid>
              </Paper>

              {/* Detalle de Productos */}
              <Paper p="md" radius="md" withBorder mt="md" sx={{ position: "relative", zIndex: 1 }}>
                <Group position="apart" mb="md">
                  <Title order={4}>Productos Comprados</Title>
                  <IconPackage size={24} color="#228be6" />
                </Group>

                <ScrollArea h={300} mb="md">
                  <Table striped highlightOnHover>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th>Descripción</th>
                        <th>Categoría</th>
                        <th>Medida</th>
                        <th>Precio Compra</th>
                        <th>Precio Venta</th>
                        <th>Cantidad</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalles.map((detalle) => (
                        <tr key={detalle.IdDetalleCompra}>
                          <td>{detalle.CodigoProducto}</td>
                          <td>{detalle.DescripcionProducto}</td>
                          <td>
                            <Badge color="teal" variant="light">
                              {detalle.CategoriaProducto}
                            </Badge>
                          </td>
                          <td>{detalle.MedidaProducto}</td>
                          <td>$ {Number.parseFloat(detalle.PrecioCompra).toFixed(2)}</td>
                          <td>$ {Number.parseFloat(detalle.PrecioVenta).toFixed(2)}</td>
                          <td>{detalle.Cantidad}</td>
                          <td>$ {Number.parseFloat(detalle.SubTotal).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </ScrollArea>

                <Divider my="md" />

                <Group position="right">
                  <Text size="xl" weight={700}>
                    Total:
                  </Text>
                  <Text size="xl" weight={700} color="blue">
                    $ {Number.parseFloat(compra.MontoTotal).toFixed(2)} MXN
                  </Text>
                </Group>
              </Paper>
            </Box>

            {/* Botones de Acción */}
            <Group position="right" mt="md" className="no-print">
              <Button variant="outline" color="gray" onClick={() => navigate("/compras")}>
                Volver a Compras
              </Button>
            </Group>
          </>
        )}
      </Flex>

      {/* Estilos para impresión */}
      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }
            
            @page {
              size: auto;
              margin: 10mm;
            }
          }
        `}
      </style>
    </Paper>
  )
}

"use client";

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
} from "@mantine/core";
import {
  IconArrowLeft,
  IconShoppingBag,
  IconReceipt,
  IconUser,
  IconCalendar,
  IconPackage,
  IconPrinter,
  IconFileDownload,
  IconCheck,
  IconBan,
  IconTrash,
  IconCreditCard,
  IconCash,
  IconDiscount,
  IconPercentage,
  IconClock,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
  obtenerVentaPorId,
  obtenerDetallesVenta,
  cancelarVenta,
} from "../services/VentaService";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../../supabase/client";
import { getBase64ImageFromUrl } from "../services/GolbalService";

// Extend jsPDF to include lastAutoTable
declare module "jspdf" {
  interface jsPDF {
    lastAutoTable?: { finalY: number };
  }
}

export function DetalleVenta() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [venta, setVenta] = useState<any>(null);
  const [detalles, setDetalles] = useState<any[]>([]);
  const [empresa, setEmpresa] = useState<any>(null);

  useEffect(() => {
    const cargarDatosEmpresa = async () => {
      try {
        const { data, error } = await supabase
          .from("empresas")
          .select("*")
          .limit(1);

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

  useEffect(() => {
    const fetchVenta = async () => {
      setLoading(true);
      try {
        // Obtener datos de la venta
        const ventaData = await obtenerVentaPorId(Number(id));

        // Obtener detalles de la venta
        const detallesData = await obtenerDetallesVenta(Number(id));

        // Agregar campos para compatibilidad con la vista de nueva venta
        const detallesConCamposAdicionales = detallesData.map((detalle) => ({
          ...detalle,
          PrecioModificado: false, // Por defecto asumimos que no hay precios modificados
          PrecioOriginal: detalle.PrecioVenta, // Por defecto el precio original es el mismo que el de venta
        }));

        setVenta(ventaData);
        setDetalles(detallesConCamposAdicionales);
      } catch (error) {
        console.error("Error al obtener datos de la venta:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "No se pudieron cargar los datos de la venta",
        });
        navigate("/ventas");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchVenta();
  }, [id, navigate]);

  // Formatear fecha
  const formatearFecha = (fechaStr: string) => {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Componente para renderizar estado de venta
  const EstadoBadge = ({ estatus }: { estatus: string }) => {
    // Normalizamos el estatus a mayúsculas para evitar problemas de comparación
    const estadoNormalizado = estatus.toUpperCase();

    switch (estadoNormalizado) {
      case "COMPLETADO":
        return (
          <Badge
            color="green"
            variant="light"
            leftSection={<IconCheck size={12} />}
          >
            Completada
          </Badge>
        );
      case "PENDIENTE":
        return (
          <Badge
            color="yellow"
            variant="light"
            leftSection={<IconClock size={12} />}
          >
            Pendiente
          </Badge>
        );
      case "CANCELADO":
        return (
          <Badge
            color="red"
            variant="light"
            leftSection={<IconBan size={12} />}
          >
            Cancelada
          </Badge>
        );
      default:
        return (
          <Badge color="gray" variant="light">
            {estatus}
          </Badge>
        );
    }
  };

  // Cancelar venta
  const handleCancelarVenta = async () => {
    if (venta?.Estatus === "CANCELADO") return;

    Swal.fire({
      title: `¿Estás seguro de cancelar la venta ${venta.NumeroDocumento}?`,
      text: "Esta acción restaurará el stock de los productos y no se puede revertir",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, cancelar",
      cancelButtonText: "No cancelar",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await cancelarVenta(venta.IdVenta, true);
          Swal.fire(
            "Cancelada",
            "La venta ha sido cancelada correctamente",
            "success"
          );
          // Recargar datos
          const ventaData = await obtenerVentaPorId(Number(id));
          setVenta(ventaData);
        } catch (error) {
          console.error("Error al cancelar venta:", error);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo cancelar la venta",
          });
        }
      }
    });
  };

  // Agregar marca de agua "CANCELADO" al PDF
  const agregarMarcaDeAguaCancelado = (doc: jsPDF) => {
    if (!venta || venta.Estatus !== "CANCELADO") return;

    // Configurar estilo de la marca de agua - más claro
    doc.setTextColor(255, 100, 100); // Rojo más intenso para que se vea a través de la tabla
    doc.setFontSize(100); // Tamaño más grande
    doc.setFont("helvetica", "bold");

    // Obtener dimensiones de la página
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Posicionar y rotar el texto en el centro de la página
    doc.text("CANCELADO", 140, 240, {
      align: "center",
      angle: 45, // Rotación de 45 grados
    });

    // Restaurar color de texto para el resto del documento
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
  };

  // Calcular subtotal (suma de todos los productos)
  const calcularSubtotal = () => {
    return detalles.reduce(
      (total, detalle) => total + Number(detalle.SubTotal),
      0
    );
  };

  // Calcular descuento general
  const calcularDescuentoGeneral = () => {
    if (!venta || Number(venta.Porcentaje) <= 0) return 0;

    const totalSinPrecioModificado = detalles
      .filter((detalle) => !detalle.PrecioModificado)
      .reduce((total, detalle) => total + Number(detalle.SubTotal), 0);

    return (totalSinPrecioModificado * Number(venta.Porcentaje)) / 100;
  };

  // Calcular subtotal con descuento aplicado
  const calcularSubtotalConDescuento = () => {
    const subtotal = calcularSubtotal();
    const descuento = calcularDescuentoGeneral();
    return subtotal - descuento;
  };

  // Calcular IVA (sobre el subtotal con descuento)
  const calcularIVA = () => {
    const subtotalConDescuento = calcularSubtotalConDescuento();
    return (subtotalConDescuento * Number(venta?.Iva || 0)) / 100;
  };

  // Calcular total final (subtotal con descuento + IVA)
  const calcularTotalFinal = () => {
    const subtotalConDescuento = calcularSubtotalConDescuento();
    const iva = calcularIVA();
    return subtotalConDescuento + iva;
  };

  // Método para obtener todos los valores del desglose
  const getDesglosePrecios = () => {
    const subtotal = calcularSubtotal();
    const descuentoGeneral = calcularDescuentoGeneral();
    const subtotalConDescuento = calcularSubtotalConDescuento();
    const iva = calcularIVA();
    const totalFinal = calcularTotalFinal();

    return {
      subtotal,
      descuentoGeneral,
      subtotalConDescuento,
      iva,
      totalFinal,
      mostrarDescuento: descuentoGeneral > 0,
    };
  };

  // Imprimir comprobante
  const imprimirComprobante = async (ventaData: any, detallesData: any) => {
    if (!ventaData || !detallesData.length) return;

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
      doc.text("Comprobante de Venta", 105, 15, { align: "center" });

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

      // Información de la venta
      doc.setFontSize(12);
      doc.text(`Venta: ${ventaData.NumeroDocumento || "N/A"}`, 14, 40);
      doc.text(
        `Fecha: ${
          ventaData.FechaRegistro
            ? formatearFecha(ventaData.FechaRegistro)
            : "N/A"
        }`,
        14,
        48
      );
      doc.text(`Usuario: ${ventaData.UsuarioRegistro || "Admin"}`, 14, 56);
      doc.text(`Empleado: ${ventaData.Empleado || "N/A"}`, 14, 64);

      doc.text(`Cliente: ${ventaData.NombreCliente || "N/A"}`, 120, 40);
      doc.text(`ID Cliente: ${ventaData.DocumentoCliente || "N/A"}`, 120, 48);
      doc.text(`Productos: ${detallesData.length || 0}`, 120, 56);
      doc.text(`IVA: ${ventaData.Iva || 0}%`, 120, 64);

      // Calcular subtotal (suma de todos los productos)
      const subtotal = detallesData.reduce(
        (total: number, detalle: any) =>
          total + Number.parseFloat(detalle.SubTotal || 0),
        0
      );

      // Calcular descuento general si existe
      let descuentoGeneral = 0;
      let mostrarDescuentoGeneral = true;

      if (Number(ventaData.Porcentaje) > 0) {
        // Si solo hay un producto y tiene precio modificado, no mostrar descuento
        if (detallesData.length === 1 && detallesData[0].PrecioModificado) {
          mostrarDescuentoGeneral = false;
        } else {
          // Calcular el total de productos sin precio modificado
          const totalSinPrecioModificado = detallesData
            .filter((detalle: any) => !detalle.PrecioModificado)
            .reduce(
              (total: number, detalle: any) =>
                total + Number.parseFloat(detalle.SubTotal || 0),
              0
            );

          descuentoGeneral =
            (totalSinPrecioModificado * Number(ventaData.Porcentaje)) / 100;

          // Si no hay productos sin precio modificado, no mostrar descuento
          if (totalSinPrecioModificado === 0) {
            mostrarDescuentoGeneral = false;
          }
        }
      } else {
        mostrarDescuentoGeneral = false;
      }

      // Calcular subtotal con descuento
      const subtotalConDescuento = mostrarDescuentoGeneral
        ? subtotal - descuentoGeneral
        : subtotal;

      // Calcular IVA sobre el subtotal con descuento
      const iva = Math.round(
        (subtotalConDescuento * Number(ventaData.Iva || 0)) / 100
      );

      // Calcular total final (subtotal con descuento + IVA)
      const totalFinal = subtotalConDescuento + iva;

      // Tabla de productos
      const tableColumn = [
        "Código",
        "Descripción",
        "Precio",
        "Cantidad",
        "Descuento",
        "Subtotal",
      ];

      // Filas de productos
      const tableRows = detallesData.map((detalle: any) => {
        if (Number(detalle.DescuentoP) > 0 && !detalle.PrecioModificado) {
          const precioOriginal = Number.parseFloat(
            detalle.PrecioOriginal || detalle.PrecioVenta
          );
          const descuentoMonto =
            (precioOriginal * Number(detalle.DescuentoP)) / 100;
          const precioConDescuento = precioOriginal - descuentoMonto;

          return [
            detalle.CodigoProducto || "N/A",
            detalle.DescripcionProducto || "N/A",
            `$ ${precioOriginal.toFixed(2)} (-${detalle.DescuentoP}%)`,
            detalle.Cantidad || 0,
            `$ ${descuentoMonto.toFixed(2)}`,
            `$ ${Number.parseFloat(detalle.SubTotal || 0).toFixed(2)}`,
          ];
        } else {
          return [
            detalle.CodigoProducto || "N/A",
            detalle.DescripcionProducto || "N/A",
            `$ ${Number.parseFloat(detalle.PrecioVenta || 0).toFixed(2)}${
              detalle.PrecioModificado ? "*" : ""
            }`,
            detalle.Cantidad || 0,
            `${detalle.DescuentoP || 0}%`,
            `$ ${Number.parseFloat(detalle.SubTotal || 0).toFixed(2)}`,
          ];
        }
      });

      // Filas de totales
      const totalRows = [
        ["", "", "", "", "Subtotal:", `$ ${subtotal.toFixed(2)}`],
      ];

      // Agregar fila de descuento si aplica
      if (mostrarDescuentoGeneral && descuentoGeneral > 0) {
        totalRows.push([
          "",
          "",
          "",
          "",
          `Descuento (${ventaData.Porcentaje}%):`,
          `- $ ${descuentoGeneral.toFixed(2)}`,
        ]);
        totalRows.push([
          "",
          "",
          "",
          "",
          "Subtotal con descuento:",
          `$ ${subtotalConDescuento.toFixed(2)}`,
        ]);
      }

      // Agregar fila de IVA si aplica
      if (Number(ventaData.Iva) > 0) {
        totalRows.push([
          "",
          "",
          "",
          "",
          `IVA (${ventaData.Iva}%):`,
          `$ ${iva.toFixed(2)}`,
        ]);
      }

      // Agregar fila de total (ahora incluye IVA)
      totalRows.push(["", "", "", "", "Total:", `$ ${totalFinal.toFixed(2)}`]);

      // Renderizar tabla de productos
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 72,
        theme: "grid",
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: { fillColor: [66, 139, 202] },
      });

      const finalY = doc.lastAutoTable?.finalY || 70;

      // Renderizar tabla de totales
      autoTable(doc, {
        body: totalRows,
        startY: finalY + 5,
        theme: "plain",
        styles: {
          fontSize: 10,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 60 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 30, halign: "right", fontStyle: "bold" },
          5: { cellWidth: 30, halign: "right", fontStyle: "bold" },
        },
        margin: { left: 15 },
      });

      const finalTotalsY = doc.lastAutoTable?.finalY || finalY + 5;

      // Método de pago
      doc.setFontSize(11);
      doc.text(
        `Método de pago: ${
          ventaData.TPago === "TARJETA"
            ? "Tarjeta"
            : ventaData.TPago === "EFECTIVO"
            ? "Efectivo"
            : "Credito"
        }`,
        14,
        finalTotalsY + 15
      );

      // Información de pago (si es efectivo)
      if (ventaData.TPago === "EFECTIVO" && ventaData.PagoCon) {
        doc.text(
          `Pagó con: $ ${Number.parseFloat(ventaData.PagoCon).toFixed(2)} MXN`,
          14,
          finalTotalsY + 25
        );
        doc.text(
          `Cambio: $ ${Number.parseFloat(ventaData.Cambio).toFixed(2)} MXN`,
          14,
          finalTotalsY + 35
        );
      }

      // Estado de la venta
      doc.text(`Estado: ${ventaData.Estatus}`, 14, finalTotalsY + 50);

      // Pie de página
      doc.setFontSize(10);
      doc.text(
        `Documento generado el ${new Date().toLocaleString()}`,
        105,
        280,
        { align: "center" }
      );

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

  // Generar PDF
  const generarPDF = async () => {
    if (!venta || !detalles.length) return;

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
      if (venta.Estatus === "CANCELADO") {
        agregarMarcaDeAguaCancelado(doc);
      }

      // Título
      doc.setFontSize(18);
      doc.text("Comprobante de Venta", 105, 15, { align: "center" });

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

      // Información de la venta - asegurando que los valores no sean undefined
      doc.setFontSize(12);
      doc.text(
        `Venta: ${venta.NumeroDocumento || venta.IdVenta || "N/A"}`,
        14,
        40
      );
      doc.text(
        `Fecha: ${
          venta.FechaRegistro ? formatearFecha(venta.FechaRegistro) : "N/A"
        }`,
        14,
        48
      );
      doc.text(`Usuario: ${venta.UsuarioRegistro || "Admin"}`, 14, 56);
      doc.text(`Empleado: ${venta.Empleado || "N/A"}`, 14, 64);

      doc.text(`Cliente: ${venta.NombreCliente || "N/A"}`, 120, 40);
      doc.text(`ID Cliente: ${venta.DocumentoCliente || "N/A"}`, 120, 48);
      doc.text(`Productos: ${detalles.length || 0}`, 120, 56);
      doc.text(`IVA: ${venta.Iva || 0}%`, 120, 64);

      // Estado de la venta
      doc.setFontSize(12);
      doc.setTextColor(venta.Estatus !== "CANCELADO" ? 0 : 255, 0, 0);
      doc.text(
        `Estado: ${venta.Estatus !== "CANCELADO" ? "COMPLETADA" : "CANCELADA"}`,
        14,
        72
      );
      doc.setTextColor(0, 0, 0);

      // Calcular subtotal (suma de todos los productos)
      const subtotal = detalles.reduce(
        (total: number, detalle: any) =>
          total + Number.parseFloat(detalle.SubTotal || 0),
        0
      );

      // Calcular descuento general si existe
      let descuentoGeneral = 0;
      let mostrarDescuentoGeneral = true;

      if (Number(venta.Porcentaje) > 0) {
        // Si solo hay un producto y tiene precio modificado, no mostrar descuento
        if (detalles.length === 1 && detalles[0].PrecioModificado) {
          mostrarDescuentoGeneral = false;
        } else {
          // Calcular el total de productos sin precio modificado
          const totalSinPrecioModificado = detalles
            .filter((detalle: any) => !detalle.PrecioModificado)
            .reduce(
              (total: number, detalle: any) =>
                total + Number.parseFloat(detalle.SubTotal || 0),
              0
            );

          descuentoGeneral =
            (totalSinPrecioModificado * Number(venta.Porcentaje)) / 100;

          // Si no hay productos sin precio modificado, no mostrar descuento
          if (totalSinPrecioModificado === 0) {
            mostrarDescuentoGeneral = false;
          }
        }
      } else {
        mostrarDescuentoGeneral = false;
      }

      // Calcular IVA
      const iva = Math.round(
        (Number(venta.MontoTotal) * Number(venta.Iva || 0)) / 100
      );

      // Tabla de productos
      const tableColumn = [
        "Código",
        "Descripción",
        "Precio",
        "Cantidad",
        "Descuento",
        "Subtotal",
      ];

      // Filas de productos
      const tableRows = detalles.map((detalle: any) => {
        // Para productos con descuento individual, mostrar precio original y descuento
        if (Number(detalle.DescuentoP) > 0 && !detalle.PrecioModificado) {
          const precioOriginal = Number.parseFloat(
            detalle.PrecioOriginal || detalle.PrecioVenta
          );
          const descuentoMonto =
            (precioOriginal * Number(detalle.DescuentoP)) / 100;
          const precioConDescuento = precioOriginal - descuentoMonto;

          return [
            detalle.CodigoProducto || "N/A",
            detalle.DescripcionProducto || "N/A",
            `$ ${precioOriginal.toFixed(2)} (-${detalle.DescuentoP}%)`,
            detalle.Cantidad || 0,
            `$ ${descuentoMonto.toFixed(2)}`,
            `$ ${Number.parseFloat(detalle.SubTotal || 0).toFixed(2)}`,
          ];
        } else {
          return [
            detalle.CodigoProducto || "N/A",
            detalle.DescripcionProducto || "N/A",
            `$ ${Number.parseFloat(detalle.PrecioVenta || 0).toFixed(2)}${
              detalle.PrecioModificado ? "*" : ""
            }`,
            detalle.Cantidad || 0,
            `${detalle.DescuentoP || 0}%`,
            `$ ${Number.parseFloat(detalle.SubTotal || 0).toFixed(2)}`,
          ];
        }
      });

      // Filas de totales
      const totalRows = [
        ["", "", "", "", "Subtotal:", `$ ${subtotal.toFixed(2)}`],
      ];

      // Agregar fila de descuento si aplica
      if (mostrarDescuentoGeneral && descuentoGeneral > 0) {
        totalRows.push([
          "",
          "",
          "",
          "",
          `Descuento (${venta.Porcentaje}%):`,
          `- $ ${descuentoGeneral.toFixed(2)}`,
        ]);
      }

      // Agregar fila de IVA si aplica
      if (Number(venta.Iva) > 0) {
        totalRows.push([
          "",
          "",
          "",
          "",
          `IVA (${venta.Iva}%):`,
          `$ ${iva.toFixed(2)}`,
        ]);
      }

      // Agregar fila de total
      totalRows.push([
        "",
        "",
        "",
        "",
        "Total:",
        `$ ${Number(venta.MontoTotal).toFixed(2)}`,
      ]);

      // Renderizar tabla de productos
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 80,
        theme: "grid",
        styles: {
          fontSize: 10,
          cellPadding: 3,
          fillColor: venta.Estatus !== "CANCELADO" ? [255, 255, 255] : false,
        },
        headStyles: {
          fillColor: [66, 139, 202],
          textColor: [255, 255, 255],
        },
        tableLineColor: [200, 200, 200],
        tableLineWidth: 0.1,
      });

      const finalY = doc.lastAutoTable?.finalY || 80;

      // Renderizar tabla de totales
      autoTable(doc, {
        body: totalRows,
        startY: finalY + 5,
        theme: "plain",
        styles: {
          fontSize: 10,
          cellPadding: 2,
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 60 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 30, halign: "right", fontStyle: "bold" },
          5: { cellWidth: 30, halign: "right", fontStyle: "bold" },
        },
        margin: { left: 15 },
      });

      const finalTotalsY = doc.lastAutoTable?.finalY || finalY + 5;

      // Método de pago
      doc.setFontSize(11);
      doc.text(
        `Método de pago: ${
          venta.TPago === "TARJETA"
            ? "Tarjeta"
            : venta.TPago === "EFECTIVO"
            ? "Efectivo"
            : "Crédito"
        }`,
        14,
        finalTotalsY + 15
      );

      // Información de pago (si es efectivo)
      if (venta.TPago === "EFECTIVO" && venta.PagoCon) {
        doc.text(
          `Pagó con: $ ${Number.parseFloat(venta.PagoCon).toFixed(2)} MXN`,
          14,
          finalTotalsY + 25
        );
        doc.text(
          `Cambio: $ ${Number.parseFloat(venta.Cambio).toFixed(2)} MXN`,
          14,
          finalTotalsY + 35
        );
      }

      // Pie de página
      doc.setFontSize(10);
      doc.text(
        `Venta #${
          venta.IdVenta || venta.NumeroDocumento || ""
        } - Generado el ${new Date().toLocaleString()}`,
        105,
        280,
        { align: "center" }
      );

      // Guardar PDF
      doc.save(`Venta_${venta.IdVenta}_${venta.NumeroDocumento}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo generar el PDF",
      });
    }
  };

  return (
    <Paper
      shadow="xs"
      p="xl"
      radius="md"
      w="100%"
      h="100%"
      pos="relative"
      id="comprobante-venta"
    >
      <LoadingOverlay visible={loading} overlayBlur={2} />

      <Flex direction="column" h="100%" gap="xl">
        {/* Header */}
        <Flex
          w="100%"
          align="center"
          justify="space-between"
          className="no-print"
        >
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
              Detalle de Venta
            </Title>
            {venta && <EstadoBadge estatus={venta.Estatus} />}
          </Group>
          <Group>
            <Button
              variant="light"
              color="green"
              leftIcon={<IconFileDownload size={16} />}
              onClick={generarPDF}
            >
              Descargar PDF
            </Button>
            <Button
              variant="light"
              color="blue"
              leftIcon={<IconPrinter size={16} />}
              onClick={() => imprimirComprobante(venta, detalles)}
            >
              Imprimir
            </Button>
            {venta?.Estatus !== "CANCELADO" && (
              <Button
                variant="light"
                color="red"
                leftIcon={<IconTrash size={16} />}
                onClick={handleCancelarVenta}
              >
                Cancelar Venta
              </Button>
            )}
            <IconShoppingBag size={28} color="#228be6" />
          </Group>
        </Flex>

        {venta && (
          <>
            {/* Contenedor principal con marca de agua si está cancelada */}
            <Box
              sx={{
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Marca de agua CANCELADO para la vista en pantalla */}
              {venta.Estatus === "CANCELADO" && (
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

              {/* Información de la Venta */}
              <Paper
                p="md"
                radius="md"
                withBorder
                sx={{ position: "relative", zIndex: 1 }}
              >
                <Flex justify="space-between" align="center" mb="md">
                  <Title order={3}>Comprobante de Venta</Title>
                  <EstadoBadge estatus={venta.Estatus} />
                </Flex>
                <Divider mb="md" />

                <Grid>
                  <Grid.Col span={6}>
                    <Card p="md" radius="md" withBorder>
                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          ID VENTA:
                        </Text>
                        <Text weight={700}>{venta.IdVenta}</Text>
                      </Group>

                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          DOCUMENTO:
                        </Text>
                        <Group spacing="xs">
                          <IconReceipt size={16} color="#228be6" />
                          <Text weight={700}>{venta.NumeroDocumento}</Text>
                        </Group>
                      </Group>

                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          FECHA:
                        </Text>
                        <Group spacing="xs">
                          <IconCalendar size={16} color="#228be6" />
                          <Text>{formatearFecha(venta.FechaRegistro)}</Text>
                        </Group>
                      </Group>

                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          USUARIO:
                        </Text>
                        <Text>{venta.UsuarioRegistro}</Text>
                      </Group>
                    </Card>
                  </Grid.Col>

                  <Grid.Col span={6}>
                    <Card p="md" radius="md" withBorder>
                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          CLIENTE:
                        </Text>
                        <Group spacing="xs">
                          <IconUser size={16} color="#228be6" />
                          <Text weight={500}>{venta.NombreCliente}</Text>
                        </Group>
                      </Group>

                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          ID CLIENTE:
                        </Text>
                        <Text>{venta.DocumentoCliente}</Text>
                      </Group>

                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          MÉTODO DE PAGO:
                        </Text>
                        <Group spacing="xs">
                          {venta.TPago === "TARJETA" ? (
                            <IconCreditCard size={16} color="#228be6" />
                          ) : (
                            <IconCash size={16} color="#228be6" />
                          )}
                          <Text>
                            {venta.TPago === "TARJETA"
                              ? "Tarjeta"
                              : venta.TPago === "EFECTIVO"
                              ? "Efectivo"
                              : "Crédito"}
                          </Text>
                        </Group>
                      </Group>

                      <Group position="apart" mb="xs">
                        <Text weight={700} color="dimmed" size="sm">
                          ESTADO:
                        </Text>
                        <EstadoBadge estatus={venta.Estatus} />
                      </Group>
                    </Card>
                  </Grid.Col>
                </Grid>
              </Paper>

              {/* Detalle de Productos */}
              <Paper
                p="md"
                radius="md"
                withBorder
                mt="md"
                sx={{ position: "relative", zIndex: 1 }}
              >
                <Group position="apart" mb="md">
                  <Title order={4}>Productos Vendidos</Title>
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
                        <th>Precio Venta</th>
                        <th>Cantidad</th>
                        <th>Descuento</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalles.map((detalle) => (
                        <tr key={detalle.IdDetalleVenta}>
                          <td>{detalle.CodigoProducto}</td>
                          <td>{detalle.DescripcionProducto}</td>
                          <td>
                            <Badge color="teal" variant="light">
                              {detalle.CategoriaProducto}
                            </Badge>
                          </td>
                          <td>{detalle.MedidaProducto}</td>
                          <td>
                            ${" "}
                            {Number.parseFloat(detalle.PrecioVenta).toFixed(2)}
                          </td>
                          <td>{detalle.Cantidad}</td>
                          <td>{detalle.DescuentoP}%</td>
                          <td>
                            $ {Number.parseFloat(detalle.SubTotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </ScrollArea>

                <Divider my="md" />

                {/* Tabla de totales */}
                <Table
                  striped={false}
                  highlightOnHover={false}
                  style={{ maxWidth: "400px", marginLeft: "auto" }}
                >
                  <tbody>
                    <tr>
                      <td style={{ textAlign: "right", fontWeight: "bold" }}>
                        Subtotal:
                      </td>
                      <td style={{ textAlign: "right" }}>
                        $ {calcularSubtotal().toFixed(2)} MXN
                      </td>
                    </tr>

                    {calcularDescuentoGeneral() > 0 && (
                      <>
                        <tr>
                          <td
                            style={{ textAlign: "right", fontWeight: "bold" }}
                          >
                            Descuento ({venta.Porcentaje}%):
                          </td>
                          <td style={{ textAlign: "right", color: "red" }}>
                            - $ {calcularDescuentoGeneral().toFixed(2)} MXN
                          </td>
                        </tr>
                        <tr>
                          <td
                            style={{ textAlign: "right", fontWeight: "bold" }}
                          >
                            Subtotal con descuento:
                          </td>
                          <td style={{ textAlign: "right" }}>
                            $ {calcularSubtotalConDescuento().toFixed(2)} MXN
                          </td>
                        </tr>
                      </>
                    )}

                    {Number(venta?.Iva) > 0 && (
                      <tr>
                        <td style={{ textAlign: "right", fontWeight: "bold" }}>
                          IVA ({venta.Iva}%):
                        </td>
                        <td style={{ textAlign: "right" }}>
                          $ {calcularIVA().toFixed(2)} MXN
                        </td>
                      </tr>
                    )}

                    <tr style={{ backgroundColor: "#f0f8ff" }}>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: "bold",
                          fontSize: "1.1em",
                        }}
                      >
                        Total:
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: "bold",
                          fontSize: "1.1em",
                          color: "#228be6",
                        }}
                      >
                        $ {calcularTotalFinal().toFixed(2)} MXN
                      </td>
                    </tr>
                  </tbody>
                </Table>

                {Number(venta?.Porcentaje) > 0 &&
                  detalles.some((d) => d.PrecioModificado) && (
                    <Text size="xs" color="dimmed" italic align="right" mt={5}>
                      * El descuento general no se aplica a productos con precio
                      modificado
                    </Text>
                  )}
              </Paper>

              {/* Reglas de descuento */}
              <Paper
                p="md"
                radius="md"
                withBorder
                mt="md"
                sx={{ position: "relative", zIndex: 1 }}
              >
                <Group position="apart" mb="md">
                  <Title order={4}>Reglas de Descuento</Title>
                  <IconDiscount size={24} color="#228be6" />
                </Group>

                <Text size="sm">
                  <IconPercentage
                    size={14}
                    style={{
                      marginRight: 5,
                      display: "inline-block",
                      verticalAlign: "middle",
                    }}
                  />
                  No se pueden aplicar descuentos por producto cuando hay
                  descuento general
                </Text>
                <Text size="sm" mt={5}>
                  <IconPercentage
                    size={14}
                    style={{
                      marginRight: 5,
                      display: "inline-block",
                      verticalAlign: "middle",
                    }}
                  />
                  No se pueden aplicar descuentos a productos con precio
                  modificado
                </Text>
                <Text size="sm" mt={5}>
                  <IconPercentage
                    size={14}
                    style={{
                      marginRight: 5,
                      display: "inline-block",
                      verticalAlign: "middle",
                    }}
                  />
                  El descuento general no afecta a productos con precio
                  modificado
                </Text>
              </Paper>
            </Box>

            {/* Botones de Acción */}
            <Group position="right" mt="md" className="no-print">
              <Button
                variant="outline"
                color="gray"
                onClick={() => navigate("/ventas")}
              >
                Volver a Ventas
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
  );
}

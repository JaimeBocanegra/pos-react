"use client"

import { useRef, useState, useEffect } from "react"
import {
  Paper,
  Title,
  Group,
  Button,
  Text,
  Select,
  NumberInput,
  Stack,
  Grid,
  Box,
  Checkbox,
  TextInput,
  ScrollArea,
  LoadingOverlay,
  Alert,
  Tabs,
  Divider,
  Radio,
} from "@mantine/core"
import JsBarcode from "jsbarcode"
import { jsPDF } from "jspdf"
import { IconPrinter, IconSettings, IconInfoCircle, IconDownload, IconBarcode, IconRuler } from "@tabler/icons-react"
import { obtenerProductos } from "../Pages/services/ProductoService"

interface BarcodeSettings {
  format: string
  width: number
  height: number
  fontSize: number
  margin: number
  displayValue: boolean
  includeText: boolean
  includePrice: boolean
  columns: number
  copies: number
}

interface DocumentSize {
  width: number
  height: number
  unit: "mm" | "in"
  orientation: "portrait" | "landscape"
  preset: string
}

interface ProductWithBarcode {
  Id_producto: number
  Codigo: string
  Descripcion: string
  PrecioVenta: string
  selected: boolean
  copies: number
}

export function BarcodeGenerator() {
  const [products, setProducts] = useState<ProductWithBarcode[]>([])
  const [filteredProducts, setFilteredProducts] = useState<ProductWithBarcode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectAll, setSelectAll] = useState(false)
  const [barcodesReady, setBarcodesReady] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("general")
  const [settings, setSettings] = useState<BarcodeSettings>({
    format: "CODE128",
    width: 2,
    height: 100,
    fontSize: 14,
    margin: 10,
    displayValue: true,
    includeText: true,
    includePrice: true,
    columns: 3,
    copies: 1,
  })

  const [documentSize, setDocumentSize] = useState<DocumentSize>({
    width: 210,
    height: 297,
    unit: "mm",
    orientation: "portrait",
    preset: "a4"
  })

  const printRef = useRef<HTMLDivElement>(null)
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true)
        const data = await obtenerProductos()
        const productsWithSelection = data.map((product: any) => ({
          ...product,
          selected: false,
          copies: 1,
        }))
        setProducts(productsWithSelection)
        setFilteredProducts(productsWithSelection)
      } catch (error) {
        console.error("Error al cargar productos:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProducts()
  }, [])

  useEffect(() => {
    if (!searchTerm) {
      setFilteredProducts(products)
      return
    }

    const searchLower = searchTerm.toLowerCase()
    const filtered = products.filter(
      (product) =>
        product.Codigo.toLowerCase().includes(searchLower) || product.Descripcion.toLowerCase().includes(searchLower),
    )
    setFilteredProducts(filtered)
  }, [searchTerm, products])

  useEffect(() => {
    setBarcodesReady(false)
    const selectedProducts = filteredProducts.filter((p) => p.selected)
    if (selectedProducts.length === 0) return

    canvasRefs.current = []

    const timer = setTimeout(() => {
      let allGenerated = true
      selectedProducts.forEach((product) => {
        for (let copy = 0; copy < product.copies; copy++) {
          const canvasId = `barcode-${product.Id_producto}-${copy}`
          const canvas = document.getElementById(canvasId) as HTMLCanvasElement

          if (canvas) {
            canvasRefs.current.push(canvas)
            try {
              JsBarcode(canvas, product.Codigo, {
                format: settings.format,
                width: settings.width,
                height: settings.height,
                displayValue: settings.displayValue,
                fontSize: settings.fontSize,
                margin: settings.margin,
                textMargin: 2,
              })
            } catch (error) {
              console.error(`Error al generar código de barras para ${product.Codigo}:`, error)
              allGenerated = false
              const ctx = canvas.getContext("2d")
              if (ctx) {
                ctx.font = "12px Arial"
                ctx.fillStyle = "red"
                ctx.fillText("Error: Código inválido", 10, 20)
              }
            }
          } else {
            allGenerated = false
          }
        }
      })

      setBarcodesReady(allGenerated)
    }, 300)

    return () => clearTimeout(timer)
  }, [filteredProducts, settings])

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    setFilteredProducts(
      filteredProducts.map((product) => ({
        ...product,
        selected: checked,
      })),
    )
  }

  const handleSelectProduct = (id: number, checked: boolean) => {
    setFilteredProducts(
      filteredProducts.map((product) => {
        if (product.Id_producto === id) {
          return { ...product, selected: checked }
        }
        return product
      }),
    )

    const updatedProducts = filteredProducts.map((p) => (p.Id_producto === id ? { ...p, selected: checked } : p))
    setSelectAll(updatedProducts.every((p) => p.selected) && updatedProducts.length > 0)
  }

  const handleCopiesChange = (id: number, value: number) => {
    setFilteredProducts(
      filteredProducts.map((product) => {
        if (product.Id_producto === id) {
          return { ...product, copies: value }
        }
        return product
      }),
    )
  }

  const handlePresetChange = (preset: string) => {
    const newSize: DocumentSize = { ...documentSize, preset }
    
    switch (preset) {
      case "a4":
        newSize.width = 210
        newSize.height = 297
        newSize.unit = "mm"
        newSize.orientation = "portrait"
        break
      case "letter":
        newSize.width = 8.5
        newSize.height = 11
        newSize.unit = "in"
        newSize.orientation = "portrait"
        break
      case "half-letter":
        newSize.width = 5.5
        newSize.height = 8.5
        newSize.unit = "in"
        newSize.orientation = "portrait"
        break
      case "label-sheet":
        newSize.width = 210
        newSize.height = 297
        newSize.unit = "mm"
        newSize.orientation = "portrait"
        break
      case "custom":
        break
    }
    
    setDocumentSize(newSize)
  }

  const handlePrint = async () => {
    if (!barcodesReady) {
      setTimeout(handlePrint, 500);
      return;
    }

    const selectedProducts = filteredProducts.filter((p) => p.selected);
    if (selectedProducts.length === 0) return;

    console.log("Tamaño de documento configurado:", {
      width: documentSize.width,
      height: documentSize.height,
      unit: documentSize.unit,
      orientation: documentSize.orientation
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("No se pudo abrir la ventana de impresión. Por favor, desbloquea los popups para este sitio.");
      return;
    }

    // Convertir unidades a pulgadas para CSS
    const widthIn = documentSize.unit === "mm" ? documentSize.width / 25.4 : documentSize.width;
    const heightIn = documentSize.unit === "mm" ? documentSize.height / 25.4 : documentSize.height;

    let printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Códigos de Barras</title>
        <style>
          @page {
            size: ${widthIn}in ${heightIn}in;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            width: ${widthIn}in;
            height: ${heightIn}in;
          }
          .barcode-sheet {
            display: grid;
            grid-template-columns: repeat(${settings.columns}, 1fr);
            gap: ${settings.margin}mm;
            padding: ${settings.margin}mm;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
          }
          .barcode-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            page-break-inside: avoid;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          .product-name {
            font-size: ${settings.fontSize - 2}px;
            margin-top: 2mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            max-width: 100%;
          }
          .product-price {
            font-size: ${settings.fontSize}px;
            font-weight: bold;
            color: #228be6;
            margin-top: 1mm;
          }
          @media print {
            body {
              width: ${widthIn}in !important;
              height: ${heightIn}in !important;
            }
            .barcode-sheet {
              width: ${widthIn}in !important;
              height: ${heightIn}in !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="barcode-sheet">
    `;

    selectedProducts.forEach((product) => {
      for (let copy = 0; copy < product.copies; copy++) {
        const canvasId = `barcode-${product.Id_producto}-${copy}`;
        const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

        if (canvas) {
          const imgData = canvas.toDataURL("image/png");
          printContent += `
            <div class="barcode-item">
              <img src="${imgData}" alt="${product.Codigo}">
          `;

          if (settings.includeText) {
            printContent += `<div class="product-name">${product.Descripcion}</div>`;
          }

          if (settings.includePrice) {
            printContent += `<div class="product-price">$${Number(product.PrecioVenta).toFixed(2)}</div>`;
          }

          printContent += `</div>`;
        }
      }
    });

    printContent += `
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              // Forzar configuración de página antes de imprimir
              const style = document.createElement('style');
              style.innerHTML = \`
                @page {
                  size: ${widthIn}in ${heightIn}in;
                  margin: 0;
                }
                @media print {
                  body {
                    width: ${widthIn}in !important;
                    height: ${heightIn}in !important;
                  }
                }
              \`;
              document.head.appendChild(style);
              
              window.print();
              window.close();
            }, 200);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleDownloadPDF = () => {
    if (!barcodesReady) {
      console.log("Esperando a que los códigos de barras estén listos...");
      setTimeout(handleDownloadPDF, 500);
      return;
    }

    const selectedProducts = filteredProducts.filter((p) => p.selected);
    if (selectedProducts.length === 0) return;

    try {
      const doc = new jsPDF({
        orientation: documentSize.orientation,
        unit: documentSize.unit,
        format: [documentSize.width, documentSize.height],
        hotfixes: ["px_scaling"]
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = settings.margin / 2;
      const availableWidth = pageWidth - margin * 2;

      const columnWidth = availableWidth / settings.columns;

      let currentX = margin;
      let currentY = margin;
      let maxHeightInRow = 0;
      let columnCount = 0;
      let pageCount = 1;

      selectedProducts.forEach((product) => {
        for (let copy = 0; copy < product.copies; copy++) {
          const canvasId = `barcode-${product.Id_producto}-${copy}`;
          const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

          if (canvas) {
            const imgData = canvas.toDataURL("image/png");
            const canvasRatio = canvas.height / canvas.width;
            const imgWidth = columnWidth - 2;
            const imgHeight = imgWidth * canvasRatio;

            if (columnCount >= settings.columns) {
              currentX = margin;
              currentY += maxHeightInRow + 4;
              maxHeightInRow = 0;
              columnCount = 0;

              if (
                currentY + imgHeight + (settings.includeText ? 5 : 0) + (settings.includePrice ? 5 : 0) >
                pageHeight
              ) {
                doc.addPage([documentSize.width, documentSize.height], documentSize.orientation);
                pageCount++;
                currentY = margin;
              }
            }

            doc.addImage(imgData, "PNG", currentX, currentY, imgWidth, imgHeight);

            let textY = currentY + imgHeight + 2;
            const fontSizeMultiplier = Math.min(1, pageWidth / 100);

            if (settings.includeText) {
              const textFontSize = Math.max(6, settings.fontSize - 2) * fontSizeMultiplier;
              doc.setFontSize(textFontSize);
              doc.setTextColor(0, 0, 0);

              const textWidth = (doc.getStringUnitWidth(product.Descripcion) * textFontSize) / doc.internal.scaleFactor;
              let displayText = product.Descripcion;

              if (textWidth > imgWidth) {
                const ratio = imgWidth / textWidth;
                const maxChars = Math.floor(product.Descripcion.length * ratio) - 3;
                displayText = product.Descripcion.substring(0, maxChars) + "...";
              }

              doc.text(displayText, currentX + imgWidth / 2, textY, { align: "center" });
              textY += 3 * fontSizeMultiplier;
            }

            if (settings.includePrice) {
              const priceFontSize = Math.max(7, settings.fontSize) * fontSizeMultiplier;
              doc.setFontSize(priceFontSize);
              doc.setTextColor(34, 139, 230);
              doc.setFont("helvetica", "bold");
              doc.text(`$${Number(product.PrecioVenta).toFixed(2)}`, currentX + imgWidth / 2, textY, {
                align: "center",
              });
              textY += 3 * fontSizeMultiplier;
            }

            const totalHeight = textY - currentY;
            if (totalHeight > maxHeightInRow) {
              maxHeightInRow = totalHeight;
            }

            currentX += columnWidth;
            columnCount++;
          }
        }
      });

      doc.save("codigos_barras.pdf");
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Error al generar el PDF. Por favor, intenta de nuevo.");
    }
  };

  const selectedProducts = filteredProducts.filter((p) => p.selected);
  const totalBarcodes = selectedProducts.reduce((sum, product) => sum + product.copies, 0);
  const columnWidth = `${100 / settings.columns}%`;
  const hasSelectedProducts = selectedProducts.length > 0;

  return (
    <Paper shadow="xs" p="md" radius="md" w="100%" pos="relative">
      <LoadingOverlay visible={loading} overlayBlur={2} />

      <Group position="apart" mb="md">
        <Group>
          <IconBarcode size={24} color="#228be6" />
          <Title order={2}>Generador de Códigos de Barras</Title>
        </Group>
        <Group>
          <Button leftIcon={<IconPrinter size={16} />} onClick={handlePrint} disabled={!hasSelectedProducts}>
            Imprimir
          </Button>
          <Button
            leftIcon={<IconDownload size={16} />}
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={!hasSelectedProducts}
          >
            Descargar PDF
          </Button>
        </Group>
      </Group>

      <Grid>
        <Grid.Col span={6}>
          <Paper withBorder p="md" radius="md">
            <Group position="apart" mb="md">
              <Title order={4}>Selección de Productos</Title>
              <TextInput
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.currentTarget.value)}
                style={{ width: "60%" }}
              />
            </Group>

            <Group mb="md">
              <Checkbox
                label="Seleccionar todos"
                checked={selectAll}
                onChange={(e) => handleSelectAll(e.currentTarget.checked)}
              />
              <Text color="dimmed" size="sm">
                {selectedProducts.length} productos seleccionados ({totalBarcodes} códigos)
              </Text>
            </Group>

            <ScrollArea style={{ height: 400 }}>
              <Stack spacing="xs">
                {filteredProducts.map((product) => (
                  <Group key={product.Id_producto} position="apart" p="xs" style={{ borderBottom: "1px solid #eee" }}>
                    <Group>
                      <Checkbox
                        checked={product.selected}
                        onChange={(e) => handleSelectProduct(product.Id_producto, e.currentTarget.checked)}
                      />
                      <div>
                        <Text weight={500}>{product.Descripcion}</Text>
                        <Text size="xs" color="dimmed">
                          Código: {product.Codigo}
                        </Text>
                      </div>
                    </Group>
                    <Group>
                      <Text size="sm" color="blue">
                        ${Number(product.PrecioVenta).toFixed(2)}
                      </Text>
                      <NumberInput
                        label="Copias"
                        value={product.copies}
                        onChange={(val) => handleCopiesChange(product.Id_producto, Number(val) || 1)}
                        min={1}
                        max={100}
                        style={{ width: 80 }}
                        disabled={!product.selected}
                      />
                    </Group>
                  </Group>
                ))}
              </Stack>
            </ScrollArea>
          </Paper>
        </Grid.Col>

        <Grid.Col span={6}>
          <Paper withBorder p="md" radius="md" mb="md">
            <Tabs value={activeTab} onTabChange={(value) => setActiveTab(value || "general")}>
              <Tabs.List>
                <Tabs.Tab value="general" icon={<IconSettings size={16} />}>
                  General
                </Tabs.Tab>
                <Tabs.Tab value="document" icon={<IconRuler size={16} />}>
                  Tamaño del Documento
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="general" pt="md">
                <Grid>
                  <Grid.Col span={6}>
                    <Select
                      label="Formato"
                      value={settings.format}
                      onChange={(value) => setSettings({ ...settings, format: value || "CODE128" })}
                      data={[
                        { value: "CODE128", label: "CODE128 (Estándar)" },
                        { value: "EAN13", label: "EAN-13" },
                        { value: "EAN8", label: "EAN-8" },
                        { value: "UPC", label: "UPC" },
                        { value: "CODE39", label: "CODE39" },
                      ]}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Columnas"
                      value={settings.columns}
                      onChange={(val) => setSettings({ ...settings, columns: Number(val) || 3 })}
                      min={1}
                      max={5}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Ancho de barras"
                      value={settings.width}
                      onChange={(val) => setSettings({ ...settings, width: Number(val) || 2 })}
                      min={1}
                      max={5}
                      step={0.5}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Alto de barras"
                      value={settings.height}
                      onChange={(val) => setSettings({ ...settings, height: Number(val) || 100 })}
                      min={30}
                      max={150}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Tamaño de fuente"
                      value={settings.fontSize}
                      onChange={(val) => setSettings({ ...settings, fontSize: Number(val) || 14 })}
                      min={8}
                      max={24}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Margen"
                      value={settings.margin}
                      onChange={(val) => setSettings({ ...settings, margin: Number(val) || 10 })}
                      min={5}
                      max={50}
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <Group>
                      <Checkbox
                        label="Mostrar código"
                        checked={settings.displayValue}
                        onChange={(e) => setSettings({ ...settings, displayValue: e.currentTarget.checked })}
                      />
                      <Checkbox
                        label="Incluir descripción"
                        checked={settings.includeText}
                        onChange={(e) => setSettings({ ...settings, includeText: e.currentTarget.checked })}
                      />
                      <Checkbox
                        label="Incluir precio"
                        checked={settings.includePrice}
                        onChange={(e) => setSettings({ ...settings, includePrice: e.currentTarget.checked })}
                      />
                    </Group>
                  </Grid.Col>
                </Grid>
              </Tabs.Panel>

              <Tabs.Panel value="document" pt="md">
                <Text size="sm" mb="md">
                  Configura el tamaño del documento para impresión y PDF:
                </Text>

                <Radio.Group
                  value={documentSize.preset}
                  onChange={handlePresetChange}
                  name="documentPreset"
                  label="Tamaños predefinidos"
                  mb="md"
                >
                  <Group mt="xs">
                    <Radio value="a4" label="A4 (210 × 297 mm)" />
                    <Radio value="letter" label="Carta (8.5 × 11 in)" />
                    <Radio value="half-letter" label="Media carta (5.5 × 8.5 in)" />
                    <Radio value="label-sheet" label="Hoja de etiquetas (A4 con márgenes)" />
                    <Radio value="custom" label="Personalizado" />
                  </Group>
                </Radio.Group>

                <Divider my="md" label="Tamaño personalizado" labelPosition="center" />

                <Grid>
                  <Grid.Col span={6}>
                    <NumberInput
                      label={`Ancho (${documentSize.unit})`}
                      value={documentSize.width}
                      onChange={(val) => setDocumentSize({
                        ...documentSize,
                        width: Number(val) || 210,
                        preset: "custom"
                      })}
                      min={50}
                      max={1000}
                      step={1}
                      precision={2}
                      disabled={documentSize.preset !== "custom"}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      label={`Alto (${documentSize.unit})`}
                      value={documentSize.height}
                      onChange={(val) => setDocumentSize({
                        ...documentSize,
                        height: Number(val) || 297,
                        preset: "custom"
                      })}
                      min={50}
                      max={1000}
                      step={1}
                      precision={2}
                      disabled={documentSize.preset !== "custom"}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Select
                      label="Unidad"
                      value={documentSize.unit}
                      onChange={(val) =>
                        setDocumentSize({ ...documentSize, unit: (val as "mm" | "in") || "mm", preset: "custom" })
                      }
                      data={[
                        { value: "mm", label: "Milímetros (mm)" },
                        { value: "in", label: "Pulgadas (in)" },
                      ]}
                      disabled={documentSize.preset !== "custom"}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Select
                      label="Orientación"
                      value={documentSize.orientation}
                      onChange={(val) =>
                        setDocumentSize({
                          ...documentSize,
                          orientation: val as "portrait" | "landscape",
                          preset: "custom"
                        })
                      }
                      data={[
                        { value: "portrait", label: "Vertical" },
                        { value: "landscape", label: "Horizontal" },
                      ]}
                    />
                  </Grid.Col>
                </Grid>

                <Alert color="blue" title="Nota sobre impresión" mt="md">
                  Para obtener mejores resultados, asegúrate de que la configuración de impresión del navegador coincida
                  con el tamaño de documento seleccionado. Si tienes problemas con el tamaño, prueba a descargar el PDF.
                </Alert>
              </Tabs.Panel>
            </Tabs>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group mb="md">
              <IconInfoCircle size={20} />
              <Title order={4}>Vista Previa</Title>
            </Group>

            {!hasSelectedProducts ? (
              <Alert color="blue" title="Sin productos seleccionados">
                Seleccione al menos un producto para generar códigos de barras
              </Alert>
            ) : (
              <ScrollArea style={{ height: 250 }}>
                <Box style={{ display: "flex", flexWrap: "wrap" }}>
                  {selectedProducts.slice(0, 3).map((product) => (
                    <Box
                      key={product.Id_producto}
                      style={{
                        width: columnWidth,
                        padding: "10px",
                        boxSizing: "border-box",
                        textAlign: "center",
                      }}
                    >
                      <canvas id={`barcode-${product.Id_producto}-0`} />
                      {settings.includeText && (
                        <Text size="xs" mt={5} lineClamp={1}>
                          {product.Descripcion}
                        </Text>
                      )}
                      {settings.includePrice && (
                        <Text size="xs" weight={500} color="blue">
                          ${Number(product.PrecioVenta).toFixed(2)}
                        </Text>
                      )}
                    </Box>
                  ))}
                </Box>
                {selectedProducts.length > 3 && (
                  <Text align="center" color="dimmed" size="sm" mt="md">
                    Y {totalBarcodes - 3} códigos más...
                  </Text>
                )}
              </ScrollArea>
            )}
          </Paper>
        </Grid.Col>
      </Grid>

      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {selectedProducts.map((product) =>
              Array.from({ length: product.copies }).map((_, copyIndex) => (
                <div
                  key={`print-${product.Id_producto}-${copyIndex}`}
                  style={{
                    width: `${100 / settings.columns}%`,
                    padding: "5mm",
                    boxSizing: "border-box",
                    pageBreakInside: "avoid",
                    textAlign: "center",
                  }}
                >
                  <canvas id={`barcode-${product.Id_producto}-${copyIndex}`} />
                </div>
              )),
            )}
          </div>
        </div>
      </div>
    </Paper>
  )
}
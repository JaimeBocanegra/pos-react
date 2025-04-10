import { supabase } from "../../supabase/client"
import * as XLSX from "xlsx"

interface Producto {
  Id_producto: number
  Codigo: string
  Descripcion: string
  Categoria: string
  Medida: string
  PrecioCompra: number
  PrecioVenta: number
  Stock: number
}

export const obtenerProductos = async (): Promise<Producto[]> => {
  const { data, error } = await supabase.from("Productos").select("*").order("Id_producto")
  if (error) throw new Error(error.message)
  return data
}

export const obtenerProductoPorId = async (id: number): Promise<Producto> => {
  const { data, error } = await supabase.from("Productos").select("*").eq("Id_producto", id).single()
  if (error) throw new Error(error.message)
  return data
}

export const actualizarProducto = async (
  Id_producto: number,
  Codigo: string,
  Descripcion: string,
  Categoria: string,
  Medida: string,
  PrecioCompra: number,
  PrecioVenta: number,
  Stock: number,
): Promise<void> => {
  const { error } = await supabase
    .from("Productos")
    .update({
      Codigo,
      Descripcion,
      Categoria,
      Medida,
      PrecioCompra,
      PrecioVenta,
      Stock,
    })
    .eq("Id_producto", Id_producto)
  if (error) throw new Error(error.message)
}

export const eliminarProducto = async (id: number): Promise<void> => {
  const { error } = await supabase.from("Productos").delete().eq("Id_producto", id)
  if (error) throw new Error(error.message)
}

export const agregarProducto = async (
  Codigo: string,
  Descripcion: string,
  Categoria: string,
  Medida: string,
  PrecioCompra: number,
  PrecioVenta: number,
  Stock: number,
): Promise<void> => {
  const { error } = await supabase
    .from("Productos")
    .insert([{ Codigo, Descripcion, Categoria, Medida, PrecioCompra, PrecioVenta, Stock }])
  if (error) throw new Error(error.message)
}

// Define the ImportCallOptions type
interface ImportCallOptions {
  skipDuplicates: boolean
  updateExisting?: boolean
  sumStock?: boolean
}

// Define the ImportResult type
interface ImportResult {
  inserted: number
  updated: number
  stockAdded: number
  skipped: number
  errors: string[]
  total: number
}

export const importarProductos = async (file: File, options: ImportCallOptions): Promise<ImportResult> => {
  try {
    // Leer archivo Excel
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    // Validar que el archivo tenga datos
    if (!jsonData.length) {
      throw new Error("El archivo no contiene datos")
    }

    // Definir las columnas esperadas según la plantilla de descarga
    const expectedColumns = ["Codigo", "Descripcion", "Categoria", "Medida", "PrecioCompra", "PrecioVenta", "Stock"]

    // Verificar que el archivo tenga todas las columnas esperadas
    const firstRow = jsonData[0] as any
    const missingColumns = expectedColumns.filter((col) => !(col in firstRow))

    if (missingColumns.length > 0) {
      throw new Error(
        `El archivo no contiene todas las columnas esperadas según la plantilla. ` +
          `Columnas faltantes: ${missingColumns.join(", ")}. ` +
          `Por favor, utilice la plantilla de descarga proporcionada por el sistema.`,
      )
    }

    // Validar campos requeridos (algunos pueden ser opcionales como Stock)
    const requiredFields = ["Codigo", "Descripcion", "Categoria", "Medida", "PrecioCompra", "PrecioVenta"]
    const missingFields = requiredFields.filter((field) => !(field in firstRow))

    if (missingFields.length > 0) {
      throw new Error(`Faltan campos requeridos: ${missingFields.join(", ")}`)
    }

    // Preparar y validar datos
    const productos = jsonData.map((item: any, index) => {
      const rowNumber = index + 2
      const producto = {
        Codigo: item.Codigo?.toString()?.trim() || "",
        Descripcion: item.Descripcion?.toString()?.trim() || "",
        Categoria: item.Categoria?.toString()?.trim() || "",
        Medida: item.Medida?.toString()?.trim() || "Pieza",
        PrecioCompra: Number(item.PrecioCompra) || 0,
        PrecioVenta: Number(item.PrecioVenta) || 0,
        Stock: Number(item.Stock) || 0,
        rowNumber,
      }

      // Validaciones
      const errors: string[] = []
      if (!producto.Codigo) errors.push(`Fila ${rowNumber}: Código es requerido`)
      if (!producto.Descripcion) errors.push(`Fila ${rowNumber}: Descripción es requerida`)
      if (producto.PrecioCompra <= 0) errors.push(`Fila ${rowNumber}: Precio compra debe ser mayor a 0`)
      if (producto.PrecioVenta <= 0) errors.push(`Fila ${rowNumber}: Precio venta debe ser mayor a 0`)
      if (producto.PrecioVenta < producto.PrecioCompra) {
        errors.push(`Fila ${rowNumber}: Precio venta no puede ser menor al precio compra`)
      }

      return { ...producto, errors }
    })

    // Verificar errores de validación
    const validationErrors = productos.flatMap((p) => p.errors)
    if (validationErrors.length > 0) {
      throw new Error(
        validationErrors.slice(0, 5).join("\n") +
          (validationErrors.length > 5 ? `\n...y ${validationErrors.length - 5} más` : ""),
      )
    }

    // Obtener productos existentes
    const { data: existingProducts, error: fetchError } = await supabase
      .from("Productos")
      .select("Id_producto, Codigo, Descripcion, Categoria, Medida, PrecioCompra, PrecioVenta, Stock")

    if (fetchError) throw fetchError

    const existingMap = new Map(existingProducts?.map((p) => [p.Codigo, p]) || [])

    // Separar productos nuevos y existentes
    const newProducts = productos.filter((p) => !existingMap.has(p.Codigo))
    const existingProductsData = productos.filter((p) => existingMap.has(p.Codigo))

    let insertedCount = 0
    let updatedCount = 0
    let stockAddedCount = 0
    let skippedCount = 0

    // 1. Insertar nuevos productos
    if (newProducts.length > 0) {
      const productsToInsert = newProducts.map(({ rowNumber, errors, ...product }) => product)
      const { data: insertedData, error: insertError } = await supabase
        .from("Productos")
        .insert(productsToInsert)
        .select()

      if (insertError) throw new Error(`Error insertando nuevos productos: ${insertError.message}`)
      insertedCount = insertedData?.length || 0
    }

    // 2. Procesar productos existentes según las opciones
    if (options.skipDuplicates) {
      skippedCount = existingProductsData.length
    } else {
      // Preparar operaciones según la opción seleccionada
      if (options.updateExisting) {
        // Actualizar toda la información
        const updates = existingProductsData.map((producto) => {
          const existing = existingMap.get(producto.Codigo)
          return {
            ...producto,
            Id_producto: existing?.Id_producto,
          }
        })

        const { data: updatedData, error: updateError } = await supabase
          .from("Productos")
          .upsert(updates.map(({ rowNumber, errors, ...rest }) => rest))
          .select()

        if (updateError) throw new Error(`Error actualizando productos: ${updateError.message}`)
        updatedCount = updatedData?.length || 0
      } else if (options.sumStock) {
        // Solo sumar al stock existente
        const stockUpdates = existingProductsData.map((producto) => {
          const existing = existingMap.get(producto.Codigo)
          return {
            Id_producto: existing?.Id_producto,
            Stock: (existing?.Stock || 0) + producto.Stock,
          }
        })

        const { data: updatedData, error: updateError } = await supabase.from("Productos").upsert(stockUpdates).select()

        if (updateError) throw new Error(`Error actualizando stock: ${updateError.message}`)
        stockAddedCount = updatedData?.length || 0
      }
    }

    return {
      inserted: insertedCount,
      updated: updatedCount,
      stockAdded: stockAddedCount,
      skipped: skippedCount,
      errors: [],
      total: productos.length,
    }
  } catch (error: any) {
    console.error("Error en importarProductos:", error)
    return {
      inserted: 0,
      updated: 0,
      stockAdded: 0,
      skipped: 0,
      errors: [error.message],
      total: 0,
    }
  }
}

import { supabase } from "../../supabase/client";
import * as XLSX from "xlsx"


interface Producto {
  Id_producto: number;
  Codigo: string;
  Descripcion: string;
  Categoria: string;
  Medida: string;
  PrecioCompra: number;
  PrecioVenta: number;
  Stock: number;
}

export const obtenerProductos = async (): Promise<Producto[]> => {
  const { data, error } = await supabase
    .from("Productos")
    .select("*")
    .order("Id_producto");
  if (error) throw new Error(error.message);
  return data;
};

export const obtenerProductoPorId = async (id: number): Promise<Producto> => {
  const { data, error } = await supabase
    .from("Productos")
    .select("*")
    .eq("Id_producto", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

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
        Stock
    })
    .eq("Id_producto", Id_producto);
  if (error) throw new Error(error.message);
};

export const eliminarProducto = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from("Productos")
    .delete()
    .eq("Id_producto", id);
  if (error) throw new Error(error.message);
};

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
    .insert([{ Codigo, Descripcion, Categoria, Medida, PrecioCompra, PrecioVenta, Stock }]);
  if (error) throw new Error(error.message);
};

export const importarProductos = async (file: File) => {
  try {
    // Leer el archivo Excel
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    // Validar estructura básica
    if (!jsonData.length) {
      throw new Error("El archivo no contiene datos")
    }

    const requiredFields = ["Codigo", "Descripcion", "Categoria", "Medida", "PrecioCompra", "PrecioVenta"]
    const firstRow = jsonData[0] as any

    for (const field of requiredFields) {
      if (!(field in firstRow)) {
        throw new Error(`El archivo no tiene el campo requerido: ${field}`)
      }
    }

    // Preparar datos para inserción
    const productos = jsonData.map((item: any) => ({
      Codigo: item.Codigo?.toString() || "",
      Descripcion: item.Descripcion?.toString() || "",
      Categoria: item.Categoria?.toString() || "",
      Medida: item.Medida?.toString() || "Pieza",
      PrecioCompra: Number(item.PrecioCompra) || 0,
      PrecioVenta: Number(item.PrecioVenta) || 0,
      Stock: Number(item.Stock) || 0,
    }))

    // Validar datos
    const errors = []
    for (let i = 0; i < productos.length; i++) {
      const producto = productos[i]

      if (!producto.Codigo) {
        errors.push(`Fila ${i + 2}: Código es requerido`)
      }
      if (!producto.Descripcion) {
        errors.push(`Fila ${i + 2}: Descripción es requerida`)
      }
      if (producto.PrecioCompra <= 0) {
        errors.push(`Fila ${i + 2}: Precio de compra debe ser mayor a 0`)
      }
      if (producto.PrecioVenta <= 0) {
        errors.push(`Fila ${i + 2}: Precio de venta debe ser mayor a 0`)
      }
      if (producto.PrecioVenta < producto.PrecioCompra) {
        errors.push(`Fila ${i + 2}: Precio de venta no puede ser menor al precio de compra`)
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Errores encontrados:\n${errors.slice(0, 5).join("\n")}${
          errors.length > 5 ? `\n...y ${errors.length - 5} más` : ""
        }`
      )
    }

    // Insertar en lotes para evitar timeout
    const batchSize = 100
    let insertedCount = 0

    for (let i = 0; i < productos.length; i += batchSize) {
      const batch = productos.slice(i, i + batchSize)
      const { data, error } = await supabase.from("Productos").insert(batch).select()

      if (error) {
        console.error("Error en lote:", error)
        throw new Error(`Error al insertar productos: ${error.message}`)
      }

      insertedCount += data?.length || 0
    }

    return { success: true, count: insertedCount }
  } catch (error: any) {
    console.error("Error en importarProductos:", error)
      throw new Error(error.message || "Error al procesar el archivo de productos")
    }
  };

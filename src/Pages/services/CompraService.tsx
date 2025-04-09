import { supabase } from "../../supabase/client"
import { obtenerProductos } from "./ProductoService"

// Interfaces para tipado
export interface Compra {
  IdCompra?: number
  NumeroDocumento: string
  FechaRegistro: string
  UsuarioRegistro: string
  DocumentoProveedor: string
  NombreProveedor: string
  CantidadProductos: string
  MontoTotal: string
}

export interface DetalleCompra {
  IdDetalleCompra?: number
  IdCompra: number
  IdProducto: number
  CodigoProducto: string
  DescripcionProducto: string
  CategoriaProducto: string
  MedidaProducto: string
  PrecioCompra: string
  PrecioVenta: string
  Cantidad: number
  SubTotal: string
}

// Obtener todas las compras
export const obtenerCompras = async () => {
  const { data, error } = await supabase.from("COMPRA").select("*").order("IdCompra", { ascending: false })

  if (error) {
    console.error("Error al obtener compras:", error)
    throw error
  }

  return data || []
}

// Obtener una compra por ID
export const obtenerCompraPorId = async (id: number) => {
  const { data, error } = await supabase.from("COMPRA").select("*").eq("IdCompra", id).single()

  if (error) {
    console.error("Error al obtener compra:", error)
    throw error
  }

  return data
}

// Obtener detalles de una compra
export const obtenerDetallesCompra = async (idCompra: number) => {
  const { data, error } = await supabase.from("DETALLE_COMPRA").select("*").eq("IdCompra", idCompra)

  if (error) {
    console.error("Error al obtener detalles de compra:", error)
    throw error
  }

  return data || []
}

// Crear una nueva compra
export const crearCompra = async (compra: Compra, detalles: Omit<DetalleCompra, "IdCompra">[]) => {
  // 1. Insertar encabezado de compra
  const { data: compraInsertada, error: errorCompra } = await supabase.from("COMPRA").insert([compra]).select()

  if (errorCompra) {
    console.error("Error al crear compra:", errorCompra)
    throw errorCompra
  }

  const idCompra = compraInsertada[0].IdCompra

  // 2. Insertar detalles de compra
  const detallesConIdCompra = detalles.map((detalle) => ({
    ...detalle,
    IdCompra: idCompra,
  }))

  const { error: errorDetalles } = await supabase.from("DETALLE_COMPRA").insert(detallesConIdCompra)

  if (errorDetalles) {
    console.error("Error al insertar detalles de compra:", errorDetalles)
    throw errorDetalles
  }

  // 3. Actualizar stock de productos
  const productos = await obtenerProductos()

  for (const detalle of detalles) {
    const producto = productos.find((p) => p.Id_producto === detalle.IdProducto)
    if (producto) {
      const nuevoStock = producto.Stock + detalle.Cantidad

      const { error: errorStock } = await supabase
        .from("Productos")
        .update({ Stock: nuevoStock.toString() })
        .eq("Id_producto", detalle.IdProducto)

      if (errorStock) throw errorStock
    }
  }

  return { idCompra, compra: compraInsertada[0] }
}

// Eliminar una compra
export const eliminarCompra = async (idCompra: number, reducirStock = false) => {
    const { error } = await supabase
      .from('COMPRA')
      .update({ Activo: false })
      .eq('IdCompra', idCompra)
      .select('*, DETALLE_COMPRA(*, Productos(*))');
  
    if (error) throw error;
  
    if (reducirStock) {
      const { data: compra } = await supabase
        .from('COMPRA')
        .select('*, DETALLE_COMPRA(*, Productos(*))')
        .eq('IdCompra', idCompra)
        .single();
  
      if (!compra) throw new Error('Compra no encontrada');
  
      for (const detalle of compra.DETALLE_COMPRA) {
        const nuevoStock = Math.max(0, detalle.Productos.Stock - detalle.Cantidad);
        const { error: stockError } = await supabase
          .from('Productos')
          .update({ Stock: nuevoStock })
          .eq('Id_producto', detalle.IdProducto);
  
        if (stockError) throw stockError;
      }
    }
  
    return true;
  };
  

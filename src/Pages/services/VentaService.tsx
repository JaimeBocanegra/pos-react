import { supabase } from "../../supabase/client"
import { obtenerProductos } from "./ProductoService"

// Interfaces for typing
export interface Venta {
  IdVenta?: number
  NumeroDocumento: string
  FechaRegistro: string
  UsuarioRegistro: string
  DocumentoCliente: string
  NombreCliente: string
  CantidadProductos: string
  MontoTotal: string
  PagoCon: string
  Cambio: string
  Comentario: string
  Estatus: string
  Porcentaje: string
  Iva: string
  NumEmpleado: string
  Empleado: string
  TPago: string
}

export interface DetalleVenta {
  IdDetalleVenta?: number
  IdVenta: number
  IdProducto: number
  CodigoProducto: string
  DescripcionProducto: string
  CategoriaProducto: string
  MedidaProducto: string
  PrecioVenta: string
  Cantidad: number
  SubTotal: string
  DescuentoP: string
  PrecioOriginal?: string
  PrecioModificado?: boolean
}

// Get all sales
export const obtenerVentas = async () => {
  const { data, error } = await supabase.from("VENTA").select("*").order("IdVenta", { ascending: false })

  if (error) {
    console.error("Error al obtener ventas:", error)
    throw error
  }

  return data || []
}

// Get a sale by ID
export const obtenerVentaPorId = async (id: number) => {
  const { data, error } = await supabase.from("VENTA").select("*").eq("IdVenta", id).single()

  if (error) {
    console.error("Error al obtener venta:", error)
    throw error
  }

  return data
}

// Get details of a sale
export const obtenerDetallesVenta = async (idVenta: number) => {
  const { data, error } = await supabase.from("DETALLE_VENTA").select("*").eq("IdVenta", idVenta)

  if (error) {
    console.error("Error al obtener detalles de venta:", error)
    throw error
  }

  return data || []
}

// NEW OPTIMIZED FUNCTION: Get details for multiple sales at once
export const obtenerDetallesVentaMultiple = async (idsVenta: number[]) => {
  if (!idsVenta.length) return []
  
  const { data, error } = await supabase
    .from("DETALLE_VENTA")
    .select("*")
    .in("IdVenta", idsVenta)

  if (error) {
    console.error("Error al obtener detalles de ventas múltiples:", error)
    throw error
  }

  return data || []
}

// Create a new sale
export const crearVenta = async (venta: any, detallesData: any[]) => {
  try {
    // 1. Insert sale header
    const { data: ventaInsertada, error: errorVenta } = await supabase.from("VENTA").insert([venta]).select()

    if (errorVenta) {
      console.error("Error al crear venta:", errorVenta)
      throw errorVenta
    }

    const idVenta = ventaInsertada[0].IdVenta

    // 2. Insert sale details
    const detallesConIdVenta = detallesData.map((detalle) => ({
      ...detalle,
      IdVenta: idVenta,
    }))

    const { error: errorDetalles } = await supabase.from("DETALLE_VENTA").insert(detallesConIdVenta)

    if (errorDetalles) {
      console.error("Error al insertar detalles de venta:", errorDetalles)
      throw errorDetalles
    }

    // 3. Update product stock (reduce) only if the sale is COMPLETED
    if (venta.Estatus === "COMPLETADO") {
      await actualizarStockProductos(detallesData, false)
    }

    return { idVenta, venta: ventaInsertada[0] }
  } catch (error) {
    console.error("Error en crearVenta:", error)
    throw error
  }
}

// Update an existing sale
export const actualizarVenta = async (idVenta: number, venta: any, detallesData: any[]) => {
  try {
    // 1. Get the current state of the sale
    const { data: ventaActual, error: errorVentaActual } = await supabase
      .from("VENTA")
      .select("*")
      .eq("IdVenta", idVenta)
      .single()

    if (errorVentaActual) {
      console.error("Error al obtener venta actual:", errorVentaActual)
      throw errorVentaActual
    }

    // Check if the sale is completed (cannot be edited)
    if (ventaActual.Estatus === "COMPLETADO") {
      throw new Error("No se puede editar una venta que ya está completada")
    }

    // 2. Get current details to restore stock if necessary
    const detallesActuales = await obtenerDetallesVenta(idVenta)

    // 3. Update sale header
    const { data: ventaActualizada, error: errorVenta } = await supabase
      .from("VENTA")
      .update(venta)
      .eq("IdVenta", idVenta)
      .select()

    if (errorVenta) {
      console.error("Error al actualizar venta:", errorVenta)
      throw errorVenta
    }

    // 4. Delete current details
    const { error: errorEliminarDetalles } = await supabase.from("DETALLE_VENTA").delete().eq("IdVenta", idVenta)

    if (errorEliminarDetalles) {
      console.error("Error al eliminar detalles actuales:", errorEliminarDetalles)
      throw errorEliminarDetalles
    }

    // 5. Insert new details
    const detallesConIdVenta = detallesData.map((detalle) => ({
      ...detalle,
      IdVenta: idVenta,
    }))

    const { error: errorDetalles } = await supabase.from("DETALLE_VENTA").insert(detallesConIdVenta)

    if (errorDetalles) {
      console.error("Error al insertar nuevos detalles:", errorDetalles)
      throw errorDetalles
    }

    // 6. Update product stock if the sale changes to COMPLETED
    if (ventaActual.Estatus === "PENDIENTE" && venta.Estatus === "COMPLETADO") {
      await actualizarStockProductos(detallesData, false)
    }

    return { idVenta, venta: ventaActualizada[0] }
  } catch (error) {
    console.error("Error en actualizarVenta:", error)
    throw error
  }
}

// Helper function to update product stock
const actualizarStockProductos = async (detalles: any[], aumentar: boolean = false) => {
  try {
    const productos = await obtenerProductos()

    for (const detalle of detalles) {
      const producto = productos.find((p: any) => p.Id_producto === detalle.IdProducto)
      if (producto) {
        // If aumentar is true, add to stock (restore), if false, subtract (sale)
        const nuevoStock = aumentar
          ? Number(producto.Stock) + Number(detalle.Cantidad)
          : Math.max(0, Number(producto.Stock) - Number(detalle.Cantidad))

        const { error: errorStock } = await supabase
          .from("Productos")
          .update({ Stock: nuevoStock.toString() })
          .eq("Id_producto", detalle.IdProducto)

        if (errorStock) {
          console.error(`Error al actualizar stock del producto ${detalle.IdProducto}:`, errorStock)
          throw errorStock
        }
      }
    }
  } catch (error) {
    console.error("Error en actualizarStockProductos:", error)
    throw error
  }
}

// Cancel a sale
export const cancelarVenta = async (idVenta: number, restaurarStock = true) => {
  try {
    // 1. Get the current state of the sale
    const { data: ventaActual, error: errorVentaActual } = await supabase
      .from("VENTA")
      .select("*")
      .eq("IdVenta", idVenta)
      .single()

    if (errorVentaActual) throw errorVentaActual

    // 2. Mark the sale as canceled
    const { error } = await supabase.from("VENTA").update({ Estatus: "CANCELADO" }).eq("IdVenta", idVenta)

    if (error) throw error

    // 3. If stock should be restored and the sale was COMPLETED, get the details and update
    if (restaurarStock && ventaActual.Estatus === "COMPLETADO") {
      // First get the sale details
      const detalles = await obtenerDetallesVenta(idVenta)

      if (!detalles || detalles.length === 0) return true

      // Update the stock of each product
      await actualizarStockProductos(detalles, true)
    }

    return true
  } catch (error) {
    console.error("Error en cancelarVenta:", error)
    throw error
  }
}
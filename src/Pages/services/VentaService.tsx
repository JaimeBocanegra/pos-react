import { supabase } from "../../supabase/client"
import { obtenerProductos } from "./ProductoService"

// Interfaces para tipado
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

// Obtener todas las ventas
export const obtenerVentas = async () => {
  const { data, error } = await supabase.from("VENTA").select("*").order("IdVenta", { ascending: false })

  if (error) {
    console.error("Error al obtener ventas:", error)
    throw error
  }

  return data || []
}

// Obtener una venta por ID
export const obtenerVentaPorId = async (id: number) => {
  const { data, error } = await supabase.from("VENTA").select("*").eq("IdVenta", id).single()

  if (error) {
    console.error("Error al obtener venta:", error)
    throw error
  }

  return data
}

// Obtener detalles de una venta
export const obtenerDetallesVenta = async (idVenta: number) => {
  const { data, error } = await supabase.from("DETALLE_VENTA").select("*").eq("IdVenta", idVenta)

  if (error) {
    console.error("Error al obtener detalles de venta:", error)
    throw error
  }

  return data || []
}

// Crear una nueva venta
export const crearVenta = async (venta: any, detallesData: any[]) => {
  try {
    // 1. Insertar encabezado de venta
    const { data: ventaInsertada, error: errorVenta } = await supabase.from("VENTA").insert([venta]).select()

    if (errorVenta) {
      console.error("Error al crear venta:", errorVenta)
      throw errorVenta
    }

    const idVenta = ventaInsertada[0].IdVenta

    // 2. Insertar detalles de venta
    const detallesConIdVenta = detallesData.map((detalle) => ({
      ...detalle,
      IdVenta: idVenta,
    }))

    const { error: errorDetalles } = await supabase.from("DETALLE_VENTA").insert(detallesConIdVenta)

    if (errorDetalles) {
      console.error("Error al insertar detalles de venta:", errorDetalles)
      throw errorDetalles
    }

    // 3. Actualizar stock de productos (reducir) solo si la venta está COMPLETADA
    if (venta.Estatus === "COMPLETADO") {
      await actualizarStockProductos(detallesData, false)
    }

    return { idVenta, venta: ventaInsertada[0] }
  } catch (error) {
    console.error("Error en crearVenta:", error)
    throw error
  }
}

// Actualizar una venta existente
export const actualizarVenta = async (idVenta: number, venta: any, detallesData: any[]) => {
  try {
    // 1. Obtener el estado actual de la venta
    const { data: ventaActual, error: errorVentaActual } = await supabase
      .from("VENTA")
      .select("*")
      .eq("IdVenta", idVenta)
      .single()

    if (errorVentaActual) {
      console.error("Error al obtener venta actual:", errorVentaActual)
      throw errorVentaActual
    }

    // Verificar si la venta está completada (no se puede editar)
    if (ventaActual.Estatus === "COMPLETADO") {
      throw new Error("No se puede editar una venta que ya está completada")
    }

    // 2. Obtener los detalles actuales para restaurar stock si es necesario
    const detallesActuales = await obtenerDetallesVenta(idVenta)

    // 3. Actualizar encabezado de venta
    const { data: ventaActualizada, error: errorVenta } = await supabase
      .from("VENTA")
      .update(venta)
      .eq("IdVenta", idVenta)
      .select()

    if (errorVenta) {
      console.error("Error al actualizar venta:", errorVenta)
      throw errorVenta
    }

    // 4. Eliminar detalles actuales
    const { error: errorEliminarDetalles } = await supabase.from("DETALLE_VENTA").delete().eq("IdVenta", idVenta)

    if (errorEliminarDetalles) {
      console.error("Error al eliminar detalles actuales:", errorEliminarDetalles)
      throw errorEliminarDetalles
    }

    // 5. Insertar nuevos detalles
    const detallesConIdVenta = detallesData.map((detalle) => ({
      ...detalle,
      IdVenta: idVenta,
    }))

    const { error: errorDetalles } = await supabase.from("DETALLE_VENTA").insert(detallesConIdVenta)

    if (errorDetalles) {
      console.error("Error al insertar nuevos detalles:", errorDetalles)
      throw errorDetalles
    }

    // 6. Actualizar stock de productos si la venta cambia a COMPLETADO
    if (ventaActual.Estatus === "PENDIENTE" && venta.Estatus === "COMPLETADO") {
      await actualizarStockProductos(detallesData, false)
    }

    return { idVenta, venta: ventaActualizada[0] }
  } catch (error) {
    console.error("Error en actualizarVenta:", error)
    throw error
  }
}

// Función auxiliar para actualizar el stock de productos
const actualizarStockProductos = async (detalles: any[], aumentar: boolean = false) => {
  try {
    const productos = await obtenerProductos()

    for (const detalle of detalles) {
      const producto = productos.find((p: any) => p.Id_producto === detalle.IdProducto)
      if (producto) {
        // Si aumentar es true, sumamos al stock (restaurar), si es false, restamos (venta)
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

// Cancelar una venta
export const cancelarVenta = async (idVenta: number, restaurarStock = true) => {
  try {
    // 1. Obtener el estado actual de la venta
    const { data: ventaActual, error: errorVentaActual } = await supabase
      .from("VENTA")
      .select("*")
      .eq("IdVenta", idVenta)
      .single()

    if (errorVentaActual) throw errorVentaActual

    // 2. Marcar la venta como cancelada
    const { error } = await supabase.from("VENTA").update({ Estatus: "CANCELADO" }).eq("IdVenta", idVenta)

    if (error) throw error

    // 3. Si se debe restaurar el stock y la venta estaba COMPLETADA, obtener los detalles y actualizar
    if (restaurarStock && ventaActual.Estatus === "COMPLETADO") {
      // Primero obtenemos los detalles de la venta
      const detalles = await obtenerDetallesVenta(idVenta)

      if (!detalles || detalles.length === 0) return true

      // Actualizamos el stock de cada producto
      await actualizarStockProductos(detalles, true)
    }

    return true
  } catch (error) {
    console.error("Error en cancelarVenta:", error)
    throw error
  }
}

// clienteService.ts
import { supabase } from "../../supabase/client";

interface Proveedor {
  IdProveedor: number;
  NombreCompleto: string;
  [key: string]: any; // Añade un índice para otras propiedades opcionales
}

export const obtenerProveedores = async (): Promise<Proveedor[]> => {
  const { data, error } = await supabase
    .from("Proveedores")
    .select("*")
    .order("IdProveedor");
  if (error) throw new Error(error.message);
  return data;
};

export const obtenerProveedorPorId = async (id: number): Promise<Proveedor> => {
  const { data, error } = await supabase
    .from("Proveedores")
    .select("*")
    .eq("IdProveedor", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const actualizarProveedor = async (
  id: number,
  nombre: string
): Promise<void> => {
  const { error } = await supabase
    .from("Proveedores")
    .update({ NombreCompleto: nombre })
    .eq("IdProveedor", id);
  if (error) throw new Error(error.message);
};

export const eliminarProveedor = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from("Proveedores")
    .delete()
    .eq("IdProveedor", id);
  if (error) throw new Error(error.message);
};

export const agregarProveedor = async (nombre: string): Promise<void> => {
  const { error } = await supabase
    .from("Proveedores")
    .insert([{ NombreCompleto: nombre }]);
  if (error) throw new Error(error.message);
};

// clienteService.ts
import { supabase } from "../../supabase/client";

interface Cliente {
  IdCliente: number;
  Nombre: string;
  [key: string]: any; // Añade un índice para otras propiedades opcionales
}

export const obtenerClientes = async (): Promise<Cliente[]> => {
  const { data, error } = await supabase
    .from("CLIENTES")
    .select("*")
    .order("IdCliente");
  if (error) throw new Error(error.message);
  return data;
};

export const obtenerClientePorId = async (id: number): Promise<Cliente> => {
  const { data, error } = await supabase
    .from("CLIENTES")
    .select("*")
    .eq("IdCliente", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const actualizarCliente = async (
  id: number,
  nombre: string
): Promise<void> => {
  const { error } = await supabase
    .from("CLIENTES")
    .update({ Nombre: nombre })
    .eq("IdCliente", id);
  if (error) throw new Error(error.message);
};

export const eliminarCliente = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from("CLIENTES")
    .delete()
    .eq("IdCliente", id);
  if (error) throw new Error(error.message);
};

export const agregarCliente = async (nombre: string): Promise<void> => {
  const { error } = await supabase
    .from("CLIENTES")
    .insert([{ Nombre: nombre }]);
  if (error) throw new Error(error.message);
};

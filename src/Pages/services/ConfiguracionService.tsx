import { supabase } from "./../../supabase/client";

export interface Configuracion {
  id: number;
  clave: string;
  valor: string;
  tipo: string;
  descripcion: string | null;
  categoria: string;
  editable: boolean;
  requiere_permiso: string;
  created_at: string;
  updated_at: string;
}

export const ConfiguracionService = {
  async getAll() {
    const { data, error } = await supabase
      .from('configuraciones')
      .select('*')
      .order('categoria', { ascending: true });

    if (error) throw new Error(error.message);
    return data as Configuracion[];
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('configuraciones')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Configuracion;
  },

  async create(configuracion: Omit<Configuracion, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('configuraciones')
      .insert(configuracion)
      .select();

    if (error) throw new Error(error.message);
    return data[0] as Configuracion;
  },

  async update(id: number, updates: Partial<Configuracion>) {
    const { data, error } = await supabase
      .from('configuraciones')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw new Error(error.message);
    return data[0] as Configuracion;
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('configuraciones')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
    return true;
  },

  // Tipos y categorías para formularios
  getTipos() {
    return ['booleano', 'entero', 'decimal', 'texto', 'json'];
  },

  getCategorias() {
    return ['inventario', 'ventas', 'seguridad', 'facturacion', 'general', 'notificaciones'];
  },
  // Obtener configuración por clave
  async getByKey(clave: string): Promise<Configuracion | null> {
    const { data, error } = await supabase
      .from('configuraciones')
      .select('*')
      .eq('clave', clave)
      .single();

    if (error) {
      console.error(`Error fetching configuracion ${clave}:`, error);
      throw error;
    }

    return data;
  },
};
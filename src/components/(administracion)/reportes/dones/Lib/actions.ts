'use server';

import { createClient } from '@/utils/supabase/server';
import { DonReporte } from './zod';

export async function obtenerReporteDones(): Promise<DonReporte[] | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // En este módulo permitimos el acceso a cualquier usuario autenticado,
  // igual que en el reporte de alabanzas.

  const { data, error } = await supabase
    .from('act_dones_espirituales')
    .select(`
      id,
      actividad_id,
      nombre_persona,
      palabras,
      citas_biblicas,
      created_at,
      act_actividades (
        due_date,
        title
      )
    `)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error('Error fetching dones:', error);
    return [];
  }

  const reporte = data.map((d: any) => ({
    id: d.id,
    actividad_id: d.actividad_id,
    fecha: d.act_actividades?.due_date || d.created_at?.split('T')[0] || null,
    nombre_persona: d.nombre_persona,
    palabras: d.palabras,
    citas_biblicas: d.citas_biblicas,
    actividad_titulo: d.act_actividades?.title || 'Desconocida'
  }));

  // Ordenar por fecha descendente
  return reporte.sort((a, b) => {
    const dateA = new Date(a.fecha || 0).getTime();
    const dateB = new Date(b.fecha || 0).getTime();
    return dateB - dateA;
  });
}

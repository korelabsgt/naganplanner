'use server'

import { createClient } from '@/utils/supabase/server';
import { NotaReunion } from '../zod';

export async function guardarNota(actividad_id: string, objNota: Partial<NotaReunion>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  if (objNota.id && objNota.id !== '') {
    // update
    const { error } = await supabase
      .from('act_acuerdos_reunion')
      .update({
        nota: objNota.nota,
        descripcion: objNota.descripcion,
        responsable_id: objNota.responsable_id,
        estado: objNota.estado,
      })
      .eq('id', objNota.id)
      .eq('actividad_id', actividad_id);
      
    if (error) throw new Error(error.message);
  } else {
    // insert
    const { error } = await supabase
      .from('act_acuerdos_reunion')
      .insert({
        actividad_id,
        nota: objNota.nota,
        descripcion: objNota.descripcion,
        responsable_id: objNota.responsable_id,
        estado: objNota.estado || 'pendiente'
      });
      
    if (error) throw new Error(error.message);
  }
}

export async function eliminarNota(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await supabase
    .from('act_acuerdos_reunion')
    .delete()
    .eq('id', id);
  
  if (error) throw new Error(error.message);
}

export async function toggleEstadoNota(id: string, estadoActual: string | null | undefined) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const nuevoEstado = estadoActual === 'completado' ? null : 'completado';

  const { error } = await supabase
    .from('act_acuerdos_reunion')
    .update({ estado: nuevoEstado })
    .eq('id', id);
  
  if (error) throw new Error(error.message);
}

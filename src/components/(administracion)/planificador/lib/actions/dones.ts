'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { DonEspiritual } from '../zod';

export async function guardarDonEspiritual(actividad_id: string, don: Partial<DonEspiritual>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  if (don.id && don.id !== '') {
    // update
    const { error } = await supabase
      .from('act_dones_espirituales')
      .update({
        nombre_persona: don.nombre_persona,
        palabras: don.palabras,
        citas_biblicas: don.citas_biblicas
      })
      .eq('id', don.id)
      .eq('actividad_id', actividad_id);
      
    if (error) throw new Error(error.message);
  } else {
    // insert
    const { error } = await supabase
      .from('act_dones_espirituales')
      .insert({
        actividad_id,
        nombre_persona: don.nombre_persona,
        palabras: don.palabras,
        citas_biblicas: don.citas_biblicas
      });
      
    if (error) throw new Error(error.message);
  }
}

export async function eliminarDonEspiritual(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await supabase
    .from('act_dones_espirituales')
    .delete()
    .eq('id', id);
  
  if (error) throw new Error(error.message);
}

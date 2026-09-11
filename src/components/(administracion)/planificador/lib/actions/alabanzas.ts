'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { checkIsJefe } from './core';
import { sendPushToRoles, sendPushToUsers } from '@/utils/push-utils';

// Helper local para instanciar el cliente con privilegios
function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function crearAlabanza(data: {
  nombre: string;
  tipo: string;
  tonalidad?: string;
  bpm?: number;
  compas?: string;
  observaciones?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const supabaseAdmin = getAdminClient();

  const { error } = await supabaseAdmin
    .from('act_banco_alabanzas')
    .insert({
      nombre: data.nombre.trim(),
      tipo: data.tipo,
      tonalidad: data.tonalidad || null, // Se cambia a minúsculas
      bpm: data.bpm || null,
      compas: data.compas || null,
      observaciones: data.observaciones?.trim() || null
    });

  if (error) {
    console.error("Error al crear alabanza:", error);
    throw new Error(error.message);
  }

  revalidatePath('/kore/planificador');
}

export async function actualizarAlabanza(id: string, data: Partial<{
  nombre: string;
  tipo: string;
  tonalidad?: string;
  bpm?: number;
  compas?: string;
  observaciones?: string;
}>) {
  const supabaseAdmin = getAdminClient();
  const { error } = await supabaseAdmin
    .from('act_banco_alabanzas')
    .update({
      nombre: data.nombre?.trim(),
      tipo: data.tipo,
      tonalidad: data.tonalidad || null,
      bpm: data.bpm || null,
      compas: data.compas || null,
      observaciones: data.observaciones?.trim() || null
    })
    .eq('id', id);

  if (error) {
    console.error("Error al actualizar:", error);
    throw new Error(error.message);
  }

  revalidatePath('/kore/planificador');
}

export async function eliminarAlabanza(id: string) {
  const supabaseAdmin = getAdminClient();
  const { error } = await supabaseAdmin
    .from('act_banco_alabanzas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Error al eliminar:", error);
    throw new Error(error.message);
  }

  revalidatePath('/kore/planificador');
}

export async function obtenerBancoAlabanzas() {
  const supabaseAdmin = getAdminClient();
  const { data, error } = await supabaseAdmin
    .from('act_banco_alabanzas')
    .select('*')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error fetching banco alabanzas:', error);
    return [];
  }

  return data;
}

// ============================================================================
// GESTIÓN DE ALABANZAS EN ACTIVIDADES
// ============================================================================

export async function sincronizarRepertorioActividad(actividad_id: string, alabanzas_ids: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const isJefe = await checkIsJefe(supabase, user.id);

  const { data: actividad } = await supabase
    .from('act_actividades')
    .select('created_by, title')
    .eq('id', actividad_id)
    .single();

  if (!actividad) throw new Error('Actividad no encontrada');

  // Verificar si el usuario es encargado de esta actividad
  const { data: registroEncargado } = await supabase
    .from('act_integrantes')
    .select('id')
    .eq('actividad_id', actividad_id)
    .eq('usuario_id', user.id)
    .eq('es_encargado', true)
    .maybeSingle();

  const esEncargado = !!registroEncargado;
  const esCreador = actividad.created_by === user.id;

  if (!isJefe && !esCreador && !esEncargado) {
    throw new Error('No tienes permisos suficientes para modificar el repertorio.');
  }

  // 1. Obtener el repertorio actual para preservar directores y observaciones
  const { data: repertorioActual } = await supabase
    .from('act_actividades_alabanzas')
    .select('alabanza_id, id_director, observaciones')
    .eq('actividad_id', actividad_id);

  const mapaRepertorioAnterior = new Map();
  if (repertorioActual) {
    repertorioActual.forEach(item => {
      mapaRepertorioAnterior.set(item.alabanza_id, item);
    });
  }

  // 2. Eliminar todo el repertorio anterior de esta actividad
  const { error: deleteError } = await supabase
    .from('act_actividades_alabanzas')
    .delete()
    .eq('actividad_id', actividad_id);

  if (deleteError) throw new Error(deleteError.message);

  // 3. Insertar el nuevo repertorio (si hay)
  if (alabanzas_ids.length > 0) {
    const payload = alabanzas_ids.map(id => {
      const previo = mapaRepertorioAnterior.get(id);
      return {
        actividad_id,
        alabanza_id: id,
        id_director: previo ? previo.id_director : null,
        observaciones: previo ? previo.observaciones : null
      };
    });

    const { error: insertError } = await supabase
      .from('act_actividades_alabanzas')
      .insert(payload);

    if (insertError) throw new Error(insertError.message);

    // 3. NOTIFICACIONES CONDICIONALES
    try {
      // Obtener la fecha de esta actividad
      const { data: actividadConFecha } = await supabase
        .from('act_actividades')
        .select('due_date')
        .eq('id', actividad_id)
        .single();

      const fechaDue = actividadConFecha?.due_date;
      let hayActividadesMismaFecha = false;
      let encargadosMismaFechaIds: string[] = [];

      if (fechaDue) {
        const fechaSoloDia = new Date(fechaDue).toISOString().split('T')[0];

        // Buscar otras actividades en la misma fecha
        const { data: actividadesMismaFecha } = await supabase
          .from('act_actividades')
          .select('id')
          .neq('id', actividad_id)
          .gte('due_date', `${fechaSoloDia}T00:00:00`)
          .lte('due_date', `${fechaSoloDia}T23:59:59`);

        if (actividadesMismaFecha && actividadesMismaFecha.length > 0) {
          hayActividadesMismaFecha = true;

          // Obtener encargados de esas otras actividades
          const idsOtrasActividades = actividadesMismaFecha.map(a => a.id);
          const { data: encargadosOtras } = await supabase
            .from('act_integrantes')
            .select('usuario_id')
            .in('actividad_id', idsOtrasActividades)
            .eq('es_encargado', true);

          encargadosMismaFechaIds = (encargadosOtras || [])
            .map(e => e.usuario_id)
            .filter(id => id !== user.id);
        }
      }

      // Notificar siempre a los miembros de ESTA actividad
      const { data: integrantes } = await supabase
        .from('act_integrantes')
        .select('usuario_id')
        .eq('actividad_id', actividad_id);

      const miembrosActividadIds = (integrantes || [])
        .map(i => i.usuario_id)
        .filter(id => id !== user.id);

      const pushPayload = {
        title: "🎵 Repertorio Actualizado",
        body: `Se ha definido el repertorio para la actividad: ${actividad.title || 'Desconocida'}`,
        url: "/kore/planificador"
      };

      const promesas: Promise<any>[] = [];

      // Siempre: notificar a miembros de esta actividad
      if (miembrosActividadIds.length > 0) {
        promesas.push(sendPushToUsers(miembrosActividadIds, pushPayload));
      }

      // Solo si hay actividades en la misma fecha: notificar a roles y encargados de otras actividades
      if (hayActividadesMismaFecha) {
        const rolesANotificar = ['lider', 'Líder', 'Lider', 'LIDER', 'admin', 'Admin', 'ADMIN', 'super', 'Super', 'SUPER'];
        promesas.push(sendPushToRoles(rolesANotificar, pushPayload));

        if (encargadosMismaFechaIds.length > 0) {
          promesas.push(sendPushToUsers(encargadosMismaFechaIds, pushPayload));
        }
      }

      await Promise.all(promesas);

    } catch (err) {
      console.error("Error enviando notificación push de repertorio:", err);
    }
  }

  revalidatePath('/kore/planificador');
}

export async function asignarDirectorCanto(actividad_id: string, alabanza_id: string, director_id: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const payload = director_id ? { id_director: director_id } : { id_director: null };

  const { error } = await supabase
    .from('act_actividades_alabanzas')
    .update(payload)
    .eq('actividad_id', actividad_id)
    .eq('alabanza_id', alabanza_id);

  if (error) {
    console.error("Error asignando director:", error);
    throw new Error(error.message);
  }

  revalidatePath('/kore/planificador');
}

export async function actualizarObservacionCantoActividad(actividad_id: string, alabanza_id: string, observaciones: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await supabase
    .from('act_actividades_alabanzas')
    .update({ observaciones })
    .eq('actividad_id', actividad_id)
    .eq('alabanza_id', alabanza_id);

  if (error) {
    console.error("Error actualizando observaciones:", error);
    throw new Error(error.message);
  }

  revalidatePath('/kore/planificador');
}

export async function sustituirCantoActividad(actividad_id: string, alabanza_vieja_id: string, alabanza_nueva_id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await supabase
    .from('act_actividades_alabanzas')
    .update({ alabanza_id: alabanza_nueva_id })
    .eq('actividad_id', actividad_id)
    .eq('alabanza_id', alabanza_vieja_id);

  if (error) {
    console.error("Error sustituyendo canto:", error);
    throw new Error(error.message);
  }

  revalidatePath('/kore/planificador');
}

export async function obtenerRepertoriosDelMismoDia(actividad_id: string) {
  const supabase = await createClient();

  // 1. Obtener la fecha de la actividad actual
  const { data: actividadActual } = await supabase
    .from('act_actividades')
    .select('due_date')
    .eq('id', actividad_id)
    .single();

  if (!actividadActual?.due_date) return [];

  const fecha = new Date(actividadActual.due_date);
  const fechaSoloDia = fecha.toISOString().split('T')[0];

  // 2. Buscar otras actividades en el mismo da que tengan alabanzas
  // Nota: Usamos query raw o filtros de fecha para asegurar el da exacto independientemente de la hora
  const { data: actividadesConCanciones, error } = await supabase
    .from('act_actividades')
    .select(`
      id,
      title,
      modulo,
      act_actividades_alabanzas!inner (id)
    `)
    .neq('id', actividad_id)
    .gte('due_date', `${fechaSoloDia}T00:00:00`)
    .lte('due_date', `${fechaSoloDia}T23:59:59`);

  if (error) {
    console.error("Error al buscar repertorios del da:", error);
    return [];
  }

  return actividadesConCanciones.map((act: any) => ({
    id: act.id,
    title: act.title,
    modulo: act.modulo,
    canciones_count: act.act_actividades_alabanzas?.length || 0
  }));
}

export async function clonarRepertorio(origen_id: string, destino_id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // 1. Obtener las canciones de la actividad origen
  const { data: cancionesOrigen, error: fetchError } = await supabase
    .from('act_actividades_alabanzas')
    .select('alabanza_id, id_director, observaciones')
    .eq('actividad_id', origen_id);

  if (fetchError || !cancionesOrigen) throw new Error("No se pudo obtener el repertorio origen");

  // 2. Eliminar repertorio actual de la actividad destino
  await supabase
    .from('act_actividades_alabanzas')
    .delete()
    .eq('actividad_id', destino_id);

  // 3. Insertar las nuevas canciones
  if (cancionesOrigen.length > 0) {
    const payload = cancionesOrigen.map(c => ({
      actividad_id: destino_id,
      alabanza_id: c.alabanza_id,
      id_director: c.id_director,
      observaciones: c.observaciones
    }));

    const { error: insertError } = await supabase
      .from('act_actividades_alabanzas')
      .insert(payload);

    if (insertError) throw new Error(insertError.message);

    // 4. NOTIFICAR A LOS MIEMBROS DE LA ACTIVIDAD DESTINO (IMPORTACIÓN)
    try {
      const { data: infoDestino } = await supabase
        .from('act_actividades')
        .select('title')
        .eq('id', destino_id)
        .single();

      const { data: integrantes } = await supabase
        .from('act_integrantes')
        .select('usuario_id')
        .eq('actividad_id', destino_id);

      const usuariosIds = (integrantes || [])
        .map(i => i.usuario_id)
        .filter(id => id !== user?.id);

      if (usuariosIds.length > 0 && infoDestino) {
        await sendPushToUsers(usuariosIds, {
          title: "🎵 Repertorio Importado",
          body: `Se ha importado un repertorio de alabanzas para: ${infoDestino.title}`,
          url: "/kore/planificador"
        });
      }
    } catch (err) {
      console.error("Error enviando push en clonación de repertorio:", err);
    }
  }

  revalidatePath('/kore/planificador');
  return { success: true, count: cancionesOrigen.length };
}

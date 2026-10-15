'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { actividadFormSchema, ActividadForm, Actividad, Perfil, ChecklistItem } from './zod';

// --- FUNCIÓN HELPER: VERIFICAR SI ES JEFE O ADMIN ---
async function checkIsJefe(supabase: any, userId: string): Promise<boolean> {
  const { data: puestosJefatura } = await supabase
    .from('puesto')
    .select('id')
    .eq('usuario_id', userId)
    .eq('es_jefatura', true);
    
  const { data: profile } = await supabase
    .from('profiles')
    .select('rol')
    .eq('id', userId)
    .single();
    
  return (puestosJefatura && puestosJefatura.length > 0) || profile?.rol === 'ADMIN';
}

// --- LECTURA Y AUTO-MANTENIMIENTO ---

export async function obtenerDatosGestor(tipoVista: 'mis_actividades' | 'mi_equipo' | 'todas') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Obtener Perfiles
  const { data: rawProfiles } = await supabase
    .from('profiles')
    .select('id, nombre, email, avatar_url, activo, rol');
  
  const perfilesMap = new Map((rawProfiles || []).map((p: any) => [p.id, p]));
  const miPerfil = perfilesMap.get(user.id);

  const isJefe = await checkIsJefe(supabase, user.id);

  // --- LÓGICA DE FILTRADO POR EQUIPO Y PANEL GENERAL ---
  let teamIds: string[] = [user.id]; 
  let departamentosEquipo: any[] = []; 

  // NUEVA LÓGICA: Procesar departamentos para 'mi_equipo' O 'todas'
  if (tipoVista === 'mi_equipo' || tipoVista === 'todas') {
    let arrayIdsTotales: string[] = [];
    
    // Traemos TODOS los departamentos primero (lo necesitamos para ambos casos)
    const { data: todosDeptos } = await supabase
      .from('departamento')
      .select('id, nombre, parent_id');

    if (tipoVista === 'todas') {
      // SI ES PANEL GENERAL: Agarramos absolutamente todos los IDs
      arrayIdsTotales = todosDeptos ? todosDeptos.map(d => d.id) : [];
    } else {
      // SI ES MI EQUIPO: Hacemos la búsqueda recursiva desde mi jefatura
      const { data: puestosJefatura } = await supabase
        .from('puesto')
        .select('departamento_id')
        .eq('usuario_id', user.id)
        .eq('es_jefatura', true);

      if (puestosJefatura && puestosJefatura.length > 0) {
        const idsDirectos = puestosJefatura.map(p => p.departamento_id);
        const idsJerarquia = new Set<string>(idsDirectos);

        const buscarDescendencia = (padresIds: string[]) => {
          if (!todosDeptos) return;
          const hijos = todosDeptos.filter(d => d.parent_id && padresIds.includes(d.parent_id)).map(d => d.id);
          
          if (hijos.length > 0) {
            hijos.forEach(id => idsJerarquia.add(id));
            buscarDescendencia(hijos);
          }
        };

        buscarDescendencia(idsDirectos);
        arrayIdsTotales = Array.from(idsJerarquia);
      }
    }

    // SI TENEMOS DEPARTAMENTOS QUE MOSTRAR (Ya sea propios o todos)
    if (arrayIdsTotales.length > 0) {
      const infoDeptos = todosDeptos?.filter(d => arrayIdsTotales.includes(d.id)) || [];

      const { data: puestosMiembros } = await supabase
        .from('puesto')
        .select('usuario_id, departamento_id')
        .in('departamento_id', arrayIdsTotales)
        .not('usuario_id', 'is', null);

      if (puestosMiembros) {
        const idsEmpleados = puestosMiembros.map(p => p.usuario_id as string);
        teamIds = [...new Set([...teamIds, ...idsEmpleados])];

        const usuariosYaAsignados = new Set<string>();

        departamentosEquipo = infoDeptos.map(depto => {
          const miembrosDelDepto = puestosMiembros
            .filter(p => p.departamento_id === depto.id)
            .map(p => p.usuario_id as string);

          const miembrosUnicos = miembrosDelDepto.filter(userId => {
            if (usuariosYaAsignados.has(userId)) return false; 
            usuariosYaAsignados.add(userId); 
            return true;
          });

          return {
            id: depto.id,
            nombre: depto.nombre,
            miembros: miembrosUnicos 
          };
        }).filter(depto => depto.miembros.length > 0);
      }
    }
  }

  // 2. Query Base de Actividades
  let query = supabase
    .from('act_actividades')
    .select('*')
    .order('due_date', { ascending: true });

  // 3. Aplicar Filtros según vista
  if (tipoVista === 'mis_actividades') {
    query = query.eq('assigned_to', user.id);
  } else if (tipoVista === 'mi_equipo') {
    query = query.in('assigned_to', teamIds);
  } 
  // NOTA: Si es 'todas', no aplicamos .in('assigned_to'), dejamos que traiga TODO de la DB

  const { data: rawActividades, error } = await query;

  if (error) {
    console.error('Error fetching activities:', error);
    return { perfil: miPerfil, actividades: [], usuarios: [], departamentosEquipo: [], isJefe: false };
  }

  // --- AUTO-ACTUALIZAR TAREAS VENCIDAS ---
  const ahora = new Date(); 
  const tareasVencidasIds: string[] = [];

  rawActividades.forEach((act: any) => {
    if (act.status === 'Asignado' && act.due_date && new Date(act.due_date) < ahora) {
      act.status = 'Vencido'; 
      tareasVencidasIds.push(act.id); 
    }
  });

  if (tareasVencidasIds.length > 0) {
    supabase.from('act_actividades').update({ status: 'Vencido' }).in('id', tareasVencidasIds).then();
  }

  // 4. JOIN Manual de Perfiles
  const actividades: Actividad[] = rawActividades.map((act: any) => {
    const creador = perfilesMap.get(act.created_by);
    const asignado = perfilesMap.get(act.assigned_to);

    return {
      ...act,
      checklist: act.checklist || [],
      creator: { nombre: creador?.nombre || 'Desconocido' },
      assignee: { 
        nombre: asignado?.nombre || 'Sin Asignar', 
        avatar_url: asignado?.avatar_url 
      }
    };
  });

  return {
    perfil: miPerfil,
    actividades,
    usuarios: (rawProfiles || []) as Perfil[],
    departamentosEquipo,
    isJefe 
  };
}

// --- ESCRITURA (Sin cambios) ---

export async function guardarActividad(data: ActividadForm, idEdicion?: string) {
  const parsed = actividadFormSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const isJefe = await checkIsJefe(supabase, user.id);

  let fechaVencimiento = parsed.data.due_date;
  if (fechaVencimiento) {
    if (fechaVencimiento.length === 10) fechaVencimiento = `${fechaVencimiento}T23:59:59-06:00`;
    else if (fechaVencimiento.length === 16) fechaVencimiento = `${fechaVencimiento}:00-06:00`;
  }

  const payload: any = {
    title: parsed.data.title,
    description: parsed.data.description || null,
    due_date: fechaVencimiento,
    assigned_to: parsed.data.assigned_to,
    checklist: parsed.data.checklist || [],
    ...(parsed.data.group_id !== undefined ? { group_id: parsed.data.group_id } : {})
  };

  if (idEdicion) {
    const { data: tareaActual } = await supabase.from('act_actividades').select('*').eq('id', idEdicion).single();
    if (!tareaActual) throw new Error('Actividad no encontrada');

    if ((tareaActual.status === 'Vencido' || tareaActual.status === 'Completado') && !isJefe) {
       throw new Error('Solo los jefes pueden editar actividades vencidas o completadas.');
    }

    if (!isJefe) {
      payload.title = tareaActual.title;
      payload.due_date = tareaActual.due_date;
      payload.assigned_to = tareaActual.assigned_to;
    } else {
      if (tareaActual.status === 'Vencido' || tareaActual.status === 'Completado') {
         const ahora = new Date();
         const fechaNueva = new Date(fechaVencimiento);
         if (fechaNueva > ahora) payload.status = 'Asignado'; 
      }
    }

    await supabase.from('act_actividades').update(payload).eq('id', idEdicion);
  } else {
    await supabase.from('act_actividades').insert({ ...payload, created_by: user.id, status: 'Asignado' });
  }

  revalidatePath('/admin/actividades');
}

export async function actualizarChecklist(id: string, items: ChecklistItem[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  
  const isJefe = await checkIsJefe(supabase, user.id);
  const { data: tareaActual } = await supabase.from('act_actividades').select('status').eq('id', id).single();

  if (!isJefe && (tareaActual?.status === 'Vencido' || tareaActual?.status === 'Completado')) {
    throw new Error('Acción bloqueada. La actividad está finalizada o vencida.');
  }

  const { error } = await supabase.from('act_actividades').update({ checklist: items }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function eliminarActividad(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const isJefe = await checkIsJefe(supabase, user.id);
  const { data: tareaActual } = await supabase.from('act_actividades').select('status, created_by').eq('id', id).single();

  if (!isJefe) {
    if (tareaActual?.status !== 'Asignado') {
      throw new Error('Solo los jefes pueden eliminar actividades vencidas o completadas.');
    }
    if (tareaActual?.created_by !== user.id) {
      throw new Error('No tienes permisos. Solo puedes eliminar actividades creadas por ti mismo.');
    }
  }

  const { error } = await supabase.from('act_actividades').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/actividades');
}

export async function cambiarEstado(id: string, nuevoEstado: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const isJefe = await checkIsJefe(supabase, user.id);
  const { data: tareaActual } = await supabase.from('act_actividades').select('status').eq('id', id).single();

  if (!isJefe && (tareaActual?.status === 'Vencido' || tareaActual?.status === 'Completado')) {
     throw new Error('Solo los jefes pueden reactivar actividades vencidas o completadas.');
  }

  const { error } = await supabase.from('act_actividades').update({ status: nuevoEstado }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/actividades');
}
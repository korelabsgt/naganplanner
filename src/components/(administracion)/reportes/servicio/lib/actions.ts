'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { 
  ConfigProgramaForm, 
  ConfigProgramaServicio, 
  ReporteItem, 
  AjustesGlobales, 
  AjustesGlobalesForm,
  PlantillaServicio,
  PlantillaServicioForm
} from './zod';

// =========================================================================
// HELPERS
// =========================================================================

/** Formatea minutos a hora legible: "10:00 AM" sumando al inicio dado */
function calcularHoras(horaInicio: Date, minutosOffset: number): { inicio: string; fin: string } {
  const inicio = new Date(horaInicio.getTime() + minutosOffset * 60000);
  const fin = new Date(inicio.getTime());
  const fmt = (d: Date) =>
    d.toLocaleTimeString('es-ES', { timeZone: 'America/Guatemala', hour: '2-digit', minute: '2-digit', hour12: true })
     .toUpperCase()
     .replace(/\./g, '')
     .replace(/ P M/g, ' PM')
     .replace(/ A M/g, ' AM')
     .trim();
  return { inicio: fmt(inicio), fin: fmt(fin) };
}

/** Calcula el tiempo total de un agrupador sumando sus hijos recursivamente */
function calcularTiempoAgrupador(hijos: ConfigProgramaServicio[]): number {
  return hijos.reduce((acc, hijo) => {
    if (hijo.tipo_elemento === 'agrupador' && hijo.hijos) {
      return acc + calcularTiempoAgrupador(hijo.hijos);
    }
    return acc + (hijo.tiempo_minutos ?? 0);
  }, 0);
}

/** Convierte la lista plana de la BD en árbol jerárquico */
function construirArbol(items: ConfigProgramaServicio[]): ConfigProgramaServicio[] {
  const mapa = new Map<string, ConfigProgramaServicio>();
  const raices: ConfigProgramaServicio[] = [];

  for (const item of items) {
    mapa.set(item.id, { ...item, hijos: [] });
  }

  for (const item of mapa.values()) {
    if (item.parent_id) {
      const padre = mapa.get(item.parent_id);
      if (padre) {
        padre.hijos = padre.hijos ?? [];
        padre.hijos.push(item);
        padre.hijos.sort((a, b) => a.orden - b.orden);
      }
    } else {
      raices.push(item);
    }
  }

  return raices.sort((a, b) => a.orden - b.orden);
}

// =========================================================================
// CRUD DE PLANTILLAS DE SERVICIO
// =========================================================================

export async function obtenerPlantillasServicio(): Promise<PlantillaServicio[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('act_plantillas_servicio')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error al obtener plantillas de servicio:', error);
    return [];
  }

  return (data || []) as PlantillaServicio[];
}

export async function guardarPlantillaServicio(
  formData: PlantillaServicioForm,
  id?: string
): Promise<{ ok: boolean; data?: PlantillaServicio; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autorizado' };

  const payload = {
    nombre: formData.nombre,
    tipo_servicio: formData.tipo_servicio ?? null,
    minutos_preparacion_previa: formData.minutos_preparacion_previa ?? 0,
    permite_multi_horario: formData.permite_multi_horario ?? false,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { data, error } = await supabase
      .from('act_plantillas_servicio')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath('/');
    return { ok: true, data };
  } else {
    const { data, error } = await supabase
      .from('act_plantillas_servicio')
      .insert({ ...payload, created_at: new Date().toISOString() })
      .select()
      .single();

    if (error) return { ok: false, error: error.message };
    revalidatePath('/');
    return { ok: true, data };
  }
}

export async function eliminarPlantillaServicio(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autorizado' };

  const { error } = await supabase
    .from('act_plantillas_servicio')
    .delete()
    .eq('id', id);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  return { ok: true };
}

// =========================================================================
// LECTURA DE CONFIGURACIÓN POR PLANTILLA
// =========================================================================

export async function obtenerConfigPrograma(plantillaId?: string): Promise<ConfigProgramaServicio[] | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let query = supabase
    .from('act_config_programa_servicio')
    .select('*')
    .order('orden', { ascending: true });

  if (plantillaId) {
    query = query.eq('plantilla_id', plantillaId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error al obtener configuración del programa:', error);
    return null;
  }

  return construirArbol(data ?? []);
}

// =========================================================================
// AJUSTES GLOBALES
// =========================================================================

export async function obtenerAjustesGlobales(): Promise<AjustesGlobales | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('act_ajustes_globales')
    .select('*')
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error obtenerAjustesGlobales:', error);
    return null;
  }
  
  if (!data) {
    return {
      id: 'default',
      nombre_iglesia: 'Mi Iglesia',
      minutos_preparacion_previa: 60,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  
  return data as AjustesGlobales;
}

export async function guardarAjustesGlobales(
  formData: AjustesGlobalesForm
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autorizado' };

  const { data: existente } = await supabase
    .from('act_ajustes_globales')
    .select('id')
    .limit(1)
    .single();

  const payload = {
    nombre_iglesia: formData.nombre_iglesia,
    minutos_preparacion_previa: formData.minutos_preparacion_previa,
    updated_at: new Date().toISOString(),
  };

  if (existente) {
    const { error } = await supabase
      .from('act_ajustes_globales')
      .update(payload)
      .eq('id', existente.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from('act_ajustes_globales')
      .insert({ ...payload, created_at: new Date().toISOString() });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath('/');
  return { ok: true };
}

// =========================================================================
// 2. CRUD (ESCRITURA) CONFIGURACIÓN DE BLOQUES
// =========================================================================

export async function guardarConfigPrograma(
  formData: ConfigProgramaForm,
  id?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autorizado' };

  const payload = {
    plantilla_id: formData.plantilla_id ?? null,
    parent_id: formData.parent_id ?? null,
    orden: formData.orden,
    tipo_elemento: formData.tipo_elemento,
    nombre_mostrar: formData.nombre_mostrar,
    tiempo_minutos: formData.tipo_elemento === 'agrupador' ? null : (formData.tiempo_minutos ?? null),
    updated_at: new Date().toISOString(),
  };

  if (id) {
    const { error } = await supabase
      .from('act_config_programa_servicio')
      .update(payload)
      .eq('id', id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from('act_config_programa_servicio')
      .insert({ ...payload, created_at: new Date().toISOString() });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath('/');
  return { ok: true };
}

export async function eliminarConfigPrograma(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autorizado' };

  const { error } = await supabase
    .from('act_config_programa_servicio')
    .delete()
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/');
  return { ok: true };
}

export async function reordenarConfigPrograma(
  items: { id: string; orden: number }[]
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autorizado' };

  const updates = items.map(({ id, orden }) =>
    supabase
      .from('act_config_programa_servicio')
      .update({ orden, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  await Promise.all(updates);
  revalidatePath('/');
  return { ok: true };
}

// =========================================================================
// GENERACIÓN DEL REPORTE (MULTISERVICIO / RECONOCIMIENTO CRONOLÓGICO)
// =========================================================================

export async function generarReporteServicio(
  fechaHora: string,
  plantillaIdSeleccionada?: string | null
): Promise<ReporteItem[] | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let plantillaConfig: ConfigProgramaServicio[] = [];
  let retrasoMinutos = 0;
  let permiteMultiHorario = false;

  if (plantillaIdSeleccionada) {
    const { data: plantillaDB } = await supabase
      .from('act_plantillas_servicio')
      .select('*')
      .eq('id', plantillaIdSeleccionada)
      .single();

    if (plantillaDB) {
      retrasoMinutos = plantillaDB.minutos_preparacion_previa ?? 0;
      permiteMultiHorario = plantillaDB.permite_multi_horario ?? false;
    }

    const { data: configRaw } = await supabase
      .from('act_config_programa_servicio')
      .select('*')
      .eq('plantilla_id', plantillaIdSeleccionada)
      .order('orden', { ascending: true });

    plantillaConfig = construirArbol(configRaw ?? []);
  }

  // Fallback si no hay plantilla específica o no tiene items: buscar primera plantilla o items huérfanos
  if (plantillaConfig.length === 0) {
    const ajustes = await obtenerAjustesGlobales();
    if (retrasoMinutos === 0) {
      retrasoMinutos = ajustes?.minutos_preparacion_previa ?? 0;
    }
    const { data: configRaw } = await supabase
      .from('act_config_programa_servicio')
      .select('*')
      .order('orden', { ascending: true });

    plantillaConfig = construirArbol(configRaw ?? []);
  }

  if (plantillaConfig.length === 0) return [];

  // 2. Buscar si la actividad de fechaHora pertenece a un grupo (group_id)
  const { data: actividadInicial } = await supabase
    .from('act_actividades')
    .select('id, group_id, due_date')
    .eq('due_date', fechaHora)
    .limit(1)
    .maybeSingle();

  let queryActividades = supabase
    .from('act_actividades')
    .select(`
      id,
      title,
      modulo,
      due_date,
      group_id,
      status,
      act_integrantes (
        usuario_id,
        rol,
        es_encargado,
        "invitación"
      )
    `);

  // Si tiene group_id, traer todas las actividades vinculadas al grupo
  if (actividadInicial?.group_id) {
    queryActividades = queryActividades.eq('group_id', actividadInicial.group_id);
  } else {
    // Si no tiene grupo, traer las que coincidan exactamente con la fechaHora
    queryActividades = queryActividades.eq('due_date', fechaHora);
  }

  const { data: actividadesRaw } = await queryActividades.order('due_date', { ascending: true });
  const actividadesData = actividadesRaw ?? [];

  // 3. Obtener perfiles de usuarios
  const { data: rawProfiles } = await supabase.from('profiles').select('id, nombre, avatar_url');
  const profilesMap = new Map((rawProfiles || []).map(p => [p.id, p]));

  // 4. Identificar si hay múltiples horarios distintos (Tandas / Servicios consecutivos)
  const horariosUnicos = Array.from(
    new Set(actividadesData.map(a => a.due_date).filter(Boolean))
  ).sort() as string[];

  // Si no hay horarios detectados, usamos la fechaHora pasada
  const listaHorarios = horariosUnicos.length > 0 ? horariosUnicos : [fechaHora];

  // Helper para construir el reporte de una tanda horaria específica
  function procesarTanda(
    horaServicio: string,
    indiceTanda: number,
    esMultiTanda: boolean,
    prefijoNumero: string = ''
  ): ReporteItem[] {
    // Filtrar actividades correspondientes a este horario
    const actsDeEsteHorario = actividadesData.filter(a => a.due_date === horaServicio);

    const integrantesPorRol = new Map<string, { nombre: string; avatar_url?: string | null; rol?: string | null }[]>();
    const integrantesPorModulo = new Map<string, { nombre: string; avatar_url?: string | null; rol?: string | null }[]>();

    for (const act of actsDeEsteHorario) {
      const integrantes = (act.act_integrantes ?? []) as any[];
      for (const i of integrantes) {
        if (i.invitación !== true) continue;

        const perfil = profilesMap.get(i.usuario_id);
        const persona = {
          nombre: perfil?.nombre ?? 'Sin nombre',
          avatar_url: perfil?.avatar_url ?? null,
          rol: i.rol ?? null,
        };

        if (i.rol) {
          const rolKey = i.rol.toLowerCase().trim();
          if (!integrantesPorRol.has(rolKey)) integrantesPorRol.set(rolKey, []);
          integrantesPorRol.get(rolKey)!.push(persona);
        }

        if (act.modulo) {
          const moduloKey = act.modulo.toLowerCase().trim();
          if (!integrantesPorModulo.has(moduloKey)) integrantesPorModulo.set(moduloKey, []);
          integrantesPorModulo.get(moduloKey)!.push(persona);
        }
      }
    }

    const horaBase = new Date(new Date(horaServicio).getTime() + retrasoMinutos * 60000);
    let minutosAcumulados = 0;

    function resolverIntegrantes(item: ConfigProgramaServicio) {
      if (!item.nombre_mostrar) return [];
      const key = item.nombre_mostrar.toLowerCase().trim();
      if (item.tipo_elemento === 'rol') {
        return integrantesPorRol.get(key) ?? [];
      }
      if (item.tipo_elemento === 'dependencia') {
        return integrantesPorModulo.get(key) ?? [];
      }
      return [];
    }

    function mapearItem(item: ConfigProgramaServicio, numeroPadre: string): ReporteItem {
      const hijos = (item.hijos ?? []).map((hijo, idx) =>
        mapearItem(hijo, `${numeroPadre}.${idx + 1}`)
      );

      const tiempoTotal =
        item.tipo_elemento === 'agrupador'
          ? calcularTiempoAgrupador(item.hijos ?? [])
          : (item.tiempo_minutos ?? 0);

      const { inicio, fin } = calcularHoras(horaBase, minutosAcumulados);
      if (item.tipo_elemento !== 'agrupador') {
        minutosAcumulados += tiempoTotal;
      }

      return {
        numero: numeroPadre,
        nombre: item.nombre_mostrar,
        tipo: item.tipo_elemento,
        integrantes: resolverIntegrantes(item),
        tiempo_minutos: tiempoTotal,
        hora_inicio: inicio,
        hora_fin: fin,
        hijos: hijos.length > 0 ? hijos : undefined,
      };
    }

    return plantillaConfig.map((item, idx) => {
      const numBase = prefijoNumero ? `${prefijoNumero}.${idx + 1}` : String(idx + 1);
      return mapearItem(item, numBase);
    });
  }

  // Si solo hay un horario o la plantilla NO tiene marcado multi-horario, procesamos únicamente la hora seleccionada
  if (listaHorarios.length <= 1 || !permiteMultiHorario) {
    return procesarTanda(fechaHora, 0, false);
  }

  // Si hay MÚLTIPLES horarios (Grupo de servicios en la misma fecha)
  // Agrupamos cada tanda como un gran bloque contenedor para ordenarlo limpiamente
  const reporteCompleto: ReporteItem[] = [];

  listaHorarios.forEach((horaIso, idx) => {
    const dateObj = new Date(horaIso);
    const horaTexto = dateObj.toLocaleTimeString('es-ES', {
      timeZone: 'America/Guatemala',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).toUpperCase();

    const itemsDeLaTanda = procesarTanda(horaIso, idx, true, String(idx + 1));
    const tiempoTotalTanda = itemsDeLaTanda.reduce((acc, it) => acc + it.tiempo_minutos, 0);

    const primerHijo = itemsDeLaTanda[0];
    const ultimoHijo = itemsDeLaTanda[itemsDeLaTanda.length - 1];

    reporteCompleto.push({
      numero: String(idx + 1),
      nombre: `SERVICIO ${idx + 1} (${horaTexto})`,
      tipo: 'agrupador',
      integrantes: [],
      tiempo_minutos: tiempoTotalTanda,
      hora_inicio: primerHijo?.hora_inicio,
      hora_fin: ultimoHijo?.hora_fin,
      hijos: itemsDeLaTanda,
    });
  });

  return reporteCompleto;
}


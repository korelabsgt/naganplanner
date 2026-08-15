'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { ConfigProgramaForm, ConfigProgramaServicio, ReporteItem, AjustesGlobales, AjustesGlobalesForm } from './zod';

// =========================================================================
// HELPERS
// =========================================================================

/** Formatea minutos a hora legible: "10:00 AM" sumando al inicio dado */
function calcularHoras(horaInicio: Date, minutosOffset: number): { inicio: string; fin: string } {
  const inicio = new Date(horaInicio.getTime() + minutosOffset * 60000);
  const fin = new Date(inicio.getTime());
  const fmt = (d: Date) =>
    d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true })
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
// LECTURA DE CONFIGURACIÓN
// =========================================================================

export async function obtenerConfigPrograma(): Promise<ConfigProgramaServicio[] | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('act_config_programa_servicio')
    .select('*')
    .order('orden', { ascending: true });

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
  
  // Si no existe, podemos devolver un objeto por defecto
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

  // Verificamos si ya existe la fila
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
// 2. CRUD (ESCRITURA) CONFIGURACIÓN
// =========================================================================

export async function guardarConfigPrograma(
  formData: ConfigProgramaForm,
  id?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autorizado' };

  const payload = {
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

  // ON DELETE CASCADE en la BD maneja los hijos automáticamente
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
// GENERACIÓN DEL REPORTE
// =========================================================================

export async function generarReporteServicio(
  fechaHora: string
): Promise<ReporteItem[] | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 0. Obtener ajustes globales para el retraso de inicio
  const ajustes = await obtenerAjustesGlobales();
  const retrasoMinutos = ajustes?.minutos_preparacion_previa ?? 0;

  // 1. Obtener la plantilla de configuración
  const { data: configRaw } = await supabase
    .from('act_config_programa_servicio')
    .select('*')
    .order('orden', { ascending: true });

  if (!configRaw || configRaw.length === 0) return [];

  const plantilla = construirArbol(configRaw);

  // 2. Buscar actividades que coincidan con la fecha/hora dada
  const { data: actividades } = await supabase
    .from('act_actividades')
    .select(`
      id,
      title,
      modulo,
      due_date,
      act_integrantes (
        usuario_id,
        rol,
        es_encargado,
        "invitación"
      )
    `)
    .eq('due_date', fechaHora);

  const actividadesData = actividades ?? [];

  const { data: rawProfiles } = await supabase.from('profiles').select('id, nombre, avatar_url');
  const profilesMap = new Map((rawProfiles || []).map(p => [p.id, p]));

  // 3. Extraer todos los integrantes con sus roles de las actividades
  const integrantesPorRol = new Map<string, { nombre: string; avatar_url?: string | null; rol?: string | null }[]>();
  const integrantesPorModulo = new Map<string, { nombre: string; avatar_url?: string | null; rol?: string | null }[]>();

  for (const act of actividadesData) {
    const integrantes = (act.act_integrantes ?? []) as any[];
    for (const i of integrantes) {
      if (i.invitación !== true) continue;

      const perfil = profilesMap.get(i.usuario_id);
      const persona = {
        nombre: perfil?.nombre ?? 'Sin nombre',
        avatar_url: perfil?.avatar_url ?? null,
        rol: i.rol ?? null,
      };

      // Indexar por rol
      if (i.rol) {
        const rolKey = i.rol.toLowerCase().trim();
        if (!integrantesPorRol.has(rolKey)) integrantesPorRol.set(rolKey, []);
        integrantesPorRol.get(rolKey)!.push(persona);
      }

      // Indexar por módulo de la actividad
      if (act.modulo) {
        const moduloKey = act.modulo.toLowerCase().trim();
        if (!integrantesPorModulo.has(moduloKey)) integrantesPorModulo.set(moduloKey, []);
        integrantesPorModulo.get(moduloKey)!.push(persona);
      }
    }
  }

  // 4. Construir el reporte cruzando plantilla con integrantes
  // horaBase = fechaHora de la actividad + los minutos de preparación previos
  const horaBase = new Date(new Date(fechaHora).getTime() + retrasoMinutos * 60000);
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

  return plantilla.map((item, idx) => mapearItem(item, String(idx + 1)));
}

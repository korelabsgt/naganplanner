'use server';

import { createClient } from '@/utils/supabase/server';
import { AlabanzaStat, HistorialUso, MesUso, AlabanzaConNivel, DetalleStat, NivelFrecuencia } from './zod';

// =========================================================================
// HELPERS
// =========================================================================

const MESES_ABREV = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function calcularNivel(vecesCantada: number): NivelFrecuencia {
  if (vecesCantada === 0) return 'nunca';
  if (vecesCantada <= 2) return 'poco';
  if (vecesCantada <= 6) return 'regular';
  return 'frecuente';
}

/** Genera el array de los últimos N meses con sus labels */
function generarUltimosMeses(n: number): { key: string; label: string }[] {
  const resultado = [];
  const ahora = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = MESES_ABREV[d.getMonth()];
    resultado.push({ key, label });
  }
  return resultado;
}

/** Genera el array de las últimas N semanas con sus fechas de inicio y fin */
function generarUltimasSemanas(n: number): { key: string; label: string; rango: string; start: Date; end: Date }[] {
  const resultado = [];
  const ahora = new Date();
  const day = ahora.getDay() || 7; // Lunes=1, Domingo=7
  ahora.setHours(0, 0, 0, 0);
  
  const startOfCurrentWeek = new Date(ahora);
  startOfCurrentWeek.setDate(ahora.getDate() - day + 1);

  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(startOfCurrentWeek);
    start.setDate(start.getDate() - (i * 7));
    
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const key = start.toISOString().split('T')[0]; // Ej: 2024-08-12
    const rango = `Lun ${start.getDate()} ${MESES_ABREV[start.getMonth()].toLowerCase()} - Dom ${end.getDate()} ${MESES_ABREV[end.getMonth()].toLowerCase()}`;
    const label = `Sem ${n - i}`;
    
    resultado.push({ key, label, rango, start, end });
  }
  return resultado;
}

// =========================================================================
// OBTENER ESTADÍSTICAS GENERALES
// =========================================================================

export async function obtenerEstadisticasAlabanzas(): Promise<AlabanzaConNivel[] | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Traer todo el banco de alabanzas
  const { data: banco, error: errorBanco } = await supabase
    .from('act_banco_alabanzas')
    .select('id, nombre, tipo, tonalidad, bpm')
    .order('nombre', { ascending: true });

  if (errorBanco || !banco) return null;

  // 2. Traer todos los usos con fecha de la actividad
  const { data: usos, error: errorUsos } = await supabase
    .from('act_actividades_alabanzas')
    .select(`
      alabanza_id,
      actividad_id,
      act_actividades!inner (
        due_date
      )
    `);

  if (errorUsos) return null;

  const usosData = (usos ?? []) as any[];

  // 3. Agrupar usos por alabanza_id (sin contar duplicados del mismo día)
  const usosPorAlabanza = new Map<string, { fechas: Set<string> }>();
  for (const uso of usosData) {
    const rawFecha: string = uso.act_actividades?.due_date ?? '';
    const fechaDate = rawFecha ? rawFecha.split('T')[0] : '';
    
    if (!usosPorAlabanza.has(uso.alabanza_id)) {
      usosPorAlabanza.set(uso.alabanza_id, { fechas: new Set() });
    }
    if (fechaDate) usosPorAlabanza.get(uso.alabanza_id)!.fechas.add(fechaDate);
  }

  // 4. Generar los últimos 6 meses y semanas
  const ultimosMeses = generarUltimosMeses(6);
  const ultimasSemanas = generarUltimasSemanas(6);

  // 5. Construir el resultado cruzado
  return banco.map((alabanza) => {
    const info = usosPorAlabanza.get(alabanza.id);
    const fechas = Array.from(info?.fechas ?? []);
    const veces_cantada = fechas.length;

    // Última vez cantada (fecha más reciente)
    const ultima_vez = fechas.length > 0
      ? fechas.sort().reverse()[0]
      : null;

    // Mini-heatmap: cuántas veces por mes en los últimos 6 meses
    const meses: MesUso[] = ultimosMeses.map(({ key, label }) => ({
      mes: key,
      label,
      cantidad: fechas.filter(f => f.startsWith(key)).length,
    }));

    // Mini-heatmap: cuántas veces por semana en las últimas 6 semanas
    const semanas: MesUso[] = ultimasSemanas.map(({ key, label, start, end }) => {
      const cantidad = fechas.filter(f => {
        const d = new Date(f);
        return d >= start && d <= end;
      }).length;
      return { mes: key, label, cantidad };
    });

    const stat: AlabanzaStat = {
      id: alabanza.id,
      nombre: alabanza.nombre,
      tipo: alabanza.tipo,
      tonalidad: alabanza.tonalidad,
      bpm: alabanza.bpm,
      veces_cantada,
      ultima_vez,
    };

    return {
      ...stat,
      nivel: calcularNivel(veces_cantada),
      meses,
      semanas,
    };
  });
}

// =========================================================================
// OBTENER DETALLE DE UNA ALABANZA
// =========================================================================

export async function obtenerDetalleStat(id: string): Promise<DetalleStat | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 1. Datos de la alabanza
  const { data: alabanza, error } = await supabase
    .from('act_banco_alabanzas')
    .select('id, nombre, tipo, tonalidad, bpm')
    .eq('id', id)
    .single();

  if (error || !alabanza) return null;

  // 2. Historial de usos con director y fecha
  const { data: usos, error: errorUsos } = await supabase
    .from('act_actividades_alabanzas')
    .select(`
      actividad_id,
      id_director,
      act_actividades!inner (
        due_date
      )
    `)
    .eq('alabanza_id', id);

  if (errorUsos) return null;
  const usosDataRaw = (usos ?? []) as any[];

  // 2.5 Deduplicar historial para que clones en el mismo día cuenten como 1 uso
  const vistos = new Set<string>();
  const usosData = usosDataRaw.filter(uso => {
    const rawFecha: string = uso.act_actividades?.due_date ?? '';
    const date = rawFecha ? rawFecha.split('T')[0] : '';
    if (!date || vistos.has(date)) return false;
    vistos.add(date);
    return true;
  });

  // 3. Obtener nombres de directores
  const directorIds = [...new Set(usosData.map(u => u.id_director).filter(Boolean))];
  let perfilesMap = new Map<string, string>();

  if (directorIds.length > 0) {
    const { data: perfiles } = await supabase
      .from('profiles')
      .select('id, nombre')
      .in('id', directorIds);
    perfilesMap = new Map((perfiles ?? []).map(p => [p.id, p.nombre]));
  }

  // 4. Construir historial ordenado por fecha descendente
  const historial: HistorialUso[] = usosData
    .map(uso => {
      const fechaIso: string = uso.act_actividades?.due_date ?? '';
      const fecha = new Date(fechaIso);
      return {
        fecha: fechaIso,
        fecha_label: fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
        actividad_id: uso.actividad_id,
        director_id: uso.id_director ?? null,
        director_nombre: uso.id_director ? (perfilesMap.get(uso.id_director) ?? 'Desconocido') : null,
      };
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  // 5. Meses para la gráfica de barras (últimos 12 meses)
  const ultimosMeses = generarUltimosMeses(12);
  const fechas = usosData.map(u => u.act_actividades?.due_date ?? '').filter(Boolean);

  const ultimasSemanas = generarUltimasSemanas(12);

  const meses: MesUso[] = ultimosMeses.map(({ key, label }) => ({
    mes: key,
    label,
    cantidad: fechas.filter((f: string) => f.startsWith(key)).length,
  }));

  const semanas: MesUso[] = ultimasSemanas.map(({ key, label, rango, start, end }) => {
    const cantidad = fechas.filter((f: string) => {
      const d = new Date(f);
      return d >= start && d <= end;
    }).length;
    return { mes: key, label, rango, cantidad };
  });

  const stat: AlabanzaStat = {
    id: alabanza.id,
    nombre: alabanza.nombre,
    tipo: alabanza.tipo,
    tonalidad: alabanza.tonalidad,
    bpm: alabanza.bpm,
    veces_cantada: historial.length,
    ultima_vez: historial[0]?.fecha ?? null,
  };

  return { alabanza: stat, historial, meses, semanas };
}

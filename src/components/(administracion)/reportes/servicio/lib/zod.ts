import { z } from "zod";

// =========================================================================
// SCHEMAS DE BASE DE DATOS (LECTURA)
// =========================================================================

// Schema base de un ítem de configuración (sin hijos para evitar recursión en z.lazy)
const configProgramaBaseSchema = z.object({
  id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  orden: z.number(),
  tipo_elemento: z.enum(['agrupador', 'rol', 'dependencia']),
  nombre_mostrar: z.string(),
  tiempo_minutos: z.number().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Schema completo con hijos (árbol jerárquico)
export const configProgramaServicioSchema: z.ZodType<ConfigProgramaServicio> = z.lazy(() =>
  configProgramaBaseSchema.extend({
    hijos: z.array(configProgramaServicioSchema).optional(),
  })
);

// =========================================================================
// SCHEMAS DE FORMULARIO (ESCRITURA)
// =========================================================================

export const configProgramaFormSchema = z.object({
  parent_id: z.string().uuid().nullable().optional(),
  orden: z.number().int().min(1, "El orden debe ser mayor a 0"),
  tipo_elemento: z.enum(['agrupador', 'rol', 'dependencia']),
  nombre_mostrar: z.string().min(1, "El nombre es requerido"),
  tiempo_minutos: z.number().int().min(0).nullable().optional(),
});

// =========================================================================
// SCHEMA DEL REPORTE GENERADO
// =========================================================================

const integranteReporteSchema = z.object({
  nombre: z.string(),
  avatar_url: z.string().nullable().optional(),
  rol: z.string().nullable().optional(),
});

export const reporteItemSchema: z.ZodType<ReporteItem> = z.lazy(() =>
  z.object({
    numero: z.string(),          // "1", "2", "3.1", "3.2", etc.
    nombre: z.string(),
    tipo: z.enum(['agrupador', 'rol', 'dependencia']),
    integrantes: z.array(integranteReporteSchema),
    tiempo_minutos: z.number(),  // Para agrupadores: suma de hijos. Para otros: propio.
    hora_inicio: z.string().optional(),
    hora_fin: z.string().optional(),
    hijos: z.array(reporteItemSchema).optional(),
  })
);

// =========================================================================
// TIPOS EXPORTADOS
// =========================================================================

export interface ConfigProgramaServicio {
  id: string;
  parent_id?: string | null;
  orden: number;
  tipo_elemento: 'agrupador' | 'rol' | 'dependencia';
  referencia_busqueda?: string | null;
  nombre_mostrar: string;
  tiempo_minutos?: number | null;
  created_at: string;
  updated_at: string;
  hijos?: ConfigProgramaServicio[];
}

export interface IntegranteReporte {
  nombre: string;
  avatar_url?: string | null;
  rol?: string | null;
}

export interface ReporteItem {
  numero: string;
  nombre: string;
  tipo: 'agrupador' | 'rol' | 'dependencia';
  integrantes: IntegranteReporte[];
  tiempo_minutos: number;
  hora_inicio?: string;
  hora_fin?: string;
  hijos?: ReporteItem[];
}

export type ReporteServicio = {
  fecha: string; // ISO 8601 YYYY-MM-DD
  director: { nombre: string; id: string } | null;
  items: ReporteItem[];
};

// =========================================================================
// AJUSTES GLOBALES
// =========================================================================

export const ajustesGlobalesSchema = z.object({
  id: z.string().uuid(),
  nombre_iglesia: z.string(),
  minutos_preparacion_previa: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ajustesGlobalesFormSchema = z.object({
  nombre_iglesia: z.string().min(1, "El nombre de la iglesia es requerido"),
  minutos_preparacion_previa: z.number().int().min(0, "Los minutos no pueden ser negativos"),
});

export type AjustesGlobales = z.infer<typeof ajustesGlobalesSchema>;
export type AjustesGlobalesForm = z.infer<typeof ajustesGlobalesFormSchema>;

export type ConfigProgramaForm = z.infer<typeof configProgramaFormSchema>;

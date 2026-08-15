import { z } from "zod";

// =========================================================================
// TIPOS DEL BANCO DE ALABANZAS
// =========================================================================

export const alabanzaStatSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  tipo: z.string(),
  tonalidad: z.string().nullable().optional(),
  bpm: z.number().nullable().optional(),
  veces_cantada: z.number(),
  ultima_vez: z.string().nullable().optional(), // ISO date string
});

export const mesUsoSchema = z.object({
  mes: z.string(),   // "2025-01", "2025-02", etc.
  label: z.string(), // "Ene", "Feb", etc.
  rango: z.string().optional(),
  cantidad: z.number(),
});

export const historialUsoSchema = z.object({
  fecha: z.string(),          // ISO date string
  fecha_label: z.string(),    // "12 ago 2025"
  actividad_id: z.string(),
  director_id: z.string().nullable().optional(),
  director_nombre: z.string().nullable().optional(),
});

// =========================================================================
// TIPOS EXPORTADOS
// =========================================================================

export type AlabanzaStat = z.infer<typeof alabanzaStatSchema>;
export type MesUso = z.infer<typeof mesUsoSchema>;
export type HistorialUso = z.infer<typeof historialUsoSchema>;

export type NivelFrecuencia = 'frecuente' | 'regular' | 'poco' | 'nunca';

export interface AlabanzaConNivel extends AlabanzaStat {
  nivel: NivelFrecuencia;
  meses: MesUso[]; // últimos 6 meses para el mini-heatmap
  semanas: MesUso[]; // últimas 6 semanas para el mini-heatmap
}

export interface DetalleStat {
  alabanza: AlabanzaStat;
  historial: HistorialUso[];
  meses: MesUso[];
  semanas: MesUso[];
}

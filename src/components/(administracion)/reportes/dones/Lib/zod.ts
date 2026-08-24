import { z } from 'zod';

export const donReporteSchema = z.object({
  id: z.string(),
  actividad_id: z.string(),
  fecha: z.string().nullable(),
  nombre_persona: z.string(),
  palabras: z.string(),
  citas_biblicas: z.string().nullable().optional(),
  actividad_titulo: z.string().nullable(),
});

export type DonReporte = z.infer<typeof donReporteSchema>;

import { z } from "zod";

// --- Schema para items del Checklist ---
export const checklistItemSchema = z.object({
  title: z.string(),
  is_completed: z.boolean().default(false)
});

// --- Schema para Adjuntos (PDFs) ---
export const adjuntoSchema = z.object({
  nombre: z.string(),
  url: z.string(),
  tipo: z.string()
});

// --- Schema para Videos (YouTube) ---
export const videoSchema = z.object({
  id: z.string(), 
  nombre: z.string(),
  url: z.string()
});

// --- Schema para Archivos de Drive ---
export const driveSchema = z.object({
  id: z.string(), 
  nombre: z.string(),
  url: z.string()
});

// --- Schema para Dones Espirituales ---
export const donEspiritualSchema = z.object({
  id: z.string().uuid(),
  actividad_id: z.string().uuid(),
  nombre_persona: z.string(),
  palabras: z.string(),
  citas_biblicas: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional()
});

export type ChecklistItem = z.infer<typeof checklistItemSchema>;
export type Adjunto = z.infer<typeof adjuntoSchema>;
export type VideoAdjunto = z.infer<typeof videoSchema>;
export type ArchivoDrive = z.infer<typeof driveSchema>;
export type DonEspiritual = z.infer<typeof donEspiritualSchema>;

// 1. Schema para lectura de un Integrante
export const integranteSchema = z.object({
  id: z.string().uuid().optional(),
  actividad_id: z.string().uuid().optional(),
  usuario_id: z.string().uuid(),
  es_encargado: z.boolean().default(false),
  invitación: z.boolean().nullable().optional(),
  justificación: z.string().nullable().optional(),
  rol: z.string().nullable().optional(),
  perfil: z.object({
    nombre: z.string(),
    avatar_url: z.string().nullable().optional()
  }).optional(),
  ubicacion: z.any().optional().nullable()
});

// 2. Schema de Base de Datos (Lectura)
export const planificadorSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  due_date: z.string().nullable(), 
  
  // Aceptamos el enum O un string cualquiera (por seguridad con datos viejos)
  status: z.enum(['servicio', 'ensayo', 'servicio_especial', 'culto', 'especial']).or(z.string()).nullable().optional(),
  
  created_by: z.string().uuid().nullable(),
  
  checklist: z.array(checklistItemSchema).nullable().optional().default([]), 
  modulo: z.string().nullable().optional(),

  archivos_pdf: z.array(adjuntoSchema).nullable().optional().default([]),
  
  videos_url: z.array(videoSchema).nullable().optional().default([]),

  archivos_drive: z.array(driveSchema).nullable().optional().default([]),

  alabanzas: z.array(z.object({
    id: z.string().uuid(),
    nombre: z.string(),
    tipo: z.string(),
    tonalidad: z.string().nullable().optional()
  })).nullable().optional().default([]),
  
  dones_espirituales: z.array(donEspiritualSchema).nullable().optional().default([]),

  creator: z.object({
    nombre: z.string()
  }).optional(),
  integrantes: z.array(integranteSchema).default([]),
});

// 3. Schema auxiliar para formulario
export const integranteFormSchema = z.object({
  usuario_id: z.string().uuid(),
  es_encargado: z.boolean().default(false),
  rol: z.string().optional(),
  es_nuevo: z.boolean().optional(), 
});

// 4. Schema del Formulario (Escritura/Edición)
export const planificadorFormSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  due_date: z.string().refine((date) => date !== "", { message: "La fecha y hora son requeridas" }),
  
  // Eliminamos el objeto de opciones { required_error... } porque .default() ya maneja el caso vacío.
  status: z.string().min(1, "El tipo de servicio es requerido").default('servicio'),

  modulo: z.string().optional(),
  checklist: z.array(checklistItemSchema).optional().default([]),
  
  videos_url: z.array(videoSchema).optional().default([]),

  archivos_drive: z.array(driveSchema).optional().default([]),

  alabanzas: z.array(z.object({
    id: z.string().uuid(),
    nombre: z.string(),
    tipo: z.string(),
    tonalidad: z.string().nullable().optional()
  })).optional().default([]),

  integrantes: z.array(integranteFormSchema)
    .min(1, "Debes agregar al menos un integrante al planificador")
    .refine((items) => items.filter(i => i.es_encargado).length >= 1, {
      message: "Debe haber al menos un (1) encargado seleccionado"
    }),
});

export const perfilSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  email: z.string().email().optional().nullable(),
  rol: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  activo: z.boolean().optional(),
  genero: z.string().optional().nullable(),
});

export type Perfil = z.infer<typeof perfilSchema>;
export type Integrante = z.infer<typeof integranteSchema>;
export type Planificador = z.infer<typeof planificadorSchema>;
export type PlanificadorForm = z.infer<typeof planificadorFormSchema>;

// ==========================================
// NUEVO: Schema para Plantillas de Equipo
// ==========================================
export const equipoPlantillaSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  miembros_count: z.number(),
  created_by: z.string().uuid()
});

export type EquipoPlantilla = z.infer<typeof equipoPlantillaSchema>;
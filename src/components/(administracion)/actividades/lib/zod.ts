import { z } from "zod";

// --- Sub-schemas ---

export const checklistItemSchema = z.object({
  title: z.string().min(1, "El item no puede estar vacío"),
  is_completed: z.boolean().default(false),
});

// --- Schema de Base de Datos (Lectura) ---
export const perfilSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  email: z.string().email().optional().nullable(),
  rol: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  activo: z.boolean().optional(),
});

export const actividadSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  due_date: z.string().nullable(), 
  
  // ELIMINADO "En Proceso" - Solo quedan 3 estados
  status: z.enum(['Asignado', 'Completado', 'Vencido']).nullable().default('Asignado'),
  
  checklist: z.array(checklistItemSchema).nullable().optional(),
  
  assigned_to: z.string().uuid().nullable(),
  created_by: z.string().uuid().nullable(),

  group_id: z.string().uuid().nullable().optional(),

  assignee: z.object({
    nombre: z.string(),
    avatar_url: z.string().optional().nullable()
  }).optional(),
  
  creator: z.object({
    nombre: z.string()
  }).optional(),
});

// --- Schema del Formulario (Escritura/Edición) ---
export const actividadFormSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  due_date: z.string().refine((date) => date !== "", { message: "La fecha es requerida" }),
  assigned_to: z.string().uuid({ message: "Debes asignar un responsable" }),
  group_id: z.string().uuid().nullable().optional(),
  checklist: z.array(checklistItemSchema).optional(),
});

export type Actividad = z.infer<typeof actividadSchema>;
export type ActividadForm = z.infer<typeof actividadFormSchema>;
export type Perfil = z.infer<typeof perfilSchema>;
export type ChecklistItem = z.infer<typeof checklistItemSchema>;
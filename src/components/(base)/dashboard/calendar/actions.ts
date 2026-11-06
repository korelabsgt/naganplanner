"use server";

import { createClient } from "@/utils/supabase/server";
import { CalendarEvent } from "./DashboardCalendar";
import { getEffectiveRole } from "@/lib/auth-role";

export async function obtenerActividadesCalendario(): Promise<{
  events: CalendarEvent[];
  canViewAll: boolean;
  userRole: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { events: [], canViewAll: false, userRole: "user" };
    }

    // 1. Obtener rol efectivo (soporta simulación de rol si el usuario es SUPER)
    const { effectiveRole } = await getEffectiveRole(supabase, user);
    const userRole = effectiveRole;

    // Roles con permiso de ver todas las actividades (admin, super)
    const canViewAll = ["admin", "super"].includes(userRole);

    // 2. Traer actividades registradas con fecha de vencimiento/programación
    const { data: rawActividades, error } = await supabase
      .from("act_actividades")
      .select(`
        id,
        title,
        description,
        due_date,
        status,
        modulo,
        created_by,
        assigned_to,
        act_integrantes (
          id,
          usuario_id,
          es_encargado,
          rol
        )
      `)
      .not("due_date", "is", null)
      .order("due_date", { ascending: true });

    if (error || !rawActividades) {
      console.error("Error al obtener actividades del calendario:", error);
      return { events: [], canViewAll, userRole };
    }

    // 3. Mapear cada registro al formato CalendarEvent
    const allEvents: CalendarEvent[] = rawActividades.map((act: any) => {
      const esAsignado = act.assigned_to === user.id;
      const esCreador = act.created_by === user.id;
      const miIntegrante = Array.isArray(act.act_integrantes)
        ? act.act_integrantes.find((i: any) => i.usuario_id === user.id)
        : null;
      const esIntegrante = !!miIntegrante;

      const isMine = esAsignado || esCreador || esIntegrante;

      // Determinar si el usuario tiene un cargo/rol asignado en esta actividad
      let cargo: string | undefined = undefined;
      if (miIntegrante) {
        if (miIntegrante.rol && String(miIntegrante.rol).trim()) {
          cargo = String(miIntegrante.rol).trim();
        } else if (miIntegrante.es_encargado) {
          cargo = "Encargado";
        }
      }

      // Extraer año, mes, día y hora siempre en la zona horaria oficial (America/Guatemala UTC-6)
      // para evitar desfases de horario entre servidor local y servidores en la nube (ej. Vercel en UTC)
      const d = new Date(act.due_date);
      let dateStr = "";
      let timeStr: string | undefined = undefined;

      if (typeof act.due_date === "string" && !act.due_date.includes("T")) {
        dateStr = act.due_date.slice(0, 10);
      } else {
        dateStr = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Guatemala",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d);

        timeStr = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/Guatemala",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(d);
      }

      // Nombre de categoría visible en el badge (priorizar el tipo real: Servicio, Ensayo, etc.)
      const s = (act.status || "").toLowerCase().trim();
      let categoryName = "ACTIVIDAD";
      if (s === "servicio" || s === "culto") {
        categoryName = "SERVICIO";
      } else if (s === "ensayo") {
        categoryName = "ENSAYO";
      } else if (s === "servicio_especial" || s === "especial") {
        categoryName = "SERVICIO ESPECIAL";
      } else if (s === "reunion") {
        categoryName = "REUNIÓN";
      } else if (s) {
        categoryName = s.toUpperCase();
      } else if (act.modulo) {
        categoryName = String(act.modulo).toUpperCase();
      }

      // Tipo de evento
      const isServicio = [
        "servicio",
        "culto",
        "ensayo",
        "servicio_especial",
        "especial",
      ].includes(s);

      const type: "actividad" | "servicio" | "reunion" | "otro" = isServicio
        ? "servicio"
        : s === "reunion" || act.modulo === "reunion"
        ? "reunion"
        : "actividad";

      // Subtítulo limpio: descripción o nombre del ministerio
      let displaySubtitle: string | undefined = act.description?.trim();
      if (!displaySubtitle && act.modulo) {
        const mod = String(act.modulo).toLowerCase().trim();
        if (mod === "alabanza") displaySubtitle = "Alabanza";
        else if (mod === "danza-damas") displaySubtitle = "Danza Damas";
        else if (mod === "danza-caballeros") displaySubtitle = "Danza Caballeros";
        else if (mod === "multimedia") displaySubtitle = "Multimedia";
      }

      return {
        id: act.id,
        title: act.title || "Sin título",
        subtitle: displaySubtitle,
        category: categoryName,
        date: dateStr,
        time: timeStr,
        type,
        modulo: act.modulo || undefined,
        isMine,
        cargo,
      };
    });

    // 4. Si NO es admin o super, se restringen los datos estrictamente a los propios
    const finalEvents = canViewAll
      ? allEvents
      : allEvents.filter((ev) => ev.isMine);

    return {
      events: finalEvents,
      canViewAll,
      userRole,
    };
  } catch (err) {
    console.error("Error inesperado en obtenerActividadesCalendario:", err);
    return { events: [], canViewAll: false, userRole: "user" };
  }
}

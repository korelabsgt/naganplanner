"use client";

import { Rol } from "./constants";
import { useUser } from "@/components/(base)/providers/UserProvider";
import { ModulesView } from "./views/ModulesView";
import { DashboardCalendar, CalendarEvent } from "./calendar/DashboardCalendar";

interface DashboardProps {
  isJefe?: boolean;
  calendarEvents?: CalendarEvent[];
  canViewAll?: boolean;
  userRole?: string;
}

export function Dashboard({
  isJefe = false,
  calendarEvents = [],
  canViewAll = false,
  userRole,
}: DashboardProps) {
  const user = useUser();

  // Rol del usuario: prefiere el detectado en servidor o fallback a user_metadata
  const rol = (userRole as Rol) ?? (user?.user_metadata?.rol as Rol) ?? null;

  return (
    <div className="w-full px-1 sm:px-6 lg:px-8 2xl:px-12 py-3 sm:py-8 relative pb-28">
      {/* Contenedor responsivo: Módulos a la izquierda (con sus 2 columnas) y Calendario a la derecha */}
      <div className="w-full flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 items-start">
        {/* Columna Izquierda (56% en PC): Módulos con sus dos columnas conservadas */}
        <div className="w-full lg:w-[56%] shrink-0">
          <ModulesView rol={rol} isJefe={isJefe} />
        </div>

        {/* Columna Derecha (44% en PC / Abajo en móvil): Calendario */}
        <div className="w-full lg:w-[44%] flex-1">
          <DashboardCalendar
            initialEvents={calendarEvents}
            canViewAll={canViewAll}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { Rol } from "./constants";
import { useUser } from "@/components/(base)/providers/UserProvider";

import { ModulesView } from "./views/ModulesView";

interface DashboardProps {
  isJefe?: boolean;
}

export function Dashboard({ isJefe = false }: DashboardProps) {
  const user = useUser();

  // Rol del usuario desde Supabase user_metadata (guardado en minúscula: 'admin', 'super', 'rrhh', 'user')
  const rol = (user?.user_metadata?.rol as Rol) ?? null;

  return (
    <div className="space-y-12 px-2 sm:px-6 max-w-7xl mx-auto py-6 sm:py-10 relative">
      <ModulesView rol={rol} isJefe={isJefe} />
    </div>
  );
}

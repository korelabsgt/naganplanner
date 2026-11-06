import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import GestorPlanificador from "@/components/(administracion)/planificador/GestorPlanificador";

// Solo ADMIN y SUPER pueden ver todas las actividades
const ROLES_PERMITIDOS = ['admin', 'super'];

export default async function PlanificadorAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const rol = user?.user_metadata?.rol as string | undefined;

  if (!user || !rol || !ROLES_PERMITIDOS.includes(rol)) {
    redirect('/kore');
  }

  return (
    <div className="w-full">
      <Suspense fallback={<div>Cargando...</div>}>
        <GestorPlanificador tipoVista="todas" modulo="todas" />
      </Suspense>
    </div>
  );
}
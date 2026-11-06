import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import GestorPlanificador from "@/components/(administracion)/planificador/GestorPlanificador";
import { getEffectiveRole } from "@/lib/auth-role";

export default async function PlanificadorGeneralPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/kore");
  }

  const { effectiveRole } = await getEffectiveRole(supabase, user);
  const esAdmin = effectiveRole === "admin" || effectiveRole === "super";

  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="p-10 text-center text-gray-500">
            Cargando comisiones...
          </div>
        }
      >
        <GestorPlanificador
          tipoVista={esAdmin ? "todas" : "mis_actividades"}
          modulo="todas"
        />
      </Suspense>
    </div>
  );
}

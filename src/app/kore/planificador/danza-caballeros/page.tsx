import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import GestorPlanificador from "@/components/(administracion)/planificador/GestorPlanificador";
import { getEffectiveRole } from "@/lib/auth-role";

export default async function PlanificadorPageDanzaCaballeros() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { effectiveRole } = await getEffectiveRole(supabase, user);
  const esSuper = effectiveRole === "super";

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
          tipoVista={esSuper ? "todas" : "mis_actividades"}
          modulo="danza-caballeros"
        />
      </Suspense>
    </div>
  );
}

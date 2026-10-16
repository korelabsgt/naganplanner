import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import GestorPlanificador from "@/components/(administracion)/planificador/GestorPlanificador";

export default async function ReunionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Detectar si el usuario tiene rol de administración para darle la vista completa (Opcional, pero recomendado)
  const rol = user?.user_metadata?.rol as string | undefined;
  const esAdmin = rol === 'admin' || rol === 'super' || rol === 'rrhh';
  
  // Por defecto, usamos 'mis_actividades'. Si quieres que los admin vean TODO sobre reuniones de una vez,
  // se podría usar tipoVista="todas". Pero según la lógica del resto de módulos, suelen ser orientados al usuario.
  
  return (
    <div className="w-full">
      <Suspense fallback={<div className="p-10 text-center text-gray-500">Cargando servicios, reuniones y eventos...</div>}>
        <GestorPlanificador 
          tipoVista={esAdmin ? "todas" : "mis_actividades"} 
          modulo="reunion"
        />
      </Suspense>
    </div>
  );
}

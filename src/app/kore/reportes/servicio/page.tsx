import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import GestorServicio from "@/components/(administracion)/reportes/servicio/GestorServicio";

export default async function ReporteServicioPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Verificar sesión
  if (!user) {
    redirect('/kore');
  }

  return (
    <div className="w-full">
      <Suspense fallback={<div className="p-10 text-center text-gray-500">Cargando reporte de servicio...</div>}>
        <GestorServicio />
      </Suspense>
    </div>
  );
}

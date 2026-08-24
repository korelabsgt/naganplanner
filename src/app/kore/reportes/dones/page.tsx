import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import GestorDones from "@/components/(administracion)/reportes/dones/GestorDones";

export default async function ReporteDonesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/kore');
  }

  return (
    <div className="w-full">
      <Suspense fallback={<div className="p-10 text-center text-gray-500">Cargando reporte de dones...</div>}>
        <GestorDones />
      </Suspense>
    </div>
  );
}

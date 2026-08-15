import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ReportesIndex from "@/components/(administracion)/reportes/ReportesIndex";

export default async function ReportesIndexPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/kore');
  }

  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500">Cargando...</div>}>
      <ReportesIndex />
    </Suspense>
  );
}

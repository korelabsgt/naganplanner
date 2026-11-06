import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import GestorActividades from "@/components/(administracion)/actividades/GestorActividades";

export default async function DepartamentoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userRole = (user?.user_metadata?.rol as string | undefined)?.toLowerCase();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .single();
    if (profile?.rol) {
      userRole = profile.rol.toLowerCase().trim();
    }
  }

  const esAdmin = userRole === "admin" || userRole === "super";

  return (
    <div className="w-full">
      <Suspense
        fallback={
          <div className="p-10 text-center text-gray-500">
            Cargando actividades...
          </div>
        }
      >
        <GestorActividades tipoVista={esAdmin ? "todas" : "mis_actividades"} />
      </Suspense>
    </div>
  );
}

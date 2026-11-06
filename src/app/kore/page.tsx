import { createClient } from "@/utils/supabase/server";
import { Dashboard } from "@/components/(base)/dashboard";
import { obtenerActividadesCalendario } from "@/components/(base)/dashboard/calendar/actions";
import { getEffectiveRole } from "@/lib/auth-role";

async function getUserIsJefe(userId: string): Promise<boolean> {
  const supabase = await createClient();

  // Verifica si tiene un puesto de jefatura
  const { data: puestosJefatura } = await supabase
    .from("puesto")
    .select("id")
    .eq("usuario_id", userId)
    .eq("es_jefatura", true);

  const { effectiveRole } = await getEffectiveRole(supabase, { id: userId });
  const esJefeOperativo = Boolean(puestosJefatura && puestosJefatura.length > 0);
  const esSuperAdmin = ["admin", "super"].includes(effectiveRole);

  return esJefeOperativo || esSuperAdmin;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [isJefe, calendarData] = await Promise.all([
    user ? getUserIsJefe(user.id) : Promise.resolve(false),
    obtenerActividadesCalendario(),
  ]);

  return (
    <Dashboard
      isJefe={isJefe}
      calendarEvents={calendarData.events}
      canViewAll={calendarData.canViewAll}
      userRole={calendarData.userRole}
    />
  );
}

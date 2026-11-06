import { cookies } from "next/headers";
import { SupabaseClient } from "@supabase/supabase-js";

export const SIMULATED_ROLE_COOKIE = "nagan_simulated_role";

export async function getEffectiveRole(
  supabase: SupabaseClient,
  user: any
): Promise<{
  realRole: string;
  effectiveRole: string;
  isSimulated: boolean;
}> {
  if (!user) {
    return { realRole: "user", effectiveRole: "user", isSimulated: false };
  }

  // 1. Obtener el rol real desde profiles (prioridad) o user_metadata
  let realRole = (user?.user_metadata?.rol as string | undefined)?.toLowerCase().trim();

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (profile?.rol) {
      realRole = profile.rol.toLowerCase().trim();
    }
  } catch {
    // Si falla la consulta, mantenemos el fallback
  }

  realRole = realRole || "user";

  // 2. Seguridad estricta: Solo si el rol real es SUPER se permite simular
  if (realRole === "super") {
    try {
      const cookieStore = await cookies();
      const simulated = cookieStore.get(SIMULATED_ROLE_COOKIE)?.value?.toLowerCase().trim();
      if (simulated && ["super", "admin", "user"].includes(simulated)) {
        return {
          realRole,
          effectiveRole: simulated,
          isSimulated: simulated !== "super",
        };
      }
    } catch {
      // Entorno donde no se pueden leer cookies (ej. llamadas estáticas)
    }
  }

  return {
    realRole,
    effectiveRole: realRole,
    isSimulated: false,
  };
}

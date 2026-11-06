"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { SIMULATED_ROLE_COOKIE } from "./auth-role";

export async function setSimulatedRole(role: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "No autenticado" };
  }

  // Verificar que el usuario real sea SUPER
  let realRole = (user.user_metadata?.rol as string | undefined)?.toLowerCase().trim();
  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (profile?.rol) {
    realRole = profile.rol.toLowerCase().trim();
  }

  if (realRole !== "super") {
    return { success: false, error: "No autorizado para simular roles" };
  }

  const cookieStore = await cookies();
  const cleanRole = (role || "").toLowerCase().trim();

  if (cleanRole === "super" || cleanRole === "" || cleanRole === "real") {
    cookieStore.delete(SIMULATED_ROLE_COOKIE);
  } else if (["admin", "user"].includes(cleanRole)) {
    cookieStore.set(SIMULATED_ROLE_COOKIE, cleanRole, {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 días
      sameSite: "lax",
    });
  }

  return { success: true };
}

export async function getSimulatedRoleState() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { canSimulate: false, realRole: "user", effectiveRole: "user" };
    }

    let realRole = (user.user_metadata?.rol as string | undefined)?.toLowerCase().trim();
    const { data: profile } = await supabase
      .from("profiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (profile?.rol) {
      realRole = profile.rol.toLowerCase().trim();
    }

    realRole = realRole || "user";

    if (realRole !== "super") {
      return { canSimulate: false, realRole, effectiveRole: realRole };
    }

    const cookieStore = await cookies();
    const simulated = cookieStore.get(SIMULATED_ROLE_COOKIE)?.value?.toLowerCase().trim();
    const effectiveRole =
      simulated && ["admin", "user", "super"].includes(simulated)
        ? simulated
        : "super";

    return {
      canSimulate: true,
      realRole: "super",
      effectiveRole,
    };
  } catch {
    return { canSimulate: false, realRole: "user", effectiveRole: "user" };
  }
}
